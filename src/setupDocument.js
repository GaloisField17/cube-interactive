const ALWAYS_VISIBLE = "always-visible";
const HIDDEN_BEHIND_CUBE = "hidden-behind-cube";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function mergeImportedValues(defaults, imported) {
  if (!isPlainObject(imported)) {
    return imported === undefined ? defaults : imported;
  }

  const result = { ...defaults };

  for (const [key, value] of Object.entries(imported)) {
    result[key] = isPlainObject(value)
      ? mergeImportedValues(defaults?.[key] ?? {}, value)
      : value;
  }

  return result;
}

function validateKeys(value, allowedKeys, path) {
  if (!isPlainObject(value)) {
    throw new Error(`${path} must be an object.`);
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`${path}.${key} is not supported.`);
    }
  }
}

function validateFiniteNumber(value, path, minimum = -Infinity) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${path} must be a valid number.`);
  }
}

export function validateImportedDocument(document) {
  if (!isPlainObject(document)) {
    throw new Error("The imported value must be a JSON object.");
  }

  validateKeys(document, ["version", "exportedAt", "setup"], "document");

  if (document.version !== 1) {
    throw new Error(`Unsupported setup version: ${document.version}.`);
  }

  if (
    typeof document.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(document.exportedAt))
  ) {
    throw new Error("exportedAt must be a valid UTC timestamp.");
  }

  validateKeys(
    document.setup,
    ["cube", "view", "rotations", "colors", "labels"],
    "setup",
  );

  const {
    cube,
    view,
    rotations,
    colors: importedColors,
    labels,
  } = document.setup;

  if (view !== undefined) {
    validateKeys(view, ["cameraPosition", "target"], "setup.view");
    for (const key of ["cameraPosition", "target"]) {
      if (view[key] === undefined) {
        continue;
      }

      validateKeys(view[key], ["x", "y", "z"], `setup.view.${key}`);
      for (const axis of ["x", "y", "z"]) {
        if (view[key][axis] !== undefined) {
          validateFiniteNumber(view[key][axis], `setup.view.${key}.${axis}`);
        }
      }
    }
  }

  if (cube !== undefined) {
    validateKeys(cube, ["size", "gap", "cubies"], "setup.cube");
    if (cube.size !== undefined)
      validateFiniteNumber(cube.size, "cube.size", 0);
    if (cube.gap !== undefined) validateFiniteNumber(cube.gap, "cube.gap", 0);
    if (cube.cubies !== undefined) {
      validateKeys(cube.cubies, Object.keys(cube.cubies), "cube.cubies");
      for (const [id, cubie] of Object.entries(cube.cubies)) {
        validateKeys(
          cubie,
          ["position", "innerColor", "facelets"],
          `cube.cubies.${id}`,
        );
        if (cubie.position !== undefined) {
          validateKeys(
            cubie.position,
            ["x", "y", "z"],
            `cube.cubies.${id}.position`,
          );
          for (const axis of ["x", "y", "z"]) {
            if (cubie.position[axis] !== undefined) {
              validateFiniteNumber(
                cubie.position[axis],
                `cube.cubies.${id}.position.${axis}`,
              );
            }
          }
        }
        if (
          cubie.innerColor !== undefined &&
          typeof cubie.innerColor !== "string"
        ) {
          throw new Error(
            `cube.cubies.${id}.innerColor must be a color string.`,
          );
        }
        if (cubie.facelets !== undefined) {
          validateKeys(
            cubie.facelets,
            Object.keys(cubie.facelets),
            `cube.cubies.${id}.facelets`,
          );
          for (const [faceletId, facelet] of Object.entries(cubie.facelets)) {
            validateKeys(
              facelet,
              ["normal", "color"],
              `cube.cubies.${id}.facelets.${faceletId}`,
            );
            if (facelet.normal !== undefined) {
              validateKeys(
                facelet.normal,
                ["x", "y", "z"],
                `cube.cubies.${id}.facelets.${faceletId}.normal`,
              );
              for (const axis of ["x", "y", "z"]) {
                if (facelet.normal[axis] !== undefined) {
                  validateFiniteNumber(
                    facelet.normal[axis],
                    `cube.cubies.${id}.facelets.${faceletId}.normal.${axis}`,
                  );
                }
              }
            }
            if (
              facelet.color !== undefined &&
              typeof facelet.color !== "string"
            ) {
              throw new Error(
                `cube.cubies.${id}.facelets.${faceletId}.color must be a color string.`,
              );
            }
          }
        }
      }
    }
  }

  if (rotations !== undefined) {
    validateKeys(
      rotations,
      ["moves", "text", "durationSeconds"],
      "setup.rotations",
    );
    if (
      rotations.moves !== undefined &&
      (!Array.isArray(rotations.moves) ||
        rotations.moves.some((move) => typeof move !== "string"))
    ) {
      throw new Error("setup.rotations.moves must be an array of strings.");
    }
    if (rotations.text !== undefined && typeof rotations.text !== "string") {
      throw new Error("setup.rotations.text must be a string.");
    }
    if (rotations.durationSeconds !== undefined) {
      validateFiniteNumber(
        rotations.durationSeconds,
        "setup.rotations.durationSeconds",
        0,
      );
    }
  }

  if (importedColors !== undefined) {
    validateKeys(
      importedColors,
      ["faceletLabels", "axisLabels", "rotationArrows"],
      "setup.colors",
    );
    for (const key of ["faceletLabels", "axisLabels", "rotationArrows"]) {
      if (importedColors[key] !== undefined) {
        validateKeys(
          importedColors[key],
          Object.keys(importedColors[key]),
          `setup.colors.${key}`,
        );
        if (
          Object.values(importedColors[key]).some(
            (color) => typeof color !== "string",
          )
        ) {
          throw new Error(`setup.colors.${key} values must be color strings.`);
        }
      }
    }
  }

  if (labels !== undefined) {
    validateKeys(
      labels,
      [
        "facelets",
        "faceletVisibility",
        "axisLabels",
        "axisLabelVisibility",
        "axisLabelMode",
        "axisLabelDepth",
        "axisLabelsByFace",
        "axisArrows",
        "axisArrowVisibility",
        "axisDepth",
        "axisArrowsByFace",
        "rotationArrows",
        "rotationArrowVisibility",
        "rotationArrowDepth",
        "rotationArrowThickness",
        "rotationArrowRadius",
        "rotationArrowDirection",
        "rotationArrowsByFace",
        "labelDepth",
      ],
      "setup.labels",
    );
    for (const key of [
      "facelets",
      "axisLabels",
      "axisArrows",
      "rotationArrows",
    ]) {
      if (labels[key] !== undefined && typeof labels[key] !== "boolean") {
        throw new Error(`setup.labels.${key} must be boolean.`);
      }
    }
    for (const key of [
      "axisLabelDepth",
      "axisDepth",
      "rotationArrowDepth",
      "rotationArrowThickness",
      "rotationArrowRadius",
      "labelDepth",
    ]) {
      if (labels[key] !== undefined)
        validateFiniteNumber(labels[key], `setup.labels.${key}`, 0);
    }
    for (const key of [
      "faceletVisibility",
      "axisLabelVisibility",
      "axisArrowVisibility",
      "rotationArrowVisibility",
    ]) {
      if (
        labels[key] !== undefined &&
        ![ALWAYS_VISIBLE, HIDDEN_BEHIND_CUBE].includes(labels[key])
      ) {
        throw new Error(`setup.labels.${key} is invalid.`);
      }
    }
    if (
      labels.axisLabelMode !== undefined &&
      !["face", "coordinate", "custom"].includes(labels.axisLabelMode)
    ) {
      throw new Error("setup.labels.axisLabelMode is invalid.");
    }
    if (
      labels.rotationArrowDirection !== undefined &&
      !["clockwise", "counter-clockwise"].includes(
        labels.rotationArrowDirection,
      )
    ) {
      throw new Error("setup.labels.rotationArrowDirection is invalid.");
    }
    for (const [key, entry] of Object.entries(labels.axisLabelsByFace ?? {})) {
      validateKeys(
        entry,
        ["visible", "customText"],
        `setup.labels.axisLabelsByFace.${key}`,
      );
      if (
        typeof entry.visible !== "boolean" ||
        (entry.customText !== undefined && typeof entry.customText !== "string")
      ) {
        throw new Error(`setup.labels.axisLabelsByFace.${key} is invalid.`);
      }
    }
    for (const key of ["axisArrowsByFace", "rotationArrowsByFace"]) {
      for (const [face, entry] of Object.entries(labels[key] ?? {})) {
        validateKeys(entry, ["visible"], `setup.labels.${key}.${face}`);
        if (typeof entry.visible !== "boolean") {
          throw new Error(
            `setup.labels.${key}.${face}.visible must be boolean.`,
          );
        }
      }
    }
  }

  return document.setup;
}
