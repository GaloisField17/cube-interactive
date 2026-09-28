import invalidColorIcon from "../assets/cross-transparent.png";
import resetIcon from "../assets/reset.png";

const ALWAYS_VISIBLE = "always-visible";
const HIDDEN_BEHIND_CUBE = "hidden-behind-cube";
const MAX_NUMERIC_EDIT_VALUE = 100;

export function createViewPanel({
  panelBackground,
  panelBorder,
  panelBorderRadius,
  panelBoxShadow,
  fontFamily,
  fontSize,
  initialSettings,
  onExpand,
  onLayoutChange,
  onReset,
  onViewChange,
  onPeekColorPicked,
  getColorPreviewValue,
  attachColorPicker,
}) {
  let expanded = false;

  const root = document.createElement("div");

  root.style.position = "absolute";
  root.style.top = "20px";
  root.style.right = "20px";
  root.style.width = "280px";
  root.style.padding = "16px";
  root.style.background = panelBackground;
  root.style.border = panelBorder;
  root.style.borderRadius = panelBorderRadius;
  root.style.boxShadow = panelBoxShadow;
  root.style.fontFamily = fontFamily;
  root.style.fontSize = fontSize;
  root.style.boxSizing = "border-box";

  const header = document.createElement("div");

  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "8px";
  header.style.cursor = "pointer";
  header.style.userSelect = "none";

  const titleRow = document.createElement("div");

  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.gap = "6px";

  const resetButton = document.createElement("button");

  resetButton.className = "compact-icon-button";
  resetButton.type = "button";
  resetButton.title = "Reset View";
  resetButton.setAttribute("aria-label", "Reset View");
  resetButton.style.width = "22px";
  resetButton.style.height = "22px";
  resetButton.style.padding = "2px";
  resetButton.style.boxSizing = "border-box";
  resetButton.style.cursor = "pointer";

  const resetImage = document.createElement("img");

  resetImage.src = resetIcon;
  resetImage.alt = "";
  resetImage.style.width = "100%";
  resetImage.style.height = "100%";
  resetImage.style.display = "block";
  resetImage.style.pointerEvents = "none";
  resetButton.appendChild(resetImage);
  resetButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onReset();
  });

  const title = document.createElement("span");

  title.textContent = "View";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";

  titleRow.appendChild(resetButton);
  titleRow.appendChild(title);

  const collapseIcon = document.createElement("span");

  collapseIcon.textContent = "+";
  collapseIcon.style.fontSize = "20px";
  collapseIcon.style.lineHeight = "1";

  header.appendChild(titleRow);
  header.appendChild(collapseIcon);
  header.setAttribute("role", "button");
  header.setAttribute("aria-expanded", "false");
  header.tabIndex = 0;

  const content = document.createElement("div");

  content.id = "view-panel-content";
  content.style.marginTop = "12px";
  content.style.display = "none";

  function createVisibilityControl(titleText, groupName, initialValue, onChange) {
    const control = document.createElement("div");

    control.style.marginTop = "10px";
    control.style.marginBottom = "10px";

    const titleElement = document.createElement("div");

    titleElement.textContent = titleText;
    titleElement.style.fontSize = "14px";
    titleElement.style.fontWeight = "600";
    titleElement.style.color = "#374151";
    titleElement.style.marginBottom = "5px";

    const options = document.createElement("div");

    options.style.display = "flex";
    options.style.gap = "12px";

    for (const [value, text] of [
      [ALWAYS_VISIBLE, "Disabled"],
      [HIDDEN_BEHIND_CUBE, "Enabled"],
    ]) {
      const label = document.createElement("label");

      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.gap = "5px";
      label.style.cursor = "pointer";

      const radio = document.createElement("input");

      radio.type = "radio";
      radio.name = groupName;
      radio.value = value;
      radio.checked = value === initialValue;
      radio.addEventListener("change", () => {
        if (radio.checked) {
          onChange(value);
        }
      });

      const textElement = document.createElement("span");

      textElement.textContent = text;
      label.appendChild(radio);
      label.appendChild(textElement);
      options.appendChild(label);
    }

    control.appendChild(titleElement);
    control.appendChild(options);

    function setValue(value) {
      for (const radio of options.querySelectorAll("input")) {
        radio.checked = radio.value === value;
      }
    }

    return { root: control, setValue };
  }

  const ghostVisibilityControl = createVisibilityControl(
    "Transparent Stickers",
    "ghost-stickers-visibility",
    initialSettings.ghostStickersVisibility,
    (value) => onViewChange("ghostStickersVisibility", value),
  );
  const peekVisibilityControl = createVisibilityControl(
    "Peek Stickers",
    "peek-stickers-visibility",
    initialSettings.peekStickersVisibility,
    (value) => {
      syncPeekDepthVisibility(value);
      onViewChange("peekStickersVisibility", value);
    },
  );

  const peekHideWhenControl = document.createElement("div");

  peekHideWhenControl.style.marginTop = "8px";
  peekHideWhenControl.style.marginBottom = "8px";

  const peekHideWhenRow = document.createElement("div");

  peekHideWhenRow.style.display = "flex";
  peekHideWhenRow.style.alignItems = "center";
  peekHideWhenRow.style.gap = "8px";
  peekHideWhenRow.style.width = "100%";

  const peekHideWhenLabel = document.createElement("div");

  peekHideWhenLabel.textContent = "Hidden For: ";
  peekHideWhenLabel.style.fontSize = "14px";
  peekHideWhenLabel.style.fontWeight = "normal";
  peekHideWhenLabel.style.color = "#374151";
  peekHideWhenLabel.style.flexShrink = "0";

  const peekHideWhenInput = document.createElement("input");

  peekHideWhenInput.type = "text";
  peekHideWhenInput.value = initialSettings.peekStickersHideWhenColor;
  peekHideWhenInput.placeholder = "";
  peekHideWhenInput.style.width = "70px";
  peekHideWhenInput.style.flex = "1";
  peekHideWhenInput.style.minWidth = "0";
  peekHideWhenInput.style.padding = "3px";
  peekHideWhenInput.style.boxSizing = "border-box";

  const peekHideWhenPreview = document.createElement("span");

  peekHideWhenPreview.style.width = "18px";
  peekHideWhenPreview.style.height = "18px";
  peekHideWhenPreview.style.borderRadius = "50%";
  peekHideWhenPreview.style.border = "1px solid #999";
  peekHideWhenPreview.style.flexShrink = "0";
  peekHideWhenPreview.style.backgroundColor = "transparent";
  peekHideWhenPreview.style.backgroundImage = "none";
  peekHideWhenPreview.style.backgroundSize = "contain";
  peekHideWhenPreview.style.backgroundRepeat = "no-repeat";
  peekHideWhenPreview.style.backgroundPosition = "center";

  function syncPeekColorPreview() {
    const value = peekHideWhenInput.value.trim();

    if (!value) {
      peekHideWhenPreview.style.backgroundColor = "transparent";
      peekHideWhenPreview.style.backgroundImage = "none";
      return;
    }

    const previewValue = getColorPreviewValue(value);

    if (previewValue === null) {
      peekHideWhenPreview.style.backgroundColor = "transparent";
      peekHideWhenPreview.style.backgroundImage = `url(${invalidColorIcon})`;
      peekHideWhenPreview.style.backgroundSize = "contain";
      peekHideWhenPreview.style.backgroundRepeat = "no-repeat";
      peekHideWhenPreview.style.backgroundPosition = "center";
      return;
    }

    peekHideWhenPreview.style.backgroundImage = "none";
    peekHideWhenPreview.style.backgroundColor = previewValue;
  }

  function updatePeekColor() {
    onViewChange("peekStickersHideWhenColor", peekHideWhenInput.value.trim());
    syncPeekColorPreview();
  }

  peekHideWhenInput.addEventListener("input", updatePeekColor);
  peekHideWhenInput.addEventListener("change", updatePeekColor);
  attachColorPicker(
    peekHideWhenPreview,
    peekHideWhenInput,
    () => {
      updatePeekColor();
      onPeekColorPicked();
    },
    "#000000",
  );

  peekHideWhenRow.appendChild(peekHideWhenLabel);
  peekHideWhenRow.appendChild(peekHideWhenInput);
  peekHideWhenRow.appendChild(peekHideWhenPreview);
  peekHideWhenControl.appendChild(peekHideWhenRow);

  const peekDepthControl = document.createElement("div");

  peekDepthControl.style.marginTop = "8px";

  const peekDepthLabel = document.createElement("label");

  peekDepthLabel.textContent = "Peek Stickers Depth";
  peekDepthLabel.style.display = "block";
  peekDepthLabel.style.marginBottom = "5px";

  const peekDepthSlider = document.createElement("input");

  peekDepthSlider.type = "range";
  peekDepthSlider.min = "0";
  peekDepthSlider.max = "2";
  peekDepthSlider.step = "0.001";
  peekDepthSlider.value = String(initialSettings.peekStickersDepth);
  peekDepthSlider.style.flex = "1";
  peekDepthSlider.style.minWidth = "0";
  peekDepthSlider.setAttribute("aria-label", "Peek Stickers Depth");

  const peekDepthValue = document.createElement("input");

  peekDepthValue.type = "text";
  peekDepthValue.value = String(initialSettings.peekStickersDepth);
  peekDepthValue.style.width = "55px";
  peekDepthValue.style.boxSizing = "border-box";
  peekDepthValue.style.textAlign = "center";
  peekDepthValue.setAttribute("aria-label", "Peek Stickers Depth Value");

  const peekDepthRow = document.createElement("div");

  peekDepthRow.style.display = "flex";
  peekDepthRow.style.alignItems = "center";
  peekDepthRow.style.gap = "8px";

  function syncPeekDepthValue(nextValue) {
    const normalizedValue = Number.isFinite(nextValue)
      ? Math.max(0, Number(nextValue))
      : 0;
    const sliderMin = Number(peekDepthSlider.min);
    const sliderMax = Number(peekDepthSlider.max);
    const acceptedValue = Math.min(
      Math.max(normalizedValue, Number.NEGATIVE_INFINITY),
      Math.max(MAX_NUMERIC_EDIT_VALUE, sliderMax),
    );

    peekDepthSlider.value = String(
      Math.min(Math.max(acceptedValue, sliderMin), sliderMax),
    );

    if (acceptedValue !== normalizedValue) {
      peekDepthValue.value = String(acceptedValue);
    }

    onViewChange("peekStickersDepth", acceptedValue);
    peekDepthValue.value = String(acceptedValue);
  }

  peekDepthSlider.addEventListener("input", () => {
    peekDepthValue.value = peekDepthSlider.value;
    onViewChange("peekStickersDepth", Number(peekDepthValue.value));
  });

  peekDepthValue.addEventListener("change", (event) => {
    syncPeekDepthValue(Number(event.target.value));
  });

  peekDepthRow.appendChild(peekDepthSlider);
  peekDepthRow.appendChild(peekDepthValue);
  peekDepthControl.appendChild(peekDepthLabel);
  peekDepthControl.appendChild(peekDepthRow);

  content.appendChild(ghostVisibilityControl.root);
  content.appendChild(peekVisibilityControl.root);
  content.appendChild(peekHideWhenControl);
  content.appendChild(peekDepthControl);
  header.setAttribute("aria-controls", content.id);
  root.appendChild(header);
  root.appendChild(content);

  function syncPeekDepthVisibility(value) {
    const shouldShow = value === HIDDEN_BEHIND_CUBE;

    peekDepthControl.style.display = shouldShow ? "block" : "none";
    peekHideWhenControl.style.display = shouldShow ? "block" : "none";
    requestAnimationFrame(onLayoutChange);
  }

  function setSettings(settings) {
    ghostVisibilityControl.setValue(settings.ghostStickersVisibility);
    peekVisibilityControl.setValue(settings.peekStickersVisibility);
    peekDepthSlider.value = String(settings.peekStickersDepth);
    peekDepthValue.value = String(settings.peekStickersDepth);
    peekHideWhenInput.value = settings.peekStickersHideWhenColor;
    syncPeekColorPreview();
    syncPeekDepthVisibility(settings.peekStickersVisibility);
  }

  function setExpanded(nextExpanded) {
    if (expanded === nextExpanded) {
      return;
    }

    if (nextExpanded) {
      onExpand();
    }

    expanded = nextExpanded;
    content.style.display = expanded ? "block" : "none";
    collapseIcon.textContent = expanded ? "−" : "+";
    header.setAttribute("aria-expanded", String(expanded));
    onLayoutChange();
  }

  header.addEventListener("click", () => setExpanded(!expanded));
  header.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setExpanded(!expanded);
  });

  syncPeekDepthVisibility(initialSettings.peekStickersVisibility);

  return { root, setExpanded, setSettings };
}