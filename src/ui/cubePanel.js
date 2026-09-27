function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function syncSliderFromEditValue(
  slider,
  valueInput,
  value,
  { min = -Infinity, max = Math.max(100, Number(slider.max)) } = {},
) {
  const sliderMin = Number(slider.min);
  const sliderMax = Number(slider.max);
  const acceptedValue = Math.min(Math.max(value, min), max);

  slider.value = String(clamp(acceptedValue, sliderMin, sliderMax));

  if (acceptedValue !== value) {
    valueInput.value = String(acceptedValue);
  }

  return acceptedValue;
}

function syncEditValueFromSlider(slider, valueInput) {
  valueInput.value = slider.value;

  return Number(valueInput.value);
}

export function createCubePanel({
  cubies,
  initialSize,
  initialGap,
  defaultSize,
  defaultGap,
  createLabel,
  styleUiTitle,
  panelBackground,
  onDimensionsChange,
  onGlobalValuesChange,
  onLayoutChange,
  onCustomModeSelected,
}) {
  let size = initialSize;
  let gap = initialGap;

  const root = document.createElement("div");
  const cubeGapModeContainer = document.createElement("div");

  cubeGapModeContainer.style.display = "flex";
  cubeGapModeContainer.style.alignItems = "center";
  cubeGapModeContainer.style.gap = "16px";
  cubeGapModeContainer.style.marginBottom = "14px";

  const globalGapLabel = document.createElement("label");

  globalGapLabel.style.display = "flex";
  globalGapLabel.style.alignItems = "center";
  globalGapLabel.style.gap = "6px";
  globalGapLabel.style.cursor = "pointer";

  const globalGapRadio = document.createElement("input");

  globalGapRadio.type = "radio";
  globalGapRadio.name = "cubeGapMode";
  globalGapRadio.value = "global";
  globalGapRadio.checked = true;

  const globalGapText = document.createElement("span");

  globalGapText.textContent = "Global";
  globalGapLabel.appendChild(globalGapRadio);
  globalGapLabel.appendChild(globalGapText);

  const customGapLabel = document.createElement("label");

  customGapLabel.style.display = "flex";
  customGapLabel.style.alignItems = "center";
  customGapLabel.style.gap = "6px";
  customGapLabel.style.cursor = "pointer";

  const customGapRadio = document.createElement("input");

  customGapRadio.type = "radio";
  customGapRadio.name = "cubeGapMode";
  customGapRadio.value = "custom";

  const customGapText = document.createElement("span");

  customGapText.textContent = "Custom";
  customGapLabel.appendChild(customGapRadio);
  customGapLabel.appendChild(customGapText);
  cubeGapModeContainer.appendChild(globalGapLabel);
  cubeGapModeContainer.appendChild(customGapLabel);
  root.appendChild(cubeGapModeContainer);

  function createCubeSetting(labelText, min, max, step, initialValue) {
    const setting = document.createElement("div");

    setting.style.marginBottom = "14px";

    const label = createLabel(labelText);

    setting.appendChild(label);

    const container = document.createElement("div");

    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "8px";

    const slider = document.createElement("input");

    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(initialValue);
    slider.style.flex = "1";
    slider.style.minWidth = "0";

    const value = document.createElement("input");

    value.type = "text";
    value.value = String(initialValue);
    value.style.width = "55px";
    value.style.boxSizing = "border-box";
    value.style.textAlign = "center";

    container.appendChild(slider);
    container.appendChild(value);
    setting.appendChild(container);
    root.appendChild(setting);

    return { slider, value, setting };
  }

  const sizeControls = createCubeSetting("Size", 0, 2, 0.01, defaultSize);
  const gapControls = createCubeSetting("Gap", 0, 1, 0.001, defaultGap);
  const customDimensions = new Map(
    cubies.map((cubie) => [cubie, { size, gap }]),
  );
  const customDimensionInputs = new Map();
  const customGroupInputs = new Map();

  function syncGlobalDimensionControl(property) {
    const values = [...customDimensions.values()].map(
      (dimensions) => dimensions[property],
    );
    const controls = property === "size" ? sizeControls : gapControls;
    const isUniform = values.every((value) => value === values[0]);

    controls.value.value = isUniform ? String(values[0]) : "";
    controls.value.placeholder = isUniform ? "" : "Mixed";
    controls.slider.style.accentColor = isUniform ? "" : "#f97316";

    if (isUniform) {
      controls.slider.value = String(values[0]);

      if (property === "size") {
        size = values[0];
      } else {
        gap = values[0];
      }

      onGlobalValuesChange(size, gap);
    }
  }

  function updateGroupHeading(group) {
    const controls = customGroupInputs.get(group);

    if (!controls) {
      return;
    }

    const groupCubies = sortedDimensionCubies.filter(
      (cubie) => getCubieGroup(cubie) === group,
    );

    for (const property of ["size", "gap"]) {
      const values = groupCubies.map(
        (cubie) => customDimensions.get(cubie)[property],
      );
      const firstValue = values[0];
      const isUniform = values.every((value) => value === firstValue);

      controls[property].value = isUniform ? String(firstValue) : "";
      controls[property].placeholder = isUniform ? "" : "Mixed";
    }
  }

  function updateAllCustomDimensionValues(property, value) {
    for (const [cubie, dimensions] of customDimensions) {
      dimensions[property] = value;

      const inputs = customDimensionInputs.get(cubie);
      if (inputs) {
        inputs[property].value = String(value);
      }
    }

    for (const group of customGroupInputs.keys()) {
      updateGroupHeading(group);
    }
  }

  function applyGlobalDimension(property, value) {
    if (property === "size") {
      size = value;
    } else {
      gap = value;
    }

    updateAllCustomDimensionValues(property, value);
    syncGlobalDimensionControl(property);
    onDimensionsChange(size, gap, customDimensions);
  }

  sizeControls.slider.addEventListener("input", () => {
    size = syncEditValueFromSlider(sizeControls.slider, sizeControls.value);

    applyGlobalDimension("size", size);
  });

  sizeControls.value.addEventListener("input", () => {
    const raw = sizeControls.value.value;

    if (raw === "") {
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      return;
    }

    size = syncSliderFromEditValue(
      sizeControls.slider,
      sizeControls.value,
      value,
      { max: 10 },
    );

    applyGlobalDimension("size", size);
  });

  sizeControls.value.addEventListener("blur", () => {
    if (
      sizeControls.value.value === "" &&
      sizeControls.value.placeholder === "Mixed"
    ) {
      syncGlobalDimensionControl("size");
      return;
    }

    const raw = Number(sizeControls.value.value);
    const value = Number.isFinite(raw) ? Math.max(raw, 0) : defaultSize;

    size = syncSliderFromEditValue(
      sizeControls.slider,
      sizeControls.value,
      value,
      { max: 10 },
    );
    sizeControls.value.value = String(size);

    applyGlobalDimension("size", size);
  });

  gapControls.slider.addEventListener("input", () => {
    gap = syncEditValueFromSlider(gapControls.slider, gapControls.value);

    applyGlobalDimension("gap", gap);
  });

  gapControls.value.addEventListener("input", () => {
    const raw = gapControls.value.value;

    if (raw === "") {
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      return;
    }

    gap = syncSliderFromEditValue(
      gapControls.slider,
      gapControls.value,
      value,
      { min: 0, max: 1 },
    );

    applyGlobalDimension("gap", gap);
  });

  gapControls.value.addEventListener("blur", () => {
    if (
      gapControls.value.value === "" &&
      gapControls.value.placeholder === "Mixed"
    ) {
      syncGlobalDimensionControl("gap");
      return;
    }

    const raw = Number(gapControls.value.value);
    const value = Number.isFinite(raw) ? Math.max(raw, 0) : defaultGap;

    gap = syncSliderFromEditValue(
      gapControls.slider,
      gapControls.value,
      value,
      { min: 0, max: 1 },
    );
    gapControls.value.value = String(gap);

    applyGlobalDimension("gap", gap);
  });

  const customDimensionsContent = document.createElement("div");

  customDimensionsContent.style.display = "none";
  customDimensionsContent.style.marginTop = "4px";
  customDimensionsContent.style.paddingRight = "24px";
  customDimensionsContent.style.boxSizing = "border-box";
  customDimensionsContent.style.maxHeight = "calc(100vh - 230px)";
  customDimensionsContent.style.overflowY = "auto";

  const customDimensionsHeader = document.createElement("div");

  customDimensionsHeader.style.display = "grid";
  customDimensionsHeader.style.gridTemplateColumns = "1fr 55px 55px";
  customDimensionsHeader.style.gap = "6px";
  customDimensionsHeader.style.marginBottom = "6px";
  customDimensionsHeader.style.position = "sticky";
  customDimensionsHeader.style.top = "0";
  customDimensionsHeader.style.zIndex = "1";
  customDimensionsHeader.style.background = panelBackground;
  styleUiTitle(customDimensionsHeader, { marginBottom: "6px" });

  for (const text of ["Cubie", "Size", "Gap"]) {
    const header = document.createElement("span");

    header.textContent = text;
    header.style.textAlign = text === "Cubie" ? "left" : "center";
    customDimensionsHeader.appendChild(header);
  }

  customDimensionsContent.appendChild(customDimensionsHeader);

  function getCubePositionName(cubie) {
    const { x, y, z } = cubie.userData;
    const position = [];

    if (z !== 0) {
      position.push(z > 0 ? "F" : "B");
    }

    if (y !== 0) {
      position.push(y > 0 ? "U" : "D");
    }

    if (x !== 0) {
      position.push(x > 0 ? "R" : "L");
    }

    return position.join("") || "Core";
  }

  function getCubieGroup(cubie) {
    const { x, y, z } = cubie.userData;
    const surfaceAxes = [x, y, z].filter((value) => value !== 0).length;

    if (surfaceAxes === 1) {
      return "Centers";
    }

    if (surfaceAxes === 2) {
      return "Edges";
    }

    if (surfaceAxes === 3) {
      return "Corners";
    }

    return "Core";
  }

  const cubeFaceOrder = { F: 0, B: 1, R: 2, L: 3, U: 4, D: 5 };
  const cubeGroupOrder = { Centers: 0, Edges: 1, Corners: 2, Core: 3 };

  const sortedDimensionCubies = [...cubies].sort((firstCubie, secondCubie) => {
    const firstGroup = getCubieGroup(firstCubie);
    const secondGroup = getCubieGroup(secondCubie);

    if (cubeGroupOrder[firstGroup] !== cubeGroupOrder[secondGroup]) {
      return cubeGroupOrder[firstGroup] - cubeGroupOrder[secondGroup];
    }

    const firstName = getCubePositionName(firstCubie);
    const secondName = getCubePositionName(secondCubie);
    const firstFaceOrder = cubeFaceOrder[firstName[0]] ?? 6;
    const secondFaceOrder = cubeFaceOrder[secondName[0]] ?? 6;

    if (firstFaceOrder !== secondFaceOrder) {
      return firstFaceOrder - secondFaceOrder;
    }

    const firstPosition = firstCubie.userData;
    const secondPosition = secondCubie.userData;

    return (
      firstPosition.x - secondPosition.x ||
      firstPosition.y - secondPosition.y ||
      firstPosition.z - secondPosition.z
    );
  });

  function createGroupInput(group, property, min, max) {
    const input = document.createElement("input");

    input.type = "text";
    input.style.width = "100%";
    input.style.minWidth = "0";
    input.style.boxSizing = "border-box";
    input.style.textAlign = "center";

    function applyGroupValue() {
      const raw = input.value;

      if (raw === "" || raw === "Mixed") {
        return;
      }

      const value = Number(raw);

      if (!Number.isFinite(value)) {
        return;
      }

      const clamped = clamp(value, min, max);

      for (const cubie of sortedDimensionCubies) {
        if (getCubieGroup(cubie) !== group) {
          continue;
        }

        customDimensions.get(cubie)[property] = clamped;
        customDimensionInputs.get(cubie)[property].value = String(clamped);
      }

      input.value = String(clamped);
      onDimensionsChange(size, gap, customDimensions);
      updateGroupHeading(group);
      syncGlobalDimensionControl(property);
    }

    input.addEventListener("input", applyGroupValue);
    input.addEventListener("change", applyGroupValue);
    input.addEventListener("blur", () => {
      if (input.value === "") {
        updateGroupHeading(group);
        return;
      }

      applyGroupValue();
    });

    return input;
  }

  function createGroupHeading(group) {
    const heading = document.createElement("div");

    heading.style.display = "grid";
    heading.style.gridTemplateColumns = "1fr 55px 55px";
    heading.style.gap = "6px";
    heading.style.alignItems = "center";
    heading.style.marginTop = "10px";
    heading.style.marginBottom = "6px";

    const title = document.createElement("span");

    title.textContent = group;
    styleUiTitle(title, { container: heading, marginBottom: "6px" });

    const controls = {
      size: createGroupInput(group, "size", 0, 10),
      gap: createGroupInput(group, "gap", 0, 1),
    };

    customGroupInputs.set(group, controls);
    updateGroupHeading(group);

    heading.appendChild(title);
    heading.appendChild(controls.size);
    heading.appendChild(controls.gap);

    return heading;
  }

  function createDimensionInput(cubie, property, min, max) {
    const input = document.createElement("input");

    input.type = "text";
    input.value = String(customDimensions.get(cubie)[property]);
    input.style.width = "100%";
    input.style.minWidth = "0";
    input.style.boxSizing = "border-box";
    input.style.textAlign = "center";

    function updateValue() {
      const raw = input.value;

      if (raw === "") {
        return;
      }

      const value = Number(raw);

      if (!Number.isFinite(value)) {
        return;
      }

      const clamped = clamp(value, min, max);
      const dimensions = customDimensions.get(cubie);

      dimensions[property] = clamped;
      input.value = String(clamped);
      onDimensionsChange(size, gap, customDimensions);
      updateGroupHeading(getCubieGroup(cubie));
      syncGlobalDimensionControl(property);
    }

    input.addEventListener("input", updateValue);
    input.addEventListener("change", updateValue);
    input.addEventListener("blur", () => {
      const value = Number(input.value);

      if (!Number.isFinite(value)) {
        input.value = String(customDimensions.get(cubie)[property]);
        return;
      }

      input.value = String(clamp(value, min, max));
      updateValue();
    });

    const inputs = customDimensionInputs.get(cubie) ?? {};

    inputs[property] = input;
    customDimensionInputs.set(cubie, inputs);

    return input;
  }

  let currentGroup = null;

  for (const cubie of sortedDimensionCubies) {
    const group = getCubieGroup(cubie);

    if (group !== currentGroup) {
      currentGroup = group;
      customDimensionsContent.appendChild(createGroupHeading(group));
    }

    if (group === "Core") {
      continue;
    }

    const row = document.createElement("div");

    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr 55px 55px";
    row.style.gap = "6px";
    row.style.alignItems = "center";
    row.style.marginBottom = "5px";

    const name = document.createElement("span");

    name.textContent = `${getCubePositionName(cubie)}:`;
    name.style.fontFamily = "monospace";
    row.appendChild(name);
    row.appendChild(createDimensionInput(cubie, "size", 0, 10));
    row.appendChild(createDimensionInput(cubie, "gap", 0, 1));
    customDimensionsContent.appendChild(row);
  }

  root.appendChild(customDimensionsContent);

  globalGapRadio.addEventListener("change", () => {
    if (!globalGapRadio.checked) {
      return;
    }

    customDimensionsContent.style.display = "none";
    sizeControls.setting.style.display = "block";
    gapControls.setting.style.display = "block";
    syncGlobalDimensionControl("size");
    syncGlobalDimensionControl("gap");
    onDimensionsChange(size, gap, customDimensions);
    onLayoutChange();
  });

  customGapRadio.addEventListener("change", () => {
    if (!customGapRadio.checked) {
      return;
    }

    customDimensionsContent.style.display = "block";
    sizeControls.setting.style.display = "none";
    gapControls.setting.style.display = "none";
    onCustomModeSelected();
    syncGlobalDimensionControl("size");
    syncGlobalDimensionControl("gap");
    onDimensionsChange(size, gap, customDimensions);
    onLayoutChange();
  });

  function reset() {
    size = defaultSize;
    gap = defaultGap;
    sizeControls.slider.value = defaultSize;
    sizeControls.value.value = defaultSize;
    gapControls.slider.value = defaultGap;
    gapControls.value.value = defaultGap;

    for (const dimensions of customDimensions.values()) {
      dimensions.size = defaultSize;
      dimensions.gap = defaultGap;
    }

    for (const inputs of customDimensionInputs.values()) {
      inputs.size.value = String(defaultSize);
      inputs.gap.value = String(defaultGap);
    }

    for (const group of Object.keys(cubeGroupOrder)) {
      updateGroupHeading(group);
    }

    syncGlobalDimensionControl("size");
    syncGlobalDimensionControl("gap");
    onDimensionsChange(size, gap, customDimensions);
  }

  function useGlobalMode() {
    globalGapRadio.checked = true;
    customGapRadio.checked = false;
    customDimensionsContent.style.display = "none";
    sizeControls.setting.style.display = "block";
    gapControls.setting.style.display = "block";
  }

  function applyDimensions(nextSize, nextGap) {
    size = nextSize;
    gap = nextGap;
    updateAllCustomDimensionValues("size", size);
    updateAllCustomDimensionValues("gap", gap);
    sizeControls.slider.value = size;
    sizeControls.value.value = size;
    gapControls.slider.value = gap;
    gapControls.value.value = gap;
    syncGlobalDimensionControl("size");
    syncGlobalDimensionControl("gap");
    globalGapRadio.checked = true;
    customGapRadio.checked = false;
    onDimensionsChange(size, gap, customDimensions);
  }

  return {
    root,
    reset,
    useGlobalMode,
    applyDimensions,
  };
}
