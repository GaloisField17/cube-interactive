import { createActivityCommitter } from "./activityRecorder.js";

const FACE_ORDER = ["F", "B", "R", "L", "U", "D"];
const ALWAYS_VISIBLE = "always-visible";
const HIDDEN_BEHIND_CUBE = "hidden-behind-cube";

function syncSliderFromEditValue(slider, valueInput, value) {
  const sliderMin = Number(slider.min);
  const sliderMax = Number(slider.max);
  const max = Math.max(100, sliderMax);
  const acceptedValue = Math.min(Math.max(value, Number.NEGATIVE_INFINITY), max);

  slider.value = String(Math.min(Math.max(acceptedValue, sliderMin), sliderMax));
  if (acceptedValue !== value) {
    valueInput.value = String(acceptedValue);
  }
  return acceptedValue;
}

function syncEditValueFromSlider(slider, valueInput) {
  valueInput.value = slider.value;
  return Number(valueInput.value);
}

export function createLabelsPanel({
  faceletLabelController,
  axisSceneController,
  axisDefinitions,
  defaultLabelDepth,
  defaultAxisDepth,
  defaultRotationArrowDepth,
  defaultRotationArrowThickness,
  defaultRotationArrowRadius,
  panelBackground,
  panelBorder,
  panelBorderRadius,
  panelBoxShadow,
  fontFamily,
  fontSize,
  createResetButton,
  styleUiTitle,
  onActivity = () => {},
  onExpand,
  onLayoutChange,
}) {
  let faceletLabelsVisibility = ALWAYS_VISIBLE;
  let axisLabelsVisibility = ALWAYS_VISIBLE;
  let axisArrowsVisibility = HIDDEN_BEHIND_CUBE;
  let rotationArrowsVisibility = ALWAYS_VISIBLE;
  let axisLabelDepth = defaultLabelDepth;
  let axisLabelMode = "face";
  let axisDepth = defaultAxisDepth;
  let rotationArrowDepth = defaultRotationArrowDepth;
  let rotationArrowThickness = defaultRotationArrowThickness;
  let rotationArrowRadius = defaultRotationArrowRadius;
  let rotationArrowDirection = "clockwise";
  const activityCommitters = [];

  function createActivityRecorder(focus, filterFocus, getValue) {
    const committer = createActivityCommitter(getValue, (from, to) =>
      onActivity({
        parent: "Labels",
        focus,
        filterFocus,
        from,
        to,
      }),
    );

    activityCommitters.push(committer);
    return committer;
  }

  function resetActivityBaselines() {
    activityCommitters.forEach((committer) => committer.reset());
  }

  const root = document.createElement("div");

  Object.assign(root.style, {
    position: "absolute",
    top: "20px",
    right: "20px",
    width: "280px",
    padding: "16px",
    background: panelBackground,
    border: panelBorder,
    borderRadius: panelBorderRadius,
    boxShadow: panelBoxShadow,
    fontFamily,
    fontSize,
    boxSizing: "border-box",
  });

  const header = document.createElement("div");

  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    cursor: "pointer",
    userSelect: "none",
    fontSize: "18px",
    fontWeight: "bold",
  });

  const titleRow = document.createElement("div");

  Object.assign(titleRow.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });

  const resetButton = createResetButton("Reset Labels", reset);
  const title = document.createElement("span");

  title.textContent = "Labels";
  titleRow.append(resetButton, title);

  const collapseIcon = document.createElement("span");

  collapseIcon.textContent = "+";
  collapseIcon.style.fontSize = "20px";
  collapseIcon.style.lineHeight = "1";
  header.append(titleRow, collapseIcon);
  header.setAttribute("role", "button");
  header.setAttribute("aria-expanded", "false");
  header.tabIndex = 0;

  const content = document.createElement("div");

  content.id = "labels-panel-content";
  content.style.display = "none";
  content.style.marginTop = "12px";
  header.setAttribute("aria-controls", content.id);
  root.append(header, content);

  let expanded = false;

  function setExpanded(nextExpanded) {
    if (expanded === nextExpanded) {
      return;
    }

    expanded = nextExpanded;
    if (expanded) {
      onExpand();
    }
    content.style.display = expanded ? "block" : "none";
    collapseIcon.textContent = expanded ? "−" : "+";
    header.setAttribute("aria-expanded", String(expanded));
    onLayoutChange();
  }

  function toggleExpanded() {
    setExpanded(!expanded);
  }

  header.addEventListener("click", toggleExpanded);
  header.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    toggleExpanded();
  });

  function createVisibilityControl(
    title,
    groupName,
    initialValue,
    onChange,
    activityCommitter,
  ) {
    const control = document.createElement("div");

    Object.assign(control.style, {
      display: "none",
      marginTop: "10px",
    });

    const titleElement = document.createElement("div");

    titleElement.textContent = title;
    Object.assign(titleElement.style, {
      fontSize: "14px",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "5px",
    });

    const options = document.createElement("div");

    Object.assign(options.style, {
      display: "flex",
      gap: "12px",
    });

    for (const [value, text] of [
      [ALWAYS_VISIBLE, "Through"],
      [HIDDEN_BEHIND_CUBE, "Occluded"],
    ]) {
      const label = document.createElement("label");

      Object.assign(label.style, {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        cursor: "pointer",
      });

      const radio = document.createElement("input");

      radio.type = "radio";
      radio.name = groupName;
      radio.value = value;
      radio.checked = value === initialValue;
      radio.addEventListener("change", () => {
        if (radio.checked) {
          onChange(value);
          activityCommitter?.commit();
        }
      });

      const textElement = document.createElement("span");

      textElement.textContent = text;
      label.append(radio, textElement);
      options.appendChild(label);
    }

    control.append(titleElement, options);
    control.setVisibilityMode = (value) => {
      for (const radio of options.querySelectorAll("input")) {
        radio.checked = radio.value === value;
      }
    };
    return control;
  }

  function createNumericControl({
    title,
    sliderLabel,
    valueLabel,
    min,
    max,
    step,
    initialValue,
    allowNegative = false,
    inputMinimum = Number.NEGATIVE_INFINITY,
    blurFallback,
    blurMinimum,
    onChange,
    activityCommitter,
  }) {
    const control = document.createElement("div");

    control.style.display = "none";
    control.style.marginTop = "10px";

    const heading = document.createElement("label");

    heading.textContent = title;
    heading.style.display = "block";
    heading.style.marginBottom = "5px";

    const slider = document.createElement("input");

    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(initialValue);
    slider.style.flex = "1";
    slider.style.minWidth = "0";
    slider.setAttribute("aria-label", sliderLabel);

    const value = document.createElement("input");

    value.type = "text";
    value.value = String(initialValue);
    value.style.width = "55px";
    value.style.boxSizing = "border-box";
    value.style.textAlign = "center";
    value.setAttribute("aria-label", valueLabel);

    const row = document.createElement("div");

    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });
    row.append(slider, value);
    control.append(heading, row);

    slider.addEventListener("input", () => {
      onChange(syncEditValueFromSlider(slider, value));
    });
    slider.addEventListener("change", () => activityCommitter?.commit());
    value.addEventListener("input", () => {
      const raw = value.value;

      if (raw === "" || raw === "." || (allowNegative && (raw === "-" || raw === "-."))) {
        return;
      }
      const numberPattern = allowNegative ? /^-?\d*\.?\d+$/u : /^\d*\.?\d+$/u;

      if (!numberPattern.test(raw)) {
        value.value = raw
          .replace(allowNegative ? /(?!^)-/gu : /[^\d.]/gu, "")
          .replace(/(\..*)\./gu, "$1");
        return;
      }
      const nextValue = Number(raw);

      if (!Number.isFinite(nextValue) || nextValue <= inputMinimum) {
        return;
      }
      onChange(syncSliderFromEditValue(slider, value, nextValue));
    });
    value.addEventListener("blur", () => {
      const current = Number(value.value);
      let nextValue = Number.isFinite(current) ? current : blurFallback;

      if (!Number.isFinite(nextValue)) {
        nextValue = blurFallback;
      }
      if (blurMinimum !== undefined) {
        nextValue = Math.max(nextValue, blurMinimum);
      }
      if (title === "Axis Arrow Depth") {
        nextValue = Math.max(nextValue, 0);
      }
      if (title === "Axis Label Depth" || title === "Label Depth") {
        nextValue =
          Number.isFinite(current) && current > 0
            ? current
            : blurFallback;
      }
      onChange(syncSliderFromEditValue(slider, value, nextValue));
      value.value = String(nextValue);
      activityCommitter?.commit();
    });
    value.addEventListener("change", () => activityCommitter?.commit());

    return {
      control,
      slider,
      value,
      setValue(nextValue) {
        slider.value = String(nextValue);
        value.value = String(nextValue);
        activityCommitter?.reset();
      },
    };
  }

  function createFaceVisibilityControls(
    noun,
    onChange,
    focusPrefix,
    filterFocus,
  ) {
    const container = document.createElement("div");

    container.style.display = "none";
    container.style.marginTop = "8px";
    container.style.marginLeft = "22px";
    const checkboxes = new Map();
    const committers = [];

    for (const face of FACE_ORDER) {
      const label = document.createElement("label");

      Object.assign(label.style, {
        display: "flex",
        alignItems: "center",
        gap: "7px",
        marginBottom: "6px",
        cursor: "pointer",
      });

      const checkbox = document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.checked = false;

      const text = document.createElement("span");

      text.textContent = `Show ${noun} ${face}`;
      label.append(checkbox, text);
      container.appendChild(label);
      checkboxes.set(face, checkbox);
      const activityCommitter = createActivityRecorder(
        `${focusPrefix} (${face}) Visibility`,
        filterFocus,
        () => checkbox.checked,
      );
      committers.push(activityCommitter);

      checkbox.addEventListener("change", () => {
        onChange(face, checkbox.checked);
        activityCommitter.commit();
      });
    }

    return {
      container,
      checkboxes,
      resetActivityBaselines() {
        committers.forEach((committer) => committer.reset());
      },
    };
  }

  function createMainToggle(text) {
    const label = document.createElement("label");

    Object.assign(label.style, {
      display: "flex",
      alignItems: "center",
      gap: "7px",
      marginTop: "12px",
      cursor: "pointer",
    });

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    const textElement = document.createElement("span");

    textElement.textContent = text;
    styleUiTitle(textElement, { container: label, marginBottom: "0" });
    label.append(checkbox, textElement);
    return { label, checkbox };
  }

  function updateFaceletLabelsVisibility() {
    faceletLabelController.refreshAll();
    faceletLabelController.setVisible(showFaceletLabels.checkbox.checked);
    faceletLabelController.setDepthTest(
      faceletLabelsVisibility === HIDDEN_BEHIND_CUBE,
    );
    labelDepthControl.control.style.display = showFaceletLabels.checkbox.checked
      ? "block"
      : "none";
    faceletVisibilityControl.style.display =
      showFaceletLabels.checkbox.checked ? "block" : "none";
    onLayoutChange();
  }

  function updateAxisLabelsVisibilityMode() {
    axisSceneController.setAxisLabelsDepthTest(
      axisLabelsVisibility === HIDDEN_BEHIND_CUBE,
    );
  }

  function updateAxisArrowsVisibilityMode() {
    axisSceneController.setAxisArrowsDepthTest(
      axisArrowsVisibility === HIDDEN_BEHIND_CUBE,
    );
  }

  function updateRotationArrowsVisibilityMode() {
    axisSceneController.setRotationArrowsDepthTest(
      rotationArrowsVisibility === HIDDEN_BEHIND_CUBE,
    );
  }

  const showFaceletLabels = createMainToggle("Show Facelet Labels");
  const labelDepthControl = createNumericControl({
    title: "Label Depth",
    sliderLabel: "Label Depth",
    valueLabel: "Label Depth Value",
    min: 0,
    max: 1,
    step: 0.001,
    initialValue: faceletLabelController.getDepth(),
    inputMinimum: 0,
    blurFallback: defaultLabelDepth,
    activityCommitter: createActivityRecorder(
      "Facelet Label Depth",
      "Facelet Label Depth",
      () => faceletLabelController.getDepth(),
    ),
    onChange: (value) => faceletLabelController.setDepth(value),
  });
  const faceletVisibilityControl = createVisibilityControl(
    "Facelet Labels Visibility",
    "facelet-labels-visibility",
    faceletLabelsVisibility,
    (value) => {
      faceletLabelsVisibility = value;
      updateFaceletLabelsVisibility();
    },
    createActivityRecorder(
      "Facelet Label Visibility",
      "Facelet Label Visibility",
      () => faceletLabelsVisibility,
    ),
  );
  const faceletLabelsActivity = createActivityRecorder(
    "Facelet Labels",
    "Facelet Labels",
    () => showFaceletLabels.checkbox.checked,
  );
  showFaceletLabels.checkbox.addEventListener("change", () => {
    updateFaceletLabelsVisibility();
    faceletLabelsActivity.commit();
  });

  const showAxisLabels = createMainToggle("Show Axis Labels");
  const axisLabelsActivity = createActivityRecorder(
    "Axis Labels",
    "Axis Labels",
    () => showAxisLabels.checkbox.checked,
  );
  const axisLabelVisibilityCommitters = [];
  const axisLabelVisibility = {
    container: document.createElement("div"),
    checkboxes: new Map(),
  };

  Object.assign(axisLabelVisibility.container.style, {
    display: "none",
    marginTop: "8px",
    marginLeft: "22px",
  });
  const axisLabelNameTitle = document.createElement("div");

  axisLabelNameTitle.textContent = "Label Name";
  axisLabelNameTitle.style.display = "none";
  Object.assign(axisLabelNameTitle.style, {
    marginTop: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "5px",
  });

  const axisLabelModeContainer = document.createElement("div");

  axisLabelModeContainer.style.display = "none";
  axisLabelModeContainer.style.gap = "16px";
  const customInput = document.createElement("input");

  customInput.type = "radio";
  customInput.name = "axis-label-mode";
  customInput.value = "custom";
  const customLabel = document.createElement("label");

  Object.assign(customLabel.style, {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
  });
  const customText = document.createElement("span");

  customText.textContent = "Custom";
  customLabel.append(customInput, customText);
  const coordinateInput = document.createElement("input");

  coordinateInput.type = "radio";
  coordinateInput.name = "axis-label-mode";
  coordinateInput.value = "coordinate";
  const coordinateLabel = document.createElement("label");

  Object.assign(coordinateLabel.style, {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
  });
  const coordinateText = document.createElement("span");

  coordinateText.textContent = "Cartesian";
  coordinateLabel.append(coordinateInput, coordinateText);
  const faceInput = document.createElement("input");

  faceInput.type = "radio";
  faceInput.name = "axis-label-mode";
  faceInput.value = "face";
  faceInput.checked = true;
  const faceLabel = document.createElement("label");

  Object.assign(faceLabel.style, {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
  });
  const faceText = document.createElement("span");

  faceText.textContent = "Face";
  faceLabel.append(faceInput, faceText);
  axisLabelModeContainer.append(faceLabel, coordinateLabel, customLabel);
  const axisLabelModeActivity = createActivityRecorder(
    "Axis Label Format",
    "Axis Label Format",
    () => axisLabelMode,
  );

  const axisCustomInputs = new Map();
  const axisCustomMarkers = new Map();

  for (const face of FACE_ORDER) {
    const row = document.createElement("label");

    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "7px",
      marginBottom: "6px",
      cursor: "pointer",
    });

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = false;
    const text = document.createElement("span");

    text.textContent = `Show Label ${face}`;
    const asText = document.createElement("span");

    asText.textContent = "as";
    asText.style.visibility = "hidden";
    const custom = document.createElement("input");

    custom.type = "text";
    custom.value = face;
    custom.style.visibility = "hidden";
    custom.style.width = "55px";
    custom.style.padding = "3px";
    custom.style.boxSizing = "border-box";
    custom.setAttribute("aria-label", `Custom Label ${face}`);
    custom.addEventListener("input", () => {
      const definition = axisDefinitions.find(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      if (definition) {
        definition.label.custom = custom.value;
        updateAxisLabelText();
      }
    });
    const activityCommitter = createActivityRecorder(
      `Axis Label Text (${face})`,
      "Axis Label Text",
      () => custom.value,
    );

    custom.addEventListener("change", () => {
      if (axisLabelMode === "custom") {
        activityCommitter.commit();
      } else {
        activityCommitter.reset();
      }
    });
    row.append(checkbox, text, asText, custom);
    axisLabelVisibility.checkboxes.set(face, checkbox);
    axisLabelVisibility.container.appendChild(row);
    axisCustomInputs.set(face, custom);
    axisCustomMarkers.set(face, asText);
    const visibilityActivityCommitter = createActivityRecorder(
      `Axis Label (${face}) Visibility`,
      "Axis Label Visibility",
      () => checkbox.checked,
    );

    axisLabelVisibilityCommitters.push(visibilityActivityCommitter);
    checkbox.addEventListener("change", () => {
      const index = axisDefinitions.findIndex(
        (definition) => definition.label.face === face,
      );
      axisSceneController.setAxisLabelVisible(index, checkbox.checked);
      visibilityActivityCommitter.commit();
    });
  }

  const axisLabelDepthControl = createNumericControl({
    title: "Axis Label Depth",
    sliderLabel: "Axis Label Depth",
    valueLabel: "Axis Label Depth Value",
    min: 0,
    max: 1,
    step: 0.001,
    initialValue: axisLabelDepth,
    inputMinimum: 0,
    blurFallback: defaultLabelDepth,
    activityCommitter: createActivityRecorder(
      "Axis Label Depth",
      "Axis Label Depth",
      () => axisLabelDepth,
    ),
    onChange: (value) => {
      axisLabelDepth = value;
      axisSceneController.setAxisLabelDepth(value);
    },
  });
  const axisLabelsVisibilityControl = createVisibilityControl(
    "Axis Labels Visibility",
    "axis-labels-visibility",
    axisLabelsVisibility,
    (value) => {
      axisLabelsVisibility = value;
      updateAxisLabelsVisibilityMode();
    },
    createActivityRecorder(
      "Axis Label Visibility",
      "Axis Label Visibility",
      () => axisLabelsVisibility,
    ),
  );

  function updateAxisLabelText() {
    for (const [index, definition] of axisDefinitions.entries()) {
      const text =
        axisLabelMode === "custom"
          ? definition.label.custom
          : definition.label[axisLabelMode];
      axisSceneController.setAxisLabelText(index, text);
    }
  }

  function selectAxisLabelMode(mode) {
    axisLabelMode = mode;
    customInput.checked = mode === "custom";
    coordinateInput.checked = mode === "coordinate";
    faceInput.checked = mode === "face";
    axisCustomInputs.forEach((input) => {
      input.style.visibility = mode === "custom" ? "visible" : "hidden";
    });
    axisCustomMarkers.forEach((marker) => {
      marker.style.visibility = mode === "custom" ? "visible" : "hidden";
    });
    updateAxisLabelText();
  }

  customInput.addEventListener("change", () => {
    if (customInput.checked) {
      selectAxisLabelMode("custom");
      axisLabelModeActivity.commit();
    }
  });
  coordinateInput.addEventListener("change", () => {
    if (coordinateInput.checked) {
      selectAxisLabelMode("coordinate");
      axisLabelModeActivity.commit();
    }
  });
  faceInput.addEventListener("change", () => {
    if (faceInput.checked) {
      selectAxisLabelMode("face");
      axisLabelModeActivity.commit();
    }
  });

  const showAxisArrows = createMainToggle("Show Axis Arrows");
  const axisArrowsActivity = createActivityRecorder(
    "Axis Arrows",
    "Axis Arrows",
    () => showAxisArrows.checkbox.checked,
  );
  const axisArrowVisibility = createFaceVisibilityControls(
    "Axis",
    (face, visible) => {
      const index = axisDefinitions.findIndex(
        (definition) => definition.label.face === face,
      );
      axisSceneController.setAxisArrowVisible(index, visible);
    },
    "Axis Arrow",
    "Axis Arrow Visibility",
  );
  const axisDepthControl = createNumericControl({
    title: "Axis Arrow Depth",
    sliderLabel: "Axis Arrow Depth",
    valueLabel: "Axis Arrow Depth Value",
    min: 0,
    max: 1,
    step: 0.001,
    initialValue: axisDepth,
    blurFallback: 0,
    activityCommitter: createActivityRecorder(
      "Axis Arrow Depth",
      "Axis Arrow Depth",
      () => axisDepth,
    ),
    onChange: (value) => {
      axisDepth = value;
      axisSceneController.setAxisDepth(value);
    },
  });
  const axisArrowsVisibilityControl = createVisibilityControl(
    "Axis Arrows Visibility",
    "axis-arrows-visibility",
    axisArrowsVisibility,
    (value) => {
      axisArrowsVisibility = value;
      updateAxisArrowsVisibilityMode();
    },
    createActivityRecorder(
      "Axis Arrow Visibility",
      "Axis Arrow Visibility",
      () => axisArrowsVisibility,
    ),
  );

  const showRotationArrows = createMainToggle("Show Rotation Arrows");
  const rotationArrowsActivity = createActivityRecorder(
    "Rotation Arrows",
    "Rotation Arrows",
    () => showRotationArrows.checkbox.checked,
  );
  const rotationArrowVisibility = createFaceVisibilityControls(
    "Arrow",
    (face, visible) => {
      const index = axisDefinitions.findIndex(
        (definition) => definition.label.face === face,
      );
      axisSceneController.setRotationArrowVisible(index, visible);
    },
    "Rotation Arrow",
    "Rotation Arrow Visibility",
  );
  const rotationArrowDepthControl = createNumericControl({
    title: "Rotation Arrow Depth",
    sliderLabel: "Rotation Arrow Depth",
    valueLabel: "Rotation Arrow Depth Value",
    min: 0,
    max: 2,
    step: 0.001,
    initialValue: rotationArrowDepth,
    allowNegative: true,
    blurFallback: defaultRotationArrowDepth,
    activityCommitter: createActivityRecorder(
      "Rotation Arrow Depth",
      "Rotation Arrow Depth",
      () => rotationArrowDepth,
    ),
    onChange: (value) => {
      rotationArrowDepth = value;
      axisSceneController.setRotationArrowDepth(value);
    },
  });
  const rotationArrowThicknessControl = createNumericControl({
    title: "Rotation Arrow Thickness",
    sliderLabel: "Rotation Arrow Thickness",
    valueLabel: "Rotation Arrow Thickness Value",
    min: 0.001,
    max: 0.1,
    step: 0.001,
    initialValue: rotationArrowThickness,
    inputMinimum: -1,
    blurFallback: defaultRotationArrowThickness,
    blurMinimum: 0.001,
    activityCommitter: createActivityRecorder(
      "Rotation Arrow Thickness",
      "Rotation Arrow Thickness",
      () => rotationArrowThickness,
    ),
    onChange: (value) => {
      rotationArrowThickness = value;
      axisSceneController.setRotationArrowThickness(value);
    },
  });
  const rotationArrowRadiusControl = createNumericControl({
    title: "Rotation Arrow Radius",
    sliderLabel: "Rotation Arrow Radius",
    valueLabel: "Rotation Arrow Radius Value",
    min: 0.1,
    max: 2,
    step: 0.01,
    initialValue: rotationArrowRadius,
    inputMinimum: 0.099,
    blurFallback: defaultRotationArrowRadius,
    blurMinimum: 0.1,
    activityCommitter: createActivityRecorder(
      "Rotation Arrow Radius",
      "Rotation Arrow Radius",
      () => rotationArrowRadius,
    ),
    onChange: (value) => {
      rotationArrowRadius = value;
      axisSceneController.setRotationArrowRadius(value);
    },
  });
  const rotationArrowDirectionControl = document.createElement("div");

  rotationArrowDirectionControl.style.display = "none";
  rotationArrowDirectionControl.style.marginTop = "10px";
  const rotationArrowDirectionLabel = document.createElement("label");

  rotationArrowDirectionLabel.textContent = "Arrow Direction";
  rotationArrowDirectionLabel.style.display = "block";
  rotationArrowDirectionLabel.style.marginBottom = "5px";
  const rotationArrowDirectionSelect = document.createElement("select");

  rotationArrowDirectionSelect.id = "rotation-arrow-direction";
  rotationArrowDirectionSelect.style.width = "100%";
  rotationArrowDirectionSelect.style.padding = "6px";
  rotationArrowDirectionSelect.style.boxSizing = "border-box";
  for (const [value, text] of [
    ["clockwise", "Clockwise"],
    ["counter-clockwise", "Counter-Clockwise"],
  ]) {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = text;
    rotationArrowDirectionSelect.appendChild(option);
  }
  rotationArrowDirectionSelect.value = rotationArrowDirection;
  const rotationArrowDirectionActivity = createActivityRecorder(
    "Rotation Arrow Direction",
    "Rotation Arrow Direction",
    () => rotationArrowDirection,
  );
  rotationArrowDirectionLabel.htmlFor = rotationArrowDirectionSelect.id;
  rotationArrowDirectionControl.append(
    rotationArrowDirectionLabel,
    rotationArrowDirectionSelect,
  );
  rotationArrowDirectionSelect.addEventListener("change", () => {
    rotationArrowDirection = rotationArrowDirectionSelect.value;
    axisSceneController.setRotationArrowDirection(rotationArrowDirection);
    rotationArrowDirectionActivity.commit();
  });
  const rotationArrowsVisibilityControl = createVisibilityControl(
    "Rotation Arrows Visibility",
    "rotation-arrows-visibility",
    rotationArrowsVisibility,
    (value) => {
      rotationArrowsVisibility = value;
      updateRotationArrowsVisibilityMode();
    },
    createActivityRecorder(
      "Rotation Arrow Visibility",
      "Rotation Arrow Visibility",
      () => rotationArrowsVisibility,
    ),
  );

  content.append(
    showFaceletLabels.label,
    labelDepthControl.control,
    faceletVisibilityControl,
    showAxisLabels.label,
    axisLabelVisibility.container,
    axisLabelNameTitle,
    axisLabelModeContainer,
    axisLabelDepthControl.control,
    axisLabelsVisibilityControl,
    showAxisArrows.label,
    axisArrowVisibility.container,
    axisDepthControl.control,
    axisArrowsVisibilityControl,
    showRotationArrows.label,
    rotationArrowVisibility.container,
    rotationArrowDepthControl.control,
    rotationArrowThicknessControl.control,
    rotationArrowRadiusControl.control,
    rotationArrowDirectionControl,
    rotationArrowsVisibilityControl,
  );

  function updateAxisGroupVisibility() {
    axisSceneController.setAxisLabelGroupVisible(
      showAxisLabels.checkbox.checked,
    );
    axisSceneController.setAxisArrowGroupVisible(
      showAxisArrows.checkbox.checked,
    );
  }

  showAxisLabels.checkbox.addEventListener("change", () => {
    updateAxisGroupVisibility();
    if (showAxisLabels.checkbox.checked) {
      setAllAxisLabelVisibility(true);
    } else {
      setAllAxisLabelVisibility(false);
    }
    axisLabelVisibility.container.style.display =
      showAxisLabels.checkbox.checked ? "block" : "none";
    axisLabelNameTitle.style.display = showAxisLabels.checkbox.checked
      ? "block"
      : "none";
    axisLabelModeContainer.style.display = showAxisLabels.checkbox.checked
      ? "flex"
      : "none";
    axisLabelDepthControl.control.style.display =
      showAxisLabels.checkbox.checked
      ? "block"
      : "none";
    axisLabelsVisibilityControl.style.display = showAxisLabels.checkbox.checked
      ? "block"
      : "none";
    onLayoutChange();
    axisLabelsActivity.commit();
  });
  showAxisArrows.checkbox.addEventListener("change", () => {
    updateAxisGroupVisibility();
    setAllAxisArrowVisibility(showAxisArrows.checkbox.checked);
    axisArrowVisibility.container.style.display =
      showAxisArrows.checkbox.checked ? "block" : "none";
    axisDepthControl.control.style.display = showAxisArrows.checkbox.checked
      ? "block"
      : "none";
    axisArrowsVisibilityControl.style.display = showAxisArrows.checkbox.checked
      ? "block"
      : "none";
    onLayoutChange();
    axisArrowsActivity.commit();
  });
  showRotationArrows.checkbox.addEventListener("change", () => {
    axisSceneController.setRotationArrowGroupVisible(
      showRotationArrows.checkbox.checked,
    );
    if (showRotationArrows.checkbox.checked) {
      setAllRotationArrowVisibility(true);
    }
    rotationArrowVisibility.container.style.display =
      showRotationArrows.checkbox.checked ? "block" : "none";
    rotationArrowDepthControl.control.style.display =
      showRotationArrows.checkbox.checked ? "block" : "none";
    rotationArrowThicknessControl.control.style.display =
      showRotationArrows.checkbox.checked ? "block" : "none";
    rotationArrowRadiusControl.control.style.display =
      showRotationArrows.checkbox.checked ? "block" : "none";
    rotationArrowDirectionControl.style.display =
      showRotationArrows.checkbox.checked ? "block" : "none";
    rotationArrowsVisibilityControl.style.display =
      showRotationArrows.checkbox.checked ? "block" : "none";
    onLayoutChange();
    rotationArrowsActivity.commit();
  });

  function setAllAxisLabelVisibility(visible) {
    for (const [face, checkbox] of axisLabelVisibility.checkboxes) {
      checkbox.checked = visible;
      const index = axisDefinitions.findIndex(
        (definition) => definition.label.face === face,
      );
      axisSceneController.setAxisLabelVisible(index, visible);
    }
    axisLabelVisibilityCommitters.forEach((committer) => committer.reset());
  }

  function setAllAxisArrowVisibility(visible) {
    for (const [face, checkbox] of axisArrowVisibility.checkboxes) {
      checkbox.checked = visible;
      const index = axisDefinitions.findIndex(
        (definition) => definition.label.face === face,
      );
      axisSceneController.setAxisArrowVisible(index, visible);
    }
    axisArrowVisibility.resetActivityBaselines();
  }

  function setAllRotationArrowVisibility(visible) {
    for (const [face, checkbox] of rotationArrowVisibility.checkboxes) {
      checkbox.checked = visible;
      const index = axisDefinitions.findIndex(
        (definition) => definition.label.face === face,
      );
      axisSceneController.setRotationArrowVisible(index, visible);
    }
    rotationArrowVisibility.resetActivityBaselines();
  }

  function reset() {
    showFaceletLabels.checkbox.checked = false;
    showAxisLabels.checkbox.checked = false;
    showAxisArrows.checkbox.checked = false;
    showRotationArrows.checkbox.checked = false;
    axisSceneController.setAxisLabelGroupVisible(false);
    axisSceneController.setAxisArrowGroupVisible(false);
    axisSceneController.setRotationArrowGroupVisible(false);
    setAllAxisLabelVisibility(false);
    setAllAxisArrowVisibility(false);
    setAllRotationArrowVisibility(true);
    faceletLabelsVisibility = ALWAYS_VISIBLE;
    faceletVisibilityControl.setVisibilityMode(faceletLabelsVisibility);
    axisLabelsVisibility = ALWAYS_VISIBLE;
    axisLabelsVisibilityControl.setVisibilityMode(axisLabelsVisibility);
    axisArrowsVisibility = HIDDEN_BEHIND_CUBE;
    axisArrowsVisibilityControl.setVisibilityMode(axisArrowsVisibility);
    rotationArrowsVisibility = ALWAYS_VISIBLE;
    rotationArrowsVisibilityControl.setVisibilityMode(rotationArrowsVisibility);
    axisLabelDepth = defaultLabelDepth;
    axisLabelDepthControl.setValue(axisLabelDepth);
    axisSceneController.setAxisLabelDepth(axisLabelDepth);
    axisDepth = defaultAxisDepth;
    axisDepthControl.setValue(axisDepth);
    axisSceneController.setAxisDepth(axisDepth);
    rotationArrowDepth = defaultRotationArrowDepth;
    rotationArrowDepthControl.setValue(rotationArrowDepth);
    axisSceneController.setRotationArrowDepth(rotationArrowDepth);
    rotationArrowThickness = defaultRotationArrowThickness;
    rotationArrowThicknessControl.setValue(rotationArrowThickness);
    axisSceneController.setRotationArrowThickness(rotationArrowThickness);
    rotationArrowRadius = defaultRotationArrowRadius;
    rotationArrowRadiusControl.setValue(rotationArrowRadius);
    axisSceneController.setRotationArrowRadius(rotationArrowRadius);
    rotationArrowDirection = "clockwise";
    rotationArrowDirectionSelect.value = rotationArrowDirection;
    axisSceneController.setRotationArrowDirection(rotationArrowDirection);
    for (const [face, input] of axisCustomInputs) {
      input.value = face;
      const definition = axisDefinitions.find(
        (axisDefinition) => axisDefinition.label.face === face,
      );
      if (definition) {
        definition.label.custom = face;
      }
    }
    selectAxisLabelMode("face");
    axisLabelVisibility.container.style.display = "none";
    axisArrowVisibility.container.style.display = "none";
    rotationArrowVisibility.container.style.display = "none";
    axisLabelNameTitle.style.display = "none";
    axisLabelModeContainer.style.display = "none";
    axisLabelDepthControl.control.style.display = "none";
    axisLabelsVisibilityControl.style.display = "none";
    axisDepthControl.control.style.display = "none";
    axisArrowsVisibilityControl.style.display = "none";
    rotationArrowDepthControl.control.style.display = "none";
    rotationArrowThicknessControl.control.style.display = "none";
    rotationArrowRadiusControl.control.style.display = "none";
    rotationArrowDirectionControl.style.display = "none";
    rotationArrowsVisibilityControl.style.display = "none";
    faceletLabelController.setDepth(defaultLabelDepth);
    updateFaceletLabelsVisibility();
    updateAxisLabelsVisibilityMode();
    updateAxisArrowsVisibilityMode();
    updateRotationArrowsVisibilityMode();
    resetActivityBaselines();
  }

  function getSetupState() {
    const axisLabelsByFace = {};
    const axisArrowsByFace = {};
    const rotationArrowsByFace = {};

    for (const axisDefinition of axisDefinitions) {
      const face = axisDefinition.label.face;

      axisLabelsByFace[face] = {
        visible: axisLabelVisibility.checkboxes.get(face).checked,
        customText: axisDefinition.label.custom,
      };
      axisArrowsByFace[face] = {
        visible:
          showAxisArrows.checkbox.checked &&
          axisArrowVisibility.checkboxes.get(face).checked,
      };
      rotationArrowsByFace[face] = {
        visible:
          showRotationArrows.checkbox.checked &&
          rotationArrowVisibility.checkboxes.get(face).checked,
      };
    }

    return {
      facelets: showFaceletLabels.checkbox.checked,
      faceletVisibility: faceletLabelsVisibility,
      axisLabels: showAxisLabels.checkbox.checked,
      axisLabelVisibility: axisLabelsVisibility,
      axisLabelMode,
      axisLabelDepth,
      axisLabelsByFace,
      axisArrows: showAxisArrows.checkbox.checked,
      axisArrowVisibility: axisArrowsVisibility,
      axisDepth,
      axisArrowsByFace,
      rotationArrows: showRotationArrows.checkbox.checked,
      rotationArrowVisibility: rotationArrowsVisibility,
      rotationArrowDepth,
      rotationArrowThickness,
      rotationArrowRadius,
      rotationArrowDirection,
      rotationArrowsByFace,
      labelDepth: faceletLabelController.getDepth(),
    };
  }

  function getAxisLabelText(axisDefinition) {
    return axisLabelMode === "custom"
      ? axisDefinition.label.custom
      : axisDefinition.label[axisLabelMode];
  }

  function applySetup(settings) {
    showFaceletLabels.checkbox.checked = settings.facelets;
    showFaceletLabels.checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    faceletLabelsVisibility = settings.faceletVisibility;
    faceletVisibilityControl.setVisibilityMode(faceletLabelsVisibility);
    updateFaceletLabelsVisibility();

    showAxisLabels.checkbox.checked = settings.axisLabels;
    showAxisLabels.checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    axisLabelsVisibility = settings.axisLabelVisibility;
    axisLabelsVisibilityControl.setVisibilityMode(axisLabelsVisibility);
    updateAxisLabelsVisibilityMode();
    for (const [face, label] of Object.entries(settings.axisLabelsByFace)) {
      const checkbox = axisLabelVisibility.checkboxes.get(face);
      const customInput = axisCustomInputs.get(face);
      const definition = axisDefinitions.find(
        (axisDefinition) => axisDefinition.label.face === face,
      );
      if (checkbox) {
        checkbox.checked = label.visible;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (customInput && definition) {
        customInput.value = label.customText;
        definition.label.custom = label.customText;
      }
    }
    selectAxisLabelMode(settings.axisLabelMode);
    axisLabelDepth = settings.axisLabelDepth;
    axisLabelDepthControl.setValue(axisLabelDepth);
    axisSceneController.setAxisLabelDepth(axisLabelDepth);

    showAxisArrows.checkbox.checked = settings.axisArrows;
    showAxisArrows.checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    axisArrowsVisibility = settings.axisArrowVisibility;
    axisArrowsVisibilityControl.setVisibilityMode(axisArrowsVisibility);
    updateAxisArrowsVisibilityMode();
    for (const [face, arrow] of Object.entries(settings.axisArrowsByFace)) {
      const checkbox = axisArrowVisibility.checkboxes.get(face);
      if (checkbox) {
        checkbox.checked = arrow.visible;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    axisDepth = settings.axisDepth;
    axisDepthControl.setValue(axisDepth);
    axisSceneController.setAxisDepth(axisDepth);

    showRotationArrows.checkbox.checked = settings.rotationArrows;
    showRotationArrows.checkbox.dispatchEvent(
      new Event("change", { bubbles: true }),
    );
    rotationArrowsVisibility = settings.rotationArrowVisibility;
    rotationArrowsVisibilityControl.setVisibilityMode(rotationArrowsVisibility);
    updateRotationArrowsVisibilityMode();
    resetActivityBaselines();
    for (const [face, arrow] of Object.entries(settings.rotationArrowsByFace)) {
      const checkbox = rotationArrowVisibility.checkboxes.get(face);
      if (checkbox) {
        checkbox.checked = arrow.visible;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    rotationArrowDepth = settings.rotationArrowDepth;
    rotationArrowDepthControl.setValue(rotationArrowDepth);
    axisSceneController.setRotationArrowDepth(rotationArrowDepth);
    rotationArrowThickness = settings.rotationArrowThickness;
    rotationArrowThicknessControl.setValue(rotationArrowThickness);
    axisSceneController.setRotationArrowThickness(rotationArrowThickness);
    rotationArrowRadius = settings.rotationArrowRadius;
    rotationArrowRadiusControl.setValue(rotationArrowRadius);
    axisSceneController.setRotationArrowRadius(rotationArrowRadius);
    rotationArrowDirection = settings.rotationArrowDirection;
    rotationArrowDirectionSelect.value = rotationArrowDirection;
    axisSceneController.setRotationArrowDirection(rotationArrowDirection);
    faceletLabelController.setDepth(settings.labelDepth);
    labelDepthControl.setValue(faceletLabelController.getDepth());
    resetActivityBaselines();
  }

  return {
    root,
    setExpanded,
    reset,
    getSetupState,
    getAxisLabelText,
    applySetup,
  };
}
