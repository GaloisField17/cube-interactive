function formatValue(value) {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      return value.join(" ") || "empty sequence";
    }
    if (
      value.length > 0 &&
      value.every((item) => JSON.stringify(item) === JSON.stringify(value[0]))
    ) {
      return formatValue(value[0]);
    }
    return value.length === 0 ? "none" : "mixed";
  }

  if (value && typeof value === "object") {
    if (
      Object.hasOwn(value, "cameraPosition") &&
      Object.hasOwn(value, "target")
    ) {
      return "camera pose";
    }

    const values = Object.values(value);

    if (values.length === 0) {
      return "none";
    }
    return values.every(
      (item) => JSON.stringify(item) === JSON.stringify(values[0]),
    )
      ? formatValue(values[0])
      : "mixed";
  }

  if (typeof value === "boolean") {
    return value ? "shown" : "hidden";
  }
  if (typeof value === "number") {
    return Number(value.toFixed(3)).toString();
  }

  const labels = {
    "always-visible": "shown through the cube",
    "hidden-behind-cube": "hidden behind the cube",
    clockwise: "clockwise",
    "counter-clockwise": "counter-clockwise",
    coordinate: "Cartesian coordinates",
    custom: "custom text",
    face: "face names",
  };

  return labels[value] ?? String(value);
}

function code(value) {
  return { code: String(value) };
}

function colorCode(value) {
  const color = getUniformColorValue(value);
  const formattedValue = formatValue(value);

  return {
    code: formattedValue === "mixed" ? "Mixed" : formattedValue,
    ...(color === null ? {} : { colorSwatch: color }),
  };
}

function getUniformColorValue(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return null;
  }

  const values = Object.values(value);

  if (values.length === 0) {
    return null;
  }

  const colors = values.map(getUniformColorValue);
  const firstColor = colors[0];

  return firstColor !== null && colors.every((color) => color === firstColor)
    ? firstColor
    : null;
}

function describe(parts) {
  return {
    description: parts
      .map((part) => (typeof part === "string" ? part : (part.code ?? "")))
      .join(""),
    descriptionParts: parts,
  };
}

function targetFromFocus(focus) {
  return focus.match(/\((.+)\)$/u)?.[1] ?? "";
}

function findChangedMove(from, to) {
  let fromIndex = 0;
  let toIndex = 0;

  while (fromIndex < from.length && toIndex < to.length) {
    if (from[fromIndex] === to[toIndex]) {
      fromIndex += 1;
      toIndex += 1;
    } else {
      return to[toIndex];
    }
  }

  return to[toIndex] ?? to.at(-1) ?? from.at(-1) ?? "rotation";
}

function cameraMetrics(state, defaultCameraView) {
  const { cameraPosition, target } = state;
  const dx = cameraPosition.x - target.x;
  const dy = cameraPosition.y - target.y;
  const dz = cameraPosition.z - target.z;
  const distance = Math.hypot(dx, dy, dz);
  const defaultDistance = Math.hypot(
    defaultCameraView.cameraPosition.x - defaultCameraView.target.x,
    defaultCameraView.cameraPosition.y - defaultCameraView.target.y,
    defaultCameraView.cameraPosition.z - defaultCameraView.target.z,
  );

  return {
    azimuth: Number(((Math.atan2(dx, dz) * 180) / Math.PI).toFixed(1)),
    elevation: Number(
      ((Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI).toFixed(1),
    ),
    zoomPercent: Number(((defaultDistance / distance) * 100).toFixed(1)),
  };
}

function cameraPanDelta(from, to) {
  const direction = {
    x: to.cameraPosition.x - to.target.x,
    y: to.cameraPosition.y - to.target.y,
    z: to.cameraPosition.z - to.target.z,
  };
  const length = Math.hypot(direction.x, direction.y, direction.z);
  const normalized = {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
  const right = {
    x: normalized.z,
    y: 0,
    z: -normalized.x,
  };
  const rightLength = Math.hypot(right.x, right.y, right.z);
  right.x /= rightLength;
  right.z /= rightLength;
  const up = {
    x: normalized.y * right.z,
    y: normalized.z * right.x - normalized.x * right.z,
    z: -normalized.y * right.x,
  };
  const delta = {
    x: from.target.x - to.target.x,
    y: from.target.y - to.target.y,
    z: from.target.z - to.target.z,
  };

  return {
    horizontal: Number(
      (delta.x * right.x + delta.y * right.y + delta.z * right.z).toFixed(1),
    ),
    vertical: Number(
      (delta.x * up.x + delta.y * up.y + delta.z * up.z).toFixed(1),
    ),
  };
}

function describeCamera(activity, reverting, defaultCameraView) {
  const pose = reverting ? activity.from : activity.to;
  const metrics = cameraMetrics(pose, defaultCameraView);

  if (activity.focus === "Orbit") {
    return describe([
      reverting
        ? "Camera was orbited back to azimuth "
        : "Camera was orbited to azimuth ",
      code(`${metrics.azimuth}°`),
      " and elevation ",
      code(`${metrics.elevation}°`),
      ".",
    ]);
  }
  if (activity.focus === "Zoom") {
    return describe([
      reverting
        ? "Camera zoom was changed back to "
        : "Camera zoom was changed to ",
      code(`${metrics.zoomPercent}%`),
      ".",
    ]);
  }

  const pan = reverting
    ? cameraPanDelta(activity.to, activity.from)
    : cameraPanDelta(activity.from, activity.to);

  return describe([
    reverting ? "Camera was panned back " : "Camera was panned ",
    code(`${pan.horizontal}`),
    " horizontally and ",
    code(`${pan.vertical}`),
    " vertically.",
  ]);
}

function describeRotation(activity, reverting) {
  const before = reverting ? activity.to : activity.from;
  const after = reverting ? activity.from : activity.to;
  const connector = reverting ? " back to " : " to ";
  const sequence = after.join(" ") || "empty sequence";
  const sequencePart = code(sequence);

  if (activity.focus === "Insert" && !reverting) {
    return describe([
      code(findChangedMove(before, after)),
      " was inserted. The rotation sequence is now ",
      sequencePart,
      ".",
    ]);
  }
  if (activity.focus === "Remove" && !reverting) {
    return describe([
      code(findChangedMove(after, before)),
      " was removed. The rotation sequence is now ",
      sequencePart,
      ".",
    ]);
  }
  if (reverting) {
    return describe([
      "Rotation sequence was changed from ",
      code(before.join(" ") || "empty sequence"),
      connector,
      sequencePart,
      ".",
    ]);
  }

  return describe([
    "After the edit, the rotation sequence is now ",
    sequencePart,
    ".",
  ]);
}

function describeValueChange(activity, reverting) {
  const from = reverting ? activity.to : activity.from;
  const to = reverting ? activity.from : activity.to;
  const connector = reverting ? " back to " : " to ";
  const value = (item) => code(formatValue(item));
  const focus = activity.focus;
  const target = targetFromFocus(focus);
  let prefix;

  if (
    activity.parent === "Export / Import" &&
    focus === "Automatically export on exit"
  ) {
    const enabled = (item) => code(item ? "enabled" : "disabled");

    return describe([
      "Automatically export on exit setting was changed from ",
      enabled(from),
      connector,
      enabled(to),
      ".",
    ]);
  }

  if (activity.parent === "Rotation" && focus === "Duration") {
    prefix = "Duration was changed";
    return describe([
      prefix,
      " from ",
      code(`${formatValue(from)}s`),
      reverting ? " back to " : " to ",
      code(`${formatValue(to)}s`),
      ".",
    ]);
  }
  if (activity.parent === "Cube") {
    if (focus === "Size (Global)") {
      prefix = "Size of all cubies was changed globally";
    } else if (focus === "Gap (Global)") {
      prefix = "Gap between all cubies was changed globally";
    } else if (focus.startsWith("Size")) {
      prefix = `Size of ${target} was changed`;
    } else {
      prefix = `Gap of ${target} was changed`;
    }
    return describe([prefix, " from ", value(from), connector, value(to), "."]);
  }
  if (activity.parent === "View") {
    const names = {
      "Transparent Stickers": "Transparent stickers setting",
      "Peek Sticker Depth": "Peek sticker depth",
      "Peek Hide Color": "Peek hide color",
    };
    prefix = names[focus];
    if (focus === "Transparent Stickers") {
      const visibility = (value) =>
        code(value === "always-visible" ? "disabled" : "enabled");

      return describe([
        "Transparent stickers setting was changed from ",
        visibility(from),
        connector,
        visibility(to),
        ".",
      ]);
    }
    if (focus === "Peek Stickers") {
      const visibility = (value) =>
        code(value === "always-visible" ? "disabled" : "enabled");

      return describe([
        "Peek stickers setting was changed from ",
        visibility(from),
        connector,
        visibility(to),
        ".",
      ]);
    }
    if (focus === "Peek Hide Color") {
      const colorValue = (item) => (item ? colorCode(item) : code("none"));

      return describe([
        prefix,
        " was changed from ",
        colorValue(from),
        connector,
        colorValue(to),
        ".",
      ]);
    }
    return describe([
      prefix,
      " was changed from ",
      value(from),
      connector,
      value(to),
      ".",
    ]);
  }
  if (activity.parent === "Colors") {
    const isGrouped =
      to !== null &&
      typeof to === "object" &&
      !Array.isArray(to) &&
      Object.keys(to).length > 1;

    if (focus.startsWith("Outer Facelet")) {
      prefix =
        focus === "Outer Facelet (All)"
          ? "Color of all outer facelets"
          : `Color of ${target} ${isGrouped ? "face" : "facelet"}`;
    } else if (focus.startsWith("Inner Cubie")) {
      prefix =
        focus === "Inner Cubie (All)"
          ? "Inner color of all cubies"
          : `Inner color of cubie ${target}`;
    } else if (focus.startsWith("Facelet Label")) {
      prefix =
        focus === "Facelet Label (All)"
          ? "Color of all facelet labels"
          : isGrouped
            ? `Label color on face ${target}`
            : `Label color of facelet ${target}`;
    } else if (focus.startsWith("Axis Label")) {
      prefix =
        focus === "Axis Label (All)"
          ? "Color of all axis labels"
          : `Color of the ${target} axis label`;
    } else {
      prefix =
        focus === "Rotation Arrow (All)"
          ? "Color of all rotation arrows"
          : `Color of the ${target} rotation arrow`;
    }
    return describe([
      prefix,
      " was changed from ",
      colorCode(from),
      connector,
      colorCode(to),
      ".",
    ]);
  }
  if (activity.parent === "Labels") {
    const featureToggles = {
      "Facelet Labels": "Facelet labels",
      "Axis Labels": "Axis labels",
      "Axis Arrows": "Axis arrows",
      "Rotation Arrows": "Rotation arrows",
    };

    if (featureToggles[focus]) {
      const state = (item) => (item ? "enabled" : "disabled");

      return describe([
        featureToggles[focus],
        " were changed from ",
        code(state(from)),
        connector,
        code(state(to)),
        ".",
      ]);
    }

    if (/^Axis Label Text \(.+\)$/u.test(focus)) {
      return describe([
        "Text of the ",
        code(target),
        " axis label was changed from ",
        value(from),
        connector,
        value(to),
        ".",
      ]);
    }

    if (focus.endsWith(" Visibility")) {
      const focusTarget = focus.match(
        /^(Axis Label|Axis Arrow|Rotation Arrow) \((.+)\) Visibility$/u,
      );
      const nameByFocus = {
        "Facelet Label Visibility": "Facelet label visibility",
        "Axis Label Visibility": "Axis label visibility",
        "Axis Arrow Visibility": "Axis arrow visibility",
        "Rotation Arrow Visibility": "Rotation arrow visibility",
      };
      const subject = focusTarget
        ? `Visibility of the ${focusTarget[2]} ${focusTarget[1].replace("Axis Label", "axis label").replace("Axis Arrow", "axis arrow").replace("Rotation Arrow", "rotation arrow")}`
        : nameByFocus[focus];

      return describe([
        subject,
        " was changed from ",
        value(from),
        connector,
        value(to),
        ".",
      ]);
    }

    const names = {
      "Facelet Label Depth": "Facelet label depth",
      "Axis Label Format": "Axis label format",
      "Axis Label Depth": "Axis label depth",
      "Axis Arrow Depth": "Axis arrow depth",
      "Rotation Arrow Depth": "Rotation arrow depth",
      "Rotation Arrow Thickness": "Rotation arrow thickness",
      "Rotation Arrow Radius": "Rotation arrow radius",
      "Rotation Arrow Direction": "Rotation arrow direction",
    };
    prefix = names[focus];
    return describe([
      prefix,
      " was changed from ",
      value(from),
      connector,
      value(to),
      ".",
    ]);
  }

  throw new Error(
    `No activity description template for ${activity.parent}: ${focus}.`,
  );
}

export function createActivityDescription(
  activity,
  { reverting = false, defaultCameraView },
) {
  if (activity.parent === "Camera") {
    return describeCamera(activity, reverting, defaultCameraView);
  }
  if (activity.parent === "Jump") {
    return describe(["Restored the setup from before the selected Jump."]);
  }
  if (activity.parent === "Rotation" && activity.focus !== "Duration") {
    return describeRotation(activity, reverting);
  }
  return describeValueChange(activity, reverting);
}
