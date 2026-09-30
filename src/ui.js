import {
  ArrowHelper,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import chevronLeftIcon from "./assets/chevron-left.svg";
import chevronRightIcon from "./assets/chevron-right.svg";
import copyIcon from "./assets/copy.png";
import {
  default as invalidColorIcon,
  default as mixedColorIcon,
} from "./assets/cross-transparent.png";
import startStateIcon from "./assets/cube-state-0.svg";
import expandCubeIcon from "./assets/expand.svg";
import nextRotationIcon from "./assets/next.svg";
import pauseIcon from "./assets/pause.svg";
import placeholderIcon from "./assets/placeholder.svg";
import playIcon from "./assets/play.svg";
import previousRotationIcon from "./assets/previous.svg";
import resetIcon from "./assets/reset.png";
import shrinkCubeIcon from "./assets/shrink.svg";
import stopIcon from "./assets/stop.svg";
import toEndIcon from "./assets/toend.svg";
import toStartIcon from "./assets/tostart.svg";
import undoIcon from "./assets/undo.png";
import { default as copiedIcon } from "./assets/yes.png";
import { getFaceFromNormal } from "./cubeMath.js";
import {
  getCustomMoveLabel,
  getCustomRotationAngle,
  getRotationSequenceEditorState,
  normalizeWideMoveName,
  parseCustomMove,
  stripCustomMoveParentheses,
} from "./customRotation.js";
import { prefixWithLocalTimestamp } from "./exportFileName.js";
import { getFaceletLabel, MATERIAL_INDEX_BY_FACE } from "./faceDefinitions.js";
import { createJsonExport } from "./jsonExport.js";
import { createSvgArchive } from "./svgExport.js";
import { createCubePanel } from "./ui/cubePanel.js";
import { attachColorPicker } from "./ui/colorPicker.js";
import { createCustomMoveControls } from "./ui/customMoveControls.js";
import { createFixedMoveControls } from "./ui/fixedMoveControls.js";
import { openSetupImportDialog } from "./ui/setupImportDialog.js";
import { createSetupPanel } from "./ui/setupPanel.js";
import { createViewPanel } from "./ui/viewPanel.js";

const FACE_ORDER = ["F", "B", "R", "L", "U", "D"];
const ROTATION_SEQUENCE_PLACEHOLDER = "e.g. R U R' U'";
const UI_FONT_FAMILY = "Arial, sans-serif";
const UI_FONT_SIZE = "14px";
const DEFAULT_ROTATION_TEXT_FONT_SIZE = 28;
const MIN_ROTATION_TEXT_FONT_SIZE = 16;
const ROTATION_TEXT_FONT_SIZE_STEP = 4;
const ROTATION_TEXT_MAX_ROWS = 1;
const MAX_NUMERIC_EDIT_VALUE = 100;
const COMPACT_ROTATION_TEXT_TOP_OFFSET = 168;
const DESKTOP_ROTATION_TEXT_TOP_OFFSET = 60;
const ROTATION_TOOLBAR_FRAME_INSET = 7;
const RESIZE_CONTROL_SIZE = 20;
const RESIZE_CONTROL_GAP = 8;
const RESIZE_CUBE_COLLAPSE_ICON = shrinkCubeIcon;
const RESIZE_CUBE_EXPAND_ICON = expandCubeIcon;
const RESIZE_ROTATION_TEXT_ICON = placeholderIcon;
const UI_PANEL_BACKGROUND = "rgba(255, 255, 255, 0.95)";
const UI_PANEL_BORDER_RADIUS = "8px";
const UI_PANEL_BORDER = "1px solid rgba(0, 0, 0, 0.14)";
const UI_PANEL_BOX_SHADOW = "0 2px 10px rgba(0, 0, 0, 0.2)";
const DEFAULT_LABEL_DEPTH = 0.25;
const DEFAULT_AXIS_DEPTH = 0;
const DEFAULT_ROTATION_ARROW_DEPTH = 0.65;
const DEFAULT_ROTATION_ARROW_THICKNESS = 0.015;
const DEFAULT_ROTATION_ARROW_RADIUS = 0.5;
const NAVIGATION_DURATION = 0;
const STOP_ROTATION_FINISH_DURATION = 500;
const ALWAYS_VISIBLE = "always-visible";
const HIDDEN_BEHIND_CUBE = "hidden-behind-cube";

function syncSliderFromEditValue(
  slider,
  valueInput,
  value,
  {
    min = Number.NEGATIVE_INFINITY,
    max = Math.max(MAX_NUMERIC_EDIT_VALUE, Number(slider.max)),
  } = {},
) {
  const sliderMin = Number(slider.min);
  const sliderMax = Number(slider.max);
  const acceptedValue = Math.min(Math.max(value, min), max);

  slider.value = String(MathUtils.clamp(acceptedValue, sliderMin, sliderMax));

  if (acceptedValue !== value) {
    valueInput.value = String(acceptedValue);
  }

  return acceptedValue;
}

function syncEditValueFromSlider(slider, valueInput) {
  valueInput.value = slider.value;

  return Number(valueInput.value);
}

export function createUI({
  scene,
  renderer,
  camera,
  controls,
  resetCameraView,
  setCubeViewportCollapsed,
  cubies,
  facelets,
  colors,
  defaultColors,
  defaultSize,
  defaultGap,
  durationState,
  rotateSlice: rotateSliceFromCube,
  rotateMove: rotateMoveFromCube,
  getRotationDefinition,
  resetCube,
  resetCubeOrientation: resetCubeOrientationFromCube,
  resetVisualRotations,
  updateCubeDimensions: updateCubeDimensionsFromCube,
  getCubeState,
  getDefaultCubeState,
  applyCubeState,
  size: initialSize,
  gap: initialGap,
  normalizeAngle,
}) {
  // ============================================================
  // Local cube settings
  // ============================================================

  let size = initialSize;
  let gap = initialGap;
  let labelDepth = DEFAULT_LABEL_DEPTH;
  let labelsPanel = null;
  let viewPanel = null;
  let viewPanelController = null;
  let setupPanel = null;
  let syncRightPanelChevron = () => {};
  let updateFaceletLabelTransforms = () => {};
  let updateAxisHelperScale = () => {};
  let ghostStickersVisibility = ALWAYS_VISIBLE;
  let peekStickersVisibility = ALWAYS_VISIBLE;
  let peekStickersDepth = 0.2;
  let peekStickersHideWhenColor = "";

  function dimColorForGhostEffect(color) {
    const baseColor = new Color(color);

    return `#${baseColor.multiplyScalar(0.28).getHexString()}`;
  }

  function updateGhostStickerVisibility() {
    scene.userData.shouldRefreshHiddenStickerState =
      ghostStickersVisibility !== ALWAYS_VISIBLE ||
      peekStickersVisibility !== ALWAYS_VISIBLE;

    if (!facelets.length) {
      return;
    }

    scene.updateMatrixWorld(true);

    const cameraPosition = camera.getWorldPosition(new Vector3());
    const cubieWorldPositions = new Map();

    for (const cubie of cubies) {
      cubieWorldPositions.set(
        cubie,
        new Vector3().setFromMatrixPosition(cubie.matrixWorld),
      );

      for (const material of cubie.material) {
        material.visible = true;
        material.opacity = 1;
        material.transparent = false;
        material.depthTest = true;
        material.depthWrite = true;
        material.side = 0;
      }
    }

    const activePeekOverlayIds = new Set();

    for (const facelet of facelets) {
      const face = getFaceFromNormal(facelet.normal);

      if (!face) {
        continue;
      }

      const materialIndex = MATERIAL_INDEX_BY_FACE[face];

      if (materialIndex === undefined) {
        continue;
      }

      const cubie = facelet.cubie;
      const material = cubie.material[materialIndex];
      if (!facelet.userData) {
        facelet.userData = {};
      }
      const worldNormal = new Vector3(
        facelet.normal.x,
        facelet.normal.y,
        facelet.normal.z,
      ).transformDirection(cubie.matrixWorld);
      const worldPosition = cubieWorldPositions
        .get(cubie)
        .clone()
        .add(worldNormal.clone().multiplyScalar(0.62));
      const toCamera = cameraPosition.clone().sub(worldPosition).normalize();
      const isFacingCamera = worldNormal.dot(toCamera) > 0.01;
      const isHiddenFromView = !isFacingCamera;
      const originalColor =
        facelet.currentColor ?? facelet.defaultColor ?? facelet.color;
      const shouldApplyGhostTint =
        ghostStickersVisibility === HIDDEN_BEHIND_CUBE && isHiddenFromView;
      const shouldShowPeek =
        peekStickersVisibility === HIDDEN_BEHIND_CUBE && isHiddenFromView;
      const nextColor = shouldApplyGhostTint
        ? dimColorForGhostEffect(originalColor)
        : originalColor;

      material.color.set(nextColor);
      material.visible = true;
      material.transparent = shouldApplyGhostTint;
      material.opacity = shouldApplyGhostTint ? 0.38 : 1;
      material.depthTest = !shouldApplyGhostTint;
      material.depthWrite = !shouldApplyGhostTint;
      material.side = shouldApplyGhostTint ? DoubleSide : 0;

      if (!cubie.userData.peekStickerOverlays) {
        cubie.userData.peekStickerOverlays = new Map();
      }

      let overlay = cubie.userData.peekStickerOverlays.get(facelet.id);

      if (!overlay) {
        overlay = new Mesh(
          new PlaneGeometry(0.96, 0.96),
          new MeshBasicMaterial({
            color: originalColor,
            side: DoubleSide,
            transparent: false,
            depthTest: true,
            depthWrite: false,
          }),
        );
        overlay.renderOrder = 1;
        cubie.add(overlay);
        cubie.userData.peekStickerOverlays.set(facelet.id, overlay);
      }

      const localNormal = new Vector3(
        facelet.normal.x,
        facelet.normal.y,
        facelet.normal.z,
      ).normalize();

      overlay.visible = shouldShowPeek;
      overlay.position.copy(
        localNormal.clone().multiplyScalar(0.62 + peekStickersDepth),
      );
      overlay.quaternion.setFromUnitVectors(
        new Vector3(0, 0, 1),
        localNormal.clone().normalize(),
      );
      overlay.material.color.set(originalColor);
      overlay.material.transparent = false;
      overlay.material.opacity = 1;
      overlay.material.depthTest = true;
      overlay.material.depthWrite = false;
      facelet.userData.peekVisible = shouldShowPeek;
      activePeekOverlayIds.add(`${cubie.uuid}:${facelet.id}`);
    }

    for (const cubie of cubies) {
      const overlays = cubie.userData.peekStickerOverlays;

      if (!overlays) {
        continue;
      }

      for (const [faceletId, overlay] of overlays.entries()) {
        if (!activePeekOverlayIds.has(`${cubie.uuid}:${faceletId}`)) {
          overlay.visible = false;
        }
      }
    }
  }

  function markSetupChanged() {
    updateGhostStickerVisibility();
  }

  function updateCubeDimensions(...args) {
    updateCubeDimensionsFromCube(...args);
    updateFaceletLabelTransforms();
    updateAxisHelperScale();
  }

  function rotateSlice(...args) {
    return Promise.resolve(rotateSliceFromCube(...args)).then((result) => {
      updateFaceletLabelTransforms();
      return result;
    });
  }

  function rotateMove(...args) {
    return Promise.resolve(rotateMoveFromCube(...args)).then((result) => {
      updateFaceletLabelTransforms();
      return result;
    });
  }

  function resetCubeOrientation(...args) {
    resetCubeOrientationFromCube(...args);
    updateFaceletLabelTransforms();
  }

  const controlsRoot = document.createElement("div");

  controlsRoot.className = "responsive-controls";
  document.body.appendChild(controlsRoot);
  scene.userData.refreshHiddenStickerState = updateGhostStickerVisibility;
  scene.userData.shouldRefreshHiddenStickerState = false;
  const peekStickerGroup = new Group();
  const peekStickerOverlays = new Map();

  peekStickerGroup.renderOrder = 1;
  scene.add(peekStickerGroup);
  document.addEventListener("input", markSetupChanged, true);
  document.addEventListener("change", markSetupChanged, true);
  controls.addEventListener("change", markSetupChanged);
  controls.addEventListener("change", updateGhostStickerVisibility);

  // ============================================================
  // Rotation panel
  // ============================================================

  const panel = document.createElement("div");

  panel.id = "rotation-panel";
  setStyles(panel, {
    position: "absolute",
    top: "130px",
    left: "20px",
    width: "220px",
    padding: "16px",
    background: UI_PANEL_BACKGROUND,
    borderRadius: UI_PANEL_BORDER_RADIUS,
    boxShadow: UI_PANEL_BOX_SHADOW,
    fontFamily: UI_FONT_FAMILY,
    fontSize: UI_FONT_SIZE,
    boxSizing: "border-box",
    border: UI_PANEL_BORDER,
  });

  controlsRoot.appendChild(panel);

  const rotationPanelChevron = document.createElement("button");

  rotationPanelChevron.className = "rotation-panel-chevron";
  rotationPanelChevron.type = "button";
  rotationPanelChevron.setAttribute("aria-controls", panel.id);
  rotationPanelChevron.style.position = "absolute";
  rotationPanelChevron.style.left = "2px";
  rotationPanelChevron.style.width = "18px";
  rotationPanelChevron.style.padding = "0";
  rotationPanelChevron.style.border = UI_PANEL_BORDER;
  rotationPanelChevron.style.cursor = "pointer";
  rotationPanelChevron.style.zIndex = "2";
  rotationPanelChevron.style.boxSizing = "border-box";
  stylePanelChevron(rotationPanelChevron, "left", { showShadow: false });
  controlsRoot.appendChild(rotationPanelChevron);

  let rotationUiHidden = false;

  function syncRotationPanelChevron() {
    if (window.innerWidth <= 900) {
      rotationUiHidden = false;
      panel.style.transform = "";
      panel.style.borderRadius = UI_PANEL_BORDER_RADIUS;
      rotationPanelChevron.style.display = "none";
      return;
    }

    const direction = rotationUiHidden ? "right" : "left";

    panel.style.borderRadius = rotationUiHidden
      ? UI_PANEL_BORDER_RADIUS
      : `0 ${UI_PANEL_BORDER_RADIUS} ${UI_PANEL_BORDER_RADIUS} 0`;
    rotationPanelChevron.style.display = "flex";
    rotationPanelChevron.style.alignItems = "center";
    rotationPanelChevron.style.justifyContent = "center";
    rotationPanelChevron.style.top = `${panel.offsetTop}px`;
    rotationPanelChevron.style.height = `${panel.offsetHeight}px`;
    setPanelChevronShape(rotationPanelChevron, direction, !rotationUiHidden);
    setPanelChevronIcon(rotationPanelChevron, direction);
    rotationPanelChevron.title = rotationUiHidden
      ? "Expand Rotation UI"
      : "Collapse Rotation UI";
    rotationPanelChevron.setAttribute("aria-label", rotationPanelChevron.title);
    rotationPanelChevron.setAttribute(
      "aria-expanded",
      String(!rotationUiHidden),
    );
    panel.style.transition =
      "transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1)";
    panel.style.transform = rotationUiHidden
      ? "translateX(calc(-100% - 20px))"
      : "";
  }

  rotationPanelChevron.addEventListener("click", () => {
    rotationUiHidden = !rotationUiHidden;
    syncRotationPanelChevron();
    syncRotationBlockLayout();
  });

  panel.addEventListener("transitionend", (event) => {
    if (event.propertyName === "transform") {
      syncRotationBlockLayout();
    }
  });

  const rotationPanelResizeObserver = new ResizeObserver(
    syncRotationPanelChevron,
  );

  rotationPanelResizeObserver.observe(panel);
  window.addEventListener("resize", syncRotationPanelChevron);
  syncRotationPanelChevron();

  // ============================================================
  // Helper
  // ============================================================

  function setStyles(element, styles) {
    Object.assign(element.style, styles);
  }

  function stylePanelChevron(button, outerEdge, { showShadow = true } = {}) {
    const edgeShadow =
      outerEdge === "left"
        ? "-1px 0 4px rgba(0, 0, 0, 0.08)"
        : "1px 0 4px rgba(0, 0, 0, 0.08)";
    const restingShadow = showShadow ? edgeShadow : "none";

    button.style.borderColor = "rgba(0, 0, 0, 0.14)";
    button.style.background = UI_PANEL_BACKGROUND;
    button.style.boxShadow = restingShadow;
    button.style.color = "#4b5563";
    button.style.transition =
      "top 240ms cubic-bezier(0.22, 0.61, 0.36, 1), height 240ms cubic-bezier(0.22, 0.61, 0.36, 1), background-color 140ms ease, box-shadow 140ms ease";

    button.addEventListener("mouseenter", () => {
      button.style.background = "#f9fafb";
      button.style.boxShadow = showShadow
        ? edgeShadow.replace("0.08", "0.12")
        : "none";
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = UI_PANEL_BACKGROUND;
      button.style.boxShadow = restingShadow;
    });
  }

  function setPanelChevronShape(button, direction, attachedToPanel) {
    const border = UI_PANEL_BORDER;
    const leftRounded = direction === "left";

    button.style.border = border;
    button.style.borderLeft = attachedToPanel && !leftRounded ? "0" : border;
    button.style.borderRight = attachedToPanel && leftRounded ? "0" : border;
    button.style.borderRadius = leftRounded
      ? `${UI_PANEL_BORDER_RADIUS} 0 0 ${UI_PANEL_BORDER_RADIUS}`
      : `0 ${UI_PANEL_BORDER_RADIUS} ${UI_PANEL_BORDER_RADIUS} 0`;
  }

  function setPanelChevronIcon(button, direction) {
    let iconContainer = button.querySelector(".panel-chevron-icons");

    if (!iconContainer) {
      iconContainer = document.createElement("span");
      iconContainer.className = "panel-chevron-icons";
      iconContainer.setAttribute("aria-hidden", "true");
      setStyles(iconContainer, {
        position: "relative",
        display: "block",
        width: "14px",
        height: "14px",
        pointerEvents: "none",
      });

      for (const [iconDirection, iconSource] of [
        ["left", chevronLeftIcon],
        ["right", chevronRightIcon],
      ]) {
        const icon = document.createElement("img");

        icon.dataset.direction = iconDirection;
        icon.src = iconSource;
        icon.alt = "";
        icon.draggable = false;
        setStyles(icon, {
          position: "absolute",
          inset: "0",
          display: "block",
          width: "100%",
          height: "100%",
          opacity: "0",
          pointerEvents: "none",
          transition: "opacity 140ms ease",
        });
        iconContainer.appendChild(icon);
      }

      button.appendChild(iconContainer);
    }

    for (const icon of iconContainer.querySelectorAll("img")) {
      icon.style.opacity = icon.dataset.direction === direction ? "1" : "0";
    }
  }

  function styleUiTitle(
    titleElement,
    { container = titleElement, fontSize = "14px", marginBottom = "7px" } = {},
  ) {
    setStyles(titleElement, {
      fontSize,
      fontWeight: "600",
      color: "#374151",
    });
    setStyles(container, {
      paddingBottom: "6px",
      borderBottom: "1px solid #d1d5db",
      marginBottom,
    });
  }

  function createLabel(text) {
    const label = document.createElement("label");

    label.textContent = text;
    setStyles(label, {
      display: "block",
      marginBottom: "6px",
      fontWeight: "bold",
    });

    return label;
  }

  function addHoverEffect(button, hoverBackground) {
    const defaultBackground = button.style.background;

    button.style.transition = "background-color 120ms ease";
    button.addEventListener("mouseenter", () => {
      button.style.background = hoverBackground;
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = defaultBackground;
    });
  }

  function createResetButton(title, resetAction) {
    const button = document.createElement("button");

    button.className = "compact-icon-button";
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.style.width = "22px";
    button.style.height = "22px";
    button.style.padding = "2px";
    button.style.boxSizing = "border-box";
    button.style.cursor = "pointer";

    const image = document.createElement("img");

    image.src = resetIcon;
    image.alt = "";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.display = "block";
    image.style.pointerEvents = "none";

    button.appendChild(image);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      resetAction();
      markSetupChanged();
    });

    return button;
  }

  const rotationBlinkStyle = document.createElement("style");

  rotationBlinkStyle.textContent = `
    @keyframes rotation-entry-blink {
      0%, 100% {
        color: #999;
        background-color: transparent;
      }
      50% {
        color: #166534;
        background-color: #dcfce7;
      }
    }

    @keyframes rotation-cursor-blink {
      0%, 45% {
        opacity: 1;
      }
      46%, 100% {
        opacity: 0;
      }
    }

    @keyframes rotation-undo-blink {
      0%, 100% {
        border-color: #fca5a5;
        background-color: transparent;
      }
      50% {
        border-color: #ef4444;
        background-color: #fee2e2;
      }
    }
  `;
  document.head.appendChild(rotationBlinkStyle);

  const exportSvgArchive = createSvgArchive({
    scene,
    renderer,
    camera,
    cubies,
    getSize: () => size,
    getGap: () => gap,
    getFaceletLabels: () => faceletLabels,
    getAxisGroup: () => axisGroup,
    getRotationArrowGroup: () => rotationArrowGroup,
    getAxisLabelText: (label) => {
      const axisDefinition = label.userData.axisDefinition;

      return axisLabelMode === "custom"
        ? axisDefinition?.label.custom
        : axisDefinition?.label[axisLabelMode];
    },
    getRotationArrowThickness: () => rotationArrowThickness,
    getFaceletLabelsVisibility: () => faceletLabelsVisibility,
    getAxisLabelsVisibility: () => axisLabelsVisibility,
    getAxisArrowsVisibility: () => axisArrowsVisibility,
    getRotationArrowsVisibility: () => rotationArrowsVisibility,
  });

  // ============================================================
  // Rotation title
  // ============================================================

  const rotationTitle = document.createElement("div");

  rotationTitle.textContent = "Rotation";
  setStyles(rotationTitle, {
    fontSize: "18px",
    fontWeight: "bold",
  });

  const rotationHeader = document.createElement("div");

  setStyles(rotationHeader, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    userSelect: "none",
  });

  const rotationTitleRow = document.createElement("div");

  setStyles(rotationTitleRow, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: "1",
    minWidth: "0",
  });

  const resetRotationButton = createResetButton("Reset Rotation", () =>
    resetRotationInterface(),
  );

  rotationTitleRow.appendChild(resetRotationButton);
  rotationTitleRow.appendChild(rotationTitle);
  rotationHeader.appendChild(rotationTitleRow);
  panel.appendChild(rotationHeader);

  const rotationContent = document.createElement("div");

  rotationContent.id = "rotation-panel-content";
  setStyles(rotationContent, { marginTop: "12px" });
  panel.appendChild(rotationContent);

  let rotationCollapsed = window.innerWidth <= 900;
  rotationContent.style.display = rotationCollapsed ? "none" : "block";

  const rotationToggleButton = document.createElement("span");

  rotationToggleButton.setAttribute("role", "button");
  rotationToggleButton.tabIndex = 0;
  rotationToggleButton.title = "Collapse Or Expand Rotation Controls";
  rotationToggleButton.setAttribute(
    "aria-label",
    "Collapse Or Expand Rotation Controls",
  );
  rotationToggleButton.setAttribute("aria-controls", rotationContent.id);
  rotationToggleButton.style.fontSize = "20px";
  rotationToggleButton.style.lineHeight = "1";
  rotationToggleButton.style.flexShrink = "0";
  rotationToggleButton.style.cursor = "pointer";
  rotationToggleButton.textContent = rotationCollapsed ? "+" : "−";
  rotationHeader.appendChild(rotationToggleButton);

  function updateRotationToggle() {
    rotationToggleButton.textContent = rotationCollapsed ? "+" : "−";
    rotationToggleButton.setAttribute(
      "aria-expanded",
      String(!rotationCollapsed),
    );
  }

  updateRotationToggle();

  function toggleRotationPanel() {
    rotationCollapsed = !rotationCollapsed;

    if (!rotationCollapsed) {
      collapseOtherPanels("rotation");
    }

    rotationContent.style.display = rotationCollapsed ? "none" : "block";
    updateRotationToggle();
    syncRotationBlockLayout();
  }

  rotationToggleButton.addEventListener("click", toggleRotationPanel);
  rotationToggleButton.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleRotationPanel();
  });

  let pendingRotationCount = 0;

  const rotationStatus = {
    idle: {
      label: "Rotation",
    },
    playing: {
      label: "Rotating...",
    },
    paused: {
      label: "Paused",
    },
    stopped: {
      label: "Stopped",
    },
  };

  function setRotationStatus(state) {
    const status = rotationStatus[state] ?? rotationStatus.idle;

    rotationTitle.textContent = status.label;
  }

  function markRotationStarted() {
    pendingRotationCount += 1;
    setRotationStatus("playing");
  }

  function markRotationCompleted() {
    pendingRotationCount = Math.max(0, pendingRotationCount - 1);

    if (pendingRotationCount === 0) {
      setRotationStatus(rotationStopRequested ? "stopped" : "idle");
    }
  }

  // ============================================================
  // Rotation text
  // ============================================================

  const rotationText = document.createElement("div");

  rotationText.className = "rotation-sequence";
  rotationText.textContent = "";

  rotationText.style.fontSize = `${DEFAULT_ROTATION_TEXT_FONT_SIZE}px`;
  rotationText.style.lineHeight = "1.2";
  rotationText.style.fontWeight = "bold";
  rotationText.style.display = "block";
  rotationText.style.width = "180px";
  rotationText.style.minWidth = "180px";
  rotationText.style.minHeight = "38px";
  rotationText.style.maxWidth = "none";
  rotationText.style.right = "560px";
  rotationText.style.whiteSpace = "nowrap";
  rotationText.style.overflowWrap = "normal";
  rotationText.style.padding = "3px 6px";
  rotationText.style.background = "rgba(245, 245, 245, 0.96)";
  rotationText.style.border = "1px solid rgba(0, 0, 0, 0.2)";
  rotationText.style.borderRadius = "3px";
  rotationText.style.boxSizing = "border-box";
  rotationText.style.position = "absolute";
  rotationText.style.cursor = "text";
  rotationText.style.userSelect = "text";
  rotationText.style.top = "20px";
  rotationText.style.left = "248px";
  rotationText.setAttribute("role", "listbox");
  rotationText.setAttribute("aria-label", "Rotation Sequence");
  rotationText.setAttribute("tabindex", "0");
  rotationText.setAttribute("contenteditable", "true");
  rotationText.setAttribute("spellcheck", "false");
  rotationText.dataset.empty = "true";
  rotationText.dataset.placeholder = ROTATION_SEQUENCE_PLACEHOLDER;

  const rotationStartTarget = document.createElement("span");

  rotationStartTarget.className = "rotation-start-target";
  rotationStartTarget.setAttribute("aria-hidden", "true");
  rotationStartTarget.contentEditable = "false";
  rotationStartTarget.style.display = "inline-block";
  rotationStartTarget.style.width = "8px";
  rotationStartTarget.style.height = "1em";
  rotationStartTarget.style.cursor = "text";

  const rotationCursor = document.createElement("span");

  rotationCursor.className = "rotation-cursor";
  rotationCursor.setAttribute("aria-hidden", "true");
  rotationCursor.contentEditable = "false";
  rotationCursor.style.display = "none";
  rotationCursor.style.width = "2px";
  rotationCursor.style.height = "1em";
  rotationCursor.style.marginLeft = "3px";
  rotationCursor.style.backgroundColor = "#555";
  rotationCursor.style.verticalAlign = "-0.12em";
  rotationCursor.style.animation =
    "rotation-cursor-blink 900ms step-end infinite";

  rotationText.appendChild(rotationStartTarget);
  rotationText.appendChild(rotationCursor);

  document.body.appendChild(rotationText);

  const startStateButton = document.createElement("button");

  startStateButton.className = "rotation-start-state-control";
  startStateButton.type = "button";
  startStateButton.title = "Start State";
  startStateButton.setAttribute("aria-label", "Start State");
  startStateButton.style.display = "inline-flex";
  startStateButton.style.alignItems = "center";
  startStateButton.style.justifyContent = "center";
  startStateButton.style.position = "absolute";
  startStateButton.style.top = "20px";
  startStateButton.style.left = "198px";
  startStateButton.style.width = "48px";
  startStateButton.style.height = "48px";
  startStateButton.style.minWidth = "48px";
  startStateButton.style.minHeight = "48px";
  startStateButton.style.maxWidth = "48px";
  startStateButton.style.maxHeight = "48px";
  startStateButton.style.padding = "0";
  startStateButton.style.background = "#f5f5f5";
  startStateButton.style.boxSizing = "border-box";
  startStateButton.style.cursor = "pointer";
  addHoverEffect(startStateButton, "#edf4ff");

  const startStateIconImage = document.createElement("img");

  startStateIconImage.src = startStateIcon;
  startStateIconImage.alt = "";
  startStateIconImage.style.width = "22px";
  startStateIconImage.style.height = "22px";
  startStateIconImage.style.display = "block";
  startStateIconImage.style.pointerEvents = "none";
  startStateButton.appendChild(startStateIconImage);
  document.body.appendChild(startStateButton);

  const copyRotationButton = document.createElement("button");

  copyRotationButton.className = "rotation-copy-control";
  copyRotationButton.type = "button";
  copyRotationButton.title = "Copy Rotations To Clipboard";
  copyRotationButton.setAttribute("aria-label", "Copy Rotations To Clipboard");
  copyRotationButton.style.display = "inline-flex";
  copyRotationButton.style.alignItems = "center";
  copyRotationButton.style.justifyContent = "center";
  copyRotationButton.disabled = true;
  copyRotationButton.style.position = "absolute";
  copyRotationButton.style.top = "20px";
  copyRotationButton.style.left = "248px";
  copyRotationButton.style.width = "48px";
  copyRotationButton.style.height = "48px";
  copyRotationButton.style.minWidth = "48px";
  copyRotationButton.style.minHeight = "48px";
  copyRotationButton.style.maxWidth = "48px";
  copyRotationButton.style.maxHeight = "48px";
  copyRotationButton.style.padding = "0";
  copyRotationButton.style.background = "#f5f5f5";
  copyRotationButton.style.fontSize = "22px";
  copyRotationButton.style.lineHeight = "1";
  copyRotationButton.style.boxSizing = "border-box";
  copyRotationButton.style.cursor = "pointer";
  addHoverEffect(copyRotationButton, "#edf4ff");

  const copyIconImage = document.createElement("img");

  copyIconImage.src = copyIcon;
  copyIconImage.alt = "";
  copyIconImage.style.width = "22px";
  copyIconImage.style.height = "22px";
  copyIconImage.style.display = "block";
  copyIconImage.style.pointerEvents = "none";

  copyRotationButton.appendChild(copyIconImage);

  document.body.appendChild(copyRotationButton);

  const undoRotationButton = document.createElement("button");

  undoRotationButton.className = "rotation-undo-control";
  undoRotationButton.type = "button";
  undoRotationButton.title = "Undo Latest Rotation";
  undoRotationButton.setAttribute("aria-label", "Undo Latest Rotation");
  undoRotationButton.style.display = "inline-flex";
  undoRotationButton.style.alignItems = "center";
  undoRotationButton.style.justifyContent = "center";
  undoRotationButton.disabled = true;
  undoRotationButton.style.position = "absolute";
  undoRotationButton.style.top = "70px";
  undoRotationButton.style.left = "248px";
  undoRotationButton.style.width = "48px";
  undoRotationButton.style.height = "48px";
  undoRotationButton.style.minWidth = "48px";
  undoRotationButton.style.minHeight = "48px";
  undoRotationButton.style.maxWidth = "48px";
  undoRotationButton.style.maxHeight = "48px";
  undoRotationButton.style.padding = "0";
  undoRotationButton.style.background = "#f5f5f5";
  undoRotationButton.style.lineHeight = "1";
  undoRotationButton.style.boxSizing = "border-box";
  undoRotationButton.style.cursor = "pointer";
  addHoverEffect(undoRotationButton, "#edf4ff");

  const rotationBlock = {
    text: rotationText,
    copyButton: copyRotationButton,
    undoButton: undoRotationButton,
  };

  const rotationToolbarFrame = document.createElement("div");
  const rotationToolbarOffset = { x: 0, y: 0 };

  rotationToolbarFrame.setAttribute("aria-hidden", "true");
  setStyles(rotationToolbarFrame, {
    position: "absolute",
    display: "none",
    border: "1px solid rgba(0, 0, 0, 0.2)",
    borderRadius: UI_PANEL_BORDER_RADIUS,
    boxSizing: "border-box",
    pointerEvents: "none",
    zIndex: "1",
  });
  document.body.appendChild(rotationToolbarFrame);

  function getRotationTextHeightLimits() {
    const textStyles = getComputedStyle(rotationText);
    const verticalPadding =
      Number.parseFloat(textStyles.paddingTop) +
      Number.parseFloat(textStyles.paddingBottom);
    const verticalBorders =
      Number.parseFloat(textStyles.borderTopWidth) +
      Number.parseFloat(textStyles.borderBottomWidth);
    const maximumContentHeight =
      DEFAULT_ROTATION_TEXT_FONT_SIZE * 1.2 * ROTATION_TEXT_MAX_ROWS + 2;

    return {
      verticalPadding,
      maximumContentHeight,
      maximumBoxHeight: Math.ceil(
        maximumContentHeight + verticalPadding + verticalBorders,
      ),
    };
  }

  function updateRotationToolbarFrame(
    navigationButtons,
    { rotationBlockTop, rotationTextLeft, availableRight },
  ) {
    const elements = [
      startStateButton,
      copyRotationButton,
      undoRotationButton,
      ...navigationButtons,
    ];

    const bounds = elements
      .filter((element) => getComputedStyle(element).display !== "none")
      .map((element) => element.getBoundingClientRect());
    const maximumTextWidth = Math.max(0, availableRight - rotationTextLeft);
    const contentLeft = Math.min(
      rotationTextLeft,
      ...bounds.map((rect) => rect.left),
    );
    const contentRight = Math.max(
      rotationTextLeft + maximumTextWidth,
      ...bounds.map((rect) => rect.right),
    );
    const rotationTextBounds =
      rotationText.style.display !== "none"
        ? rotationText.getBoundingClientRect()
        : null;
    const contentBottomOffset = Math.max(
      ...bounds.map((rect) => rect.bottom + window.scrollY - rotationBlockTop),
      ...(rotationTextBounds
        ? [rotationTextBounds.bottom + window.scrollY - rotationBlockTop]
        : []),
    );
    const frameHeight = contentBottomOffset + ROTATION_TOOLBAR_FRAME_INSET * 2;

    rotationToolbarFrame.style.display = "block";
    rotationToolbarFrame.style.left = `${
      contentLeft + window.scrollX - ROTATION_TOOLBAR_FRAME_INSET
    }px`;
    rotationToolbarFrame.style.top = `${
      rotationBlockTop - ROTATION_TOOLBAR_FRAME_INSET
    }px`;
    rotationToolbarFrame.style.width = `${
      contentRight - contentLeft + ROTATION_TOOLBAR_FRAME_INSET * 2
    }px`;
    rotationToolbarFrame.style.height = `${frameHeight}px`;
  }

  function fitRotationText() {
    if (rotationText.style.display === "none") {
      return;
    }

    rotationText.style.whiteSpace = "nowrap";
    rotationText.style.overflowWrap = "normal";
    rotationText.style.overflowX = "auto";
    rotationText.style.minHeight = "";

    const { verticalPadding, maximumContentHeight, maximumBoxHeight } =
      getRotationTextHeightLimits();

    rotationText.style.maxHeight = `${maximumBoxHeight}px`;
    rotationText.style.overflowY = "auto";

    for (
      let fontSize = DEFAULT_ROTATION_TEXT_FONT_SIZE;
      fontSize >= MIN_ROTATION_TEXT_FONT_SIZE;
      fontSize -= ROTATION_TEXT_FONT_SIZE_STEP
    ) {
      rotationText.style.fontSize = `${fontSize}px`;
      rotationText.style.lineHeight = `${fontSize * 1.2}px`;

      const lineHeight = Number.parseFloat(
        getComputedStyle(rotationText).lineHeight,
      );
      const contentHeight = rotationText.scrollHeight - verticalPadding;

      if (contentHeight <= maximumContentHeight) {
        if (contentHeight > lineHeight + 2) {
          rotationText.style.minHeight = `${maximumBoxHeight}px`;
        }

        return;
      }
    }

    rotationText.style.minHeight = `${maximumBoxHeight}px`;
  }

  function syncRotationBlockLayout() {
    resizeRotationTextControl.button.style.display = "flex";
    resizeRotationTextControl.button.setAttribute(
      "aria-pressed",
      String(rotationText.style.display !== "none"),
    );

    const compactLayout = window.innerWidth <= 900;
    const rightInset = compactLayout ? 12 : 20;
    const compactToolbarTop =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--cube-viewport-height",
        ),
      ) + 12;
    const rotationBlockTop = compactLayout
      ? compactToolbarTop
      : Math.max(20, window.innerHeight - 200) + window.scrollY;
    const navigationButtons = [
      toStartButton,
      previousRotationButton,
      playPauseButton,
      stopRotationButton,
      nextRotationButton,
      toEndButton,
    ];
    const toolbarElements = [
      rotationToolbarFrame,
      rotationText,
      startStateButton,
      copyRotationButton,
      undoRotationButton,
      ...navigationButtons,
      resizeCubeControl.button,
      resizeRotationTextControl.button,
    ];

    for (const element of toolbarElements) {
      element.style.transform = "none";
    }

    const navigationGap = 4;
    const navigationWidth = navigationButtons.reduce(
      (width, button) => width + parseFloat(button.style.width),
      navigationGap * (navigationButtons.length - 1),
    );
    const availableCompactWidth = window.innerWidth - rightInset - 12;
    const actionButtonsWidth =
      parseFloat(startStateButton.style.width) +
      parseFloat(copyRotationButton.style.width) +
      parseFloat(undoRotationButton.style.width) +
      24;
    const actionToNavigationGap = 8;
    const resizeControlReserve = RESIZE_CONTROL_SIZE + RESIZE_CONTROL_GAP;
    const shareCompactRow =
      compactLayout &&
      actionButtonsWidth +
        actionToNavigationGap +
        navigationWidth +
        resizeControlReserve <=
        availableCompactWidth;
    const navigationFitsOneRow =
      navigationWidth + resizeControlReserve <= availableCompactWidth;
    const navigationRows = compactLayout
      ? shareCompactRow || navigationFitsOneRow
        ? [navigationButtons]
        : [
            [toStartButton, previousRotationButton, playPauseButton],
            [stopRotationButton, nextRotationButton, toEndButton],
          ]
      : [navigationButtons];
    const navigationRowOffsets = shareCompactRow
      ? [0]
      : navigationRows.length === 1
        ? [56]
        : [56, 112];
    const historyTopOffset = shareCompactRow
      ? 56
      : navigationRows.length === 1
        ? 112
        : COMPACT_ROTATION_TEXT_TOP_OFFSET;
    const rotationTextTop = compactLayout
      ? rotationBlockTop + historyTopOffset
      : rotationBlockTop + DESKTOP_ROTATION_TEXT_TOP_OFFSET;
    const navigationAnchorOffset =
      parseFloat(toStartButton.style.width) +
      navigationGap +
      parseFloat(previousRotationButton.style.width) +
      navigationGap +
      parseFloat(playPauseButton.style.width) +
      navigationGap / 2;
    const defaultActionButtonsLeft = compactLayout
      ? 12
      : panel.getBoundingClientRect().right + 12;
    let actionButtonsLeft = defaultActionButtonsLeft;
    let availableRight = window.innerWidth - rightInset;

    for (let pass = 0; pass <= controlsRoot.children.length; pass += 1) {
      const rotationTextLeft = compactLayout ? 12 : actionButtonsLeft;

      const rotationTextWidth = Math.max(
        0,
        availableRight -
          rotationTextLeft -
          RESIZE_CONTROL_SIZE -
          RESIZE_CONTROL_GAP,
      );
      rotationText.style.width = `${rotationTextWidth}px`;
      rotationText.style.maxWidth = `${rotationTextWidth}px`;
      fitRotationText();

      const textBottom =
        rotationText.style.display === "none"
          ? rotationBlockTop
          : rotationTextTop + rotationText.getBoundingClientRect().height;
      const toolbarBottom = Math.max(rotationBlockTop + 48, textBottom);
      let nextAvailableRight = window.innerWidth - rightInset;
      let nextActionButtonsLeft = defaultActionButtonsLeft;

      if (!compactLayout) {
        for (const box of controlsRoot.children) {
          const bounds = box.getBoundingClientRect();

          if (
            getComputedStyle(box).display === "none" ||
            bounds.width === 0 ||
            bounds.height === 0
          ) {
            continue;
          }

          if (bounds.left < window.innerWidth / 2) {
            if (
              bounds.bottom <= rotationBlockTop ||
              bounds.top >= toolbarBottom
            ) {
              continue;
            }

            nextActionButtonsLeft = Math.max(
              nextActionButtonsLeft,
              bounds.right + 12,
            );
          } else {
            nextAvailableRight = Math.min(nextAvailableRight, bounds.left - 12);
          }
        }
      }

      if (
        nextAvailableRight >= availableRight &&
        nextActionButtonsLeft <= actionButtonsLeft
      ) {
        break;
      }

      availableRight = Math.min(availableRight, nextAvailableRight);
      actionButtonsLeft = Math.max(actionButtonsLeft, nextActionButtonsLeft);
    }

    const rotationTextLeft = compactLayout ? 12 : actionButtonsLeft;
    const startStateLeft = compactLayout ? 12 : actionButtonsLeft;
    const copyButtonLeft = compactLayout ? 72 : actionButtonsLeft + 56;
    const undoButtonLeft = compactLayout ? 132 : actionButtonsLeft + 112;
    const actionButtonsRight = compactLayout ? 180 : undoButtonLeft + 48;
    const minimumNavigationLeft =
      compactLayout && !shareCompactRow ? 12 : actionButtonsRight + 8;
    const maximumNavigationLeft =
      availableRight - navigationWidth - resizeControlReserve;
    const narrowDesktopToolbar =
      !compactLayout &&
      actionButtonsLeft +
        actionButtonsWidth +
        actionToNavigationGap +
        navigationWidth +
        resizeControlReserve >
        availableRight;
    const centeredNavigationLeft =
      window.innerWidth / 2 - navigationAnchorOffset;
    let navigationLeft = Math.max(
      narrowDesktopToolbar ? actionButtonsLeft : minimumNavigationLeft,
      Math.min(centeredNavigationLeft, maximumNavigationLeft),
    );

    copyRotationButton.style.top = `${rotationBlockTop}px`;
    copyRotationButton.style.left = `${copyButtonLeft}px`;
    startStateButton.style.top = `${rotationBlockTop}px`;
    startStateButton.style.left = `${startStateLeft}px`;
    undoRotationButton.style.top = `${rotationBlockTop}px`;
    undoRotationButton.style.left = `${undoButtonLeft}px`;
    rotationText.style.top = `${
      narrowDesktopToolbar ? rotationBlockTop + 112 : rotationTextTop
    }px`;
    rotationText.style.left = `${rotationTextLeft}px`;
    rotationText.style.right = "auto";
    const rotationTextWidth = Math.max(
      0,
      availableRight -
        rotationTextLeft -
        RESIZE_CONTROL_SIZE -
        RESIZE_CONTROL_GAP,
    );
    rotationText.style.width = `${rotationTextWidth}px`;
    rotationText.style.maxWidth = `${rotationTextWidth}px`;
    fitRotationText();

    const toolbarClearance = compactLayout
      ? Number.parseFloat(getComputedStyle(controlsRoot).rowGap) * 2
      : 0;

    if (compactLayout || narrowDesktopToolbar) {
      for (const [rowIndex, row] of navigationRows.entries()) {
        const rowWidth = row.reduce(
          (width, button) => width + parseFloat(button.style.width),
          navigationGap * (row.length - 1),
        );
        let rowLeft = shareCompactRow
          ? navigationLeft
          : narrowDesktopToolbar
            ? navigationLeft
            : (window.innerWidth - rowWidth) / 2;

        for (const button of row) {
          button.style.top = `${
            rotationBlockTop + navigationRowOffsets[rowIndex]
          }px`;
          button.style.left = `${rowLeft}px`;
          rowLeft += parseFloat(button.style.width) + navigationGap;
        }
      }

      if (compactLayout) {
        controlsRoot.style.paddingTop = "0px";
      }
    } else {
      controlsRoot.style.top = "";
      controlsRoot.style.paddingTop = "";

      for (const button of navigationButtons) {
        const buttonWidth = parseFloat(button.style.width);

        button.style.top = `${rotationBlockTop}px`;
        button.style.left = `${navigationLeft}px`;
        navigationLeft += buttonWidth + navigationGap;
      }
    }

    const startStateTop = Number.parseFloat(startStateButton.style.top);
    const startStateHeight = startStateButton.getBoundingClientRect().height;
    const resizeControlLeft = availableRight - RESIZE_CONTROL_SIZE;

    resizeCubeControl.button.style.top = `${startStateTop}px`;
    resizeCubeControl.button.style.left = `${resizeControlLeft}px`;
    resizeRotationTextControl.button.style.top = `${
      startStateTop + startStateHeight - RESIZE_CONTROL_SIZE
    }px`;
    resizeRotationTextControl.button.style.left = `${resizeControlLeft}px`;

    updateRotationToolbarFrame(navigationButtons, {
      rotationBlockTop,
      rotationTextLeft,
      availableRight,
    });

    if (!compactLayout) {
      const nextOffset = clampRotationToolbarOffset(
        rotationToolbarOffset.x,
        rotationToolbarOffset.y,
      );
      rotationToolbarOffset.x = nextOffset.x;
      rotationToolbarOffset.y = nextOffset.y;
      const translation = `translate(${nextOffset.x}px, ${nextOffset.y}px)`;

      for (const element of toolbarElements) {
        element.style.transform = translation;
      }
    }

    if (compactLayout) {
      controlsRoot.style.top = `${
        rotationToolbarFrame.getBoundingClientRect().bottom + toolbarClearance
      }px`;
    }
  }

  function clampRotationToolbarOffset(x, y) {
    if (window.innerWidth <= 900) {
      return { x: 0, y: 0 };
    }

    const baseLeft =
      Number.parseFloat(rotationToolbarFrame.style.left) - window.scrollX;
    const baseTop =
      Number.parseFloat(rotationToolbarFrame.style.top) - window.scrollY;
    const frameWidth = Number.parseFloat(rotationToolbarFrame.style.width);
    const frameHeight = Number.parseFloat(rotationToolbarFrame.style.height);

    return {
      x: Math.max(
        12 - baseLeft,
        Math.min(x, window.innerWidth - 12 - frameWidth - baseLeft),
      ),
      y: Math.max(
        12 - baseTop,
        Math.min(y, window.innerHeight - 12 - frameHeight - baseTop),
      ),
    };
  }

  let rotationToolbarDragStart = null;
  let suppressToolbarClick = false;

  window.addEventListener(
    "pointerdown",
    (event) => {
      if (
        window.innerWidth <= 900 ||
        (event.target instanceof Element &&
          (event.target.closest("button") ||
            event.target.closest(".rotation-sequence")))
      ) {
        return;
      }

      const bounds = rotationToolbarFrame.getBoundingClientRect();

      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        return;
      }

      rotationToolbarDragStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        offsetX: rotationToolbarOffset.x,
        offsetY: rotationToolbarOffset.y,
        moved: false,
      };
    },
    true,
  );

  window.addEventListener(
    "pointermove",
    (event) => {
      if (rotationToolbarDragStart?.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - rotationToolbarDragStart.x;
      const deltaY = event.clientY - rotationToolbarDragStart.y;

      if (!rotationToolbarDragStart.moved) {
        if (Math.hypot(deltaX, deltaY) < 4) {
          return;
        }

        rotationToolbarDragStart.moved = true;
      }

      event.preventDefault();
      event.stopPropagation();
      const nextOffset = clampRotationToolbarOffset(
        rotationToolbarDragStart.offsetX + deltaX,
        rotationToolbarDragStart.offsetY + deltaY,
      );
      rotationToolbarOffset.x = nextOffset.x;
      rotationToolbarOffset.y = nextOffset.y;
      syncRotationBlockLayout();
    },
    true,
  );

  function finishRotationToolbarDrag(event) {
    if (rotationToolbarDragStart?.pointerId !== event.pointerId) {
      return;
    }

    if (rotationToolbarDragStart.moved) {
      suppressToolbarClick = true;
      window.setTimeout(() => {
        suppressToolbarClick = false;
      }, 0);
    }

    rotationToolbarDragStart = null;
  }

  window.addEventListener("pointerup", finishRotationToolbarDrag, true);
  window.addEventListener("pointercancel", finishRotationToolbarDrag, true);
  window.addEventListener(
    "click",
    (event) => {
      if (!suppressToolbarClick) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      suppressToolbarClick = false;
    },
    true,
  );

  window.addEventListener("scroll", syncRotationBlockLayout, {
    passive: true,
  });

  function setUndoPreview(isPreviewing) {
    const latestEntry = rotationActions.at(-1)?.entry;

    if (!latestEntry) {
      return;
    }

    latestEntry.style.border = isPreviewing
      ? "1px solid #fca5a5"
      : latestEntry === cursorRotationEntry
        ? "1px solid #86efac"
        : "none";
    latestEntry.style.borderRadius =
      isPreviewing || latestEntry === cursorRotationEntry ? "2px" : "";
    latestEntry.style.padding =
      isPreviewing || latestEntry === cursorRotationEntry ? "0 2px" : "";
  }

  undoRotationButton.addEventListener("mouseenter", () => {
    setUndoPreview(true);
  });
  undoRotationButton.addEventListener("mouseleave", () => {
    setUndoPreview(false);
  });

  const undoIconImage = document.createElement("img");

  undoIconImage.src = undoIcon;
  undoIconImage.alt = "";
  undoIconImage.style.width = "22px";
  undoIconImage.style.height = "22px";
  undoIconImage.style.display = "block";
  undoIconImage.style.pointerEvents = "none";

  undoRotationButton.appendChild(undoIconImage);

  document.body.appendChild(undoRotationButton);

  function showRotationStatus() {
    rotationBlock.text.style.display = "block";
    syncRotationBlockLayout();
  }

  function createRotationEntry(moveText) {
    const entry = document.createElement("span");

    entry.className = "rotation-entry";
    entry.contentEditable = "false";
    entry.textContent = moveText;
    entry.setAttribute("role", "option");
    entry.setAttribute("aria-selected", "false");
    entry.style.cursor = "pointer";
    entry.style.color = "#999";
    entry.style.transition = "background-color 120ms ease, color 120ms ease";
    entry.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      setCursorRotationEntry(entry);
    });

    return entry;
  }

  function appendRotationEntry(moveText) {
    const entries = getRotationEntries();
    const entry = createRotationEntry(moveText);

    if (entries.length === 0) {
      rotationText.insertBefore(entry, rotationCursor);
    } else {
      entries.at(-1).after(document.createTextNode(" "), entry);
    }

    rotationText.dataset.empty = "false";

    return entry;
  }

  const rotationActions = [];
  const pendingRotationEntries = [];
  let queuedRotationActions = [];
  let cursorRotationEntry = null;
  let rotationPlaybackState = "idle";
  let rotationStopRequested = false;
  let stopRotationPromise = null;
  const rotationStopWaiters = [];

  function resolveRotationStopWaiters() {
    if (
      rotationPlaybackState !== "stopped" ||
      pendingRotationEntries.length > 0
    ) {
      return;
    }

    while (rotationStopWaiters.length > 0) {
      rotationStopWaiters.shift()();
    }
  }

  function updateRotationMediaControlState() {
    const entries = getRotationEntries();
    const currentCursor = pendingRotationEntries[0] ?? cursorRotationEntry;
    const currentCursorIndex = currentCursor
      ? entries.indexOf(currentCursor)
      : -1;
    const hasRotations = entries.length > 0;
    const isAnimating = rotationPlaybackState === "playing";
    const isPaused = rotationPlaybackState === "paused";
    const isRotationAnimating =
      isAnimating ||
      (pendingRotationEntries.length > 0 && !durationState.paused);
    const isStopped =
      rotationPlaybackState === "idle" || rotationPlaybackState === "stopped";
    const isAtStartPosition = currentCursor === null;
    const isAtLastEntry = currentCursor === entries[entries.length - 1];
    const hasNextRotation =
      currentCursorIndex < entries.length - 1 ||
      queuedRotationActions.some(
        (action) => entries.indexOf(action.entry) > currentCursorIndex,
      );
    const hasActiveRotation = pendingRotationEntries.length > 0;
    const hasQueuedRotations = queuedRotationActions.length > 0;
    const isRebuilding = rebuildInProgress;
    const canEditSequence = !hasActiveRotation && !isAnimating && !isPaused;

    rotationText.contentEditable = String(canEditSequence);

    copyRotationButton.disabled = !hasRotations;
    undoRotationButton.disabled = !hasRotations || hasActiveRotation;
    playPauseButton.style.display = "block";

    for (const entry of entries) {
      entry.setAttribute("aria-selected", String(entry === currentCursor));
    }

    toStartButton.disabled = !hasRotations || isAtStartPosition;
    previousRotationButton.disabled =
      !hasRotations || isAtStartPosition || isRotationAnimating || isRebuilding;
    toEndButton.disabled =
      !hasRotations || (isStopped && isAtLastEntry && !hasActiveRotation);
    nextRotationButton.disabled =
      !hasRotations ||
      !hasNextRotation ||
      isRotationAnimating ||
      hasActiveRotation ||
      isRebuilding;
    playPauseButton.disabled =
      !hasRotations ||
      isRebuilding ||
      (isStopped && isAtLastEntry && !hasActiveRotation && !hasQueuedRotations);
    stopRotationButton.disabled =
      !hasRotations || (!isAnimating && !isPaused) || !hasActiveRotation;

    for (const button of [
      startStateButton,
      copyRotationButton,
      undoRotationButton,
      toStartButton,
      previousRotationButton,
      playPauseButton,
      stopRotationButton,
      nextRotationButton,
      toEndButton,
    ]) {
      button.style.opacity = button.disabled ? "0.5" : "1";
      button.style.cursor = button.disabled ? "not-allowed" : "pointer";
    }
  }

  function setPlayPauseIcon(isPlaying) {
    playPauseButton.querySelector("img").src = isPlaying ? pauseIcon : playIcon;
  }

  function getRotationEntries() {
    return [
      ...rotationText.querySelectorAll(
        "span:not(.rotation-cursor):not(.rotation-start-target)",
      ),
    ];
  }

  function canEditRotationSequence() {
    return (
      pendingRotationEntries.length === 0 &&
      rotationPlaybackState !== "playing" &&
      rotationPlaybackState !== "paused" &&
      !rebuildInProgress
    );
  }

  function getRotationEditorText() {
    return rotationText.textContent
      .replace(/\u00a0/gu, " ")
      .replace(/[\r\n]+/gu, " ");
  }

  function getRotationSelectionOffsets() {
    const selection = window.getSelection();

    if (
      !selection?.rangeCount ||
      !rotationText.contains(selection.anchorNode) ||
      !rotationText.contains(selection.focusNode)
    ) {
      return null;
    }

    function getTextOffset(node, offset) {
      const range = document.createRange();

      range.selectNodeContents(rotationText);
      range.setEnd(node, offset);

      return range.toString().length;
    }

    const anchorOffset = getTextOffset(
      selection.anchorNode,
      selection.anchorOffset,
    );
    const focusOffset = getTextOffset(
      selection.focusNode,
      selection.focusOffset,
    );

    return {
      start: Math.min(anchorOffset, focusOffset),
      end: Math.max(anchorOffset, focusOffset),
      focus: focusOffset,
    };
  }

  function setRotationEditorCaret(textOffset) {
    const selection = window.getSelection();
    const range = document.createRange();
    const nodes = [...rotationText.childNodes];
    let currentOffset = 0;

    for (const [index, node] of nodes.entries()) {
      if (node === rotationStartTarget || node === rotationCursor) {
        continue;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const nextOffset = currentOffset + node.textContent.length;

        if (textOffset <= nextOffset) {
          range.setStart(node, Math.max(0, textOffset - currentOffset));
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }

        currentOffset = nextOffset;
        continue;
      }

      const nodeLength = node.textContent.length;
      const nextOffset = currentOffset + nodeLength;

      if (textOffset <= nextOffset) {
        const isAfterNode = textOffset - currentOffset >= nodeLength;

        range.setStart(rotationText, index + Number(isAfterNode));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }

      currentOffset = nextOffset;
    }

    range.setStart(rotationText, rotationText.childNodes.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function renderRotationEditor(state, actions) {
    rotationStartTarget.textContent = "";
    rotationCursor.textContent = "";
    rotationText.replaceChildren(rotationStartTarget);

    let actionIndex = 0;

    for (const [tokenIndex, token] of state.tokens.entries()) {
      if (tokenIndex > 0) {
        rotationText.appendChild(document.createTextNode(" "));
      }

      if (token === state.draft) {
        rotationText.appendChild(document.createTextNode(token.text));
        continue;
      }

      const action = actions[actionIndex++];
      const entry = createRotationEntry(token.text);

      if (action) {
        action.entry = entry;
      }

      rotationText.appendChild(entry);
    }

    if (state.trailingWhitespace) {
      rotationText.appendChild(document.createTextNode(" "));
    }

    rotationText.appendChild(rotationCursor);
    rotationText.dataset.empty = String(state.tokens.length === 0);
  }

  function getEditedPlaybackBoundary(state, snapshot, previousActions) {
    if (!snapshot) {
      return 0;
    }

    const previousBoundaryCount = snapshot.boundaryCount;
    const previousBoundaryOffset = previousActions
      .slice(0, previousBoundaryCount)
      .map((action) => action.label)
      .join(" ").length;
    let diffStart = 0;

    while (
      diffStart < snapshot.text.length &&
      diffStart < snapshot.nextText.length &&
      snapshot.text[diffStart] === snapshot.nextText[diffStart]
    ) {
      diffStart += 1;
    }

    let commonSuffix = 0;

    while (
      commonSuffix < snapshot.text.length - diffStart &&
      commonSuffix < snapshot.nextText.length - diffStart &&
      snapshot.text[snapshot.text.length - commonSuffix - 1] ===
        snapshot.nextText[snapshot.nextText.length - commonSuffix - 1]
    ) {
      commonSuffix += 1;
    }

    const previousDiffEnd = snapshot.text.length - commonSuffix;
    const nextDiffEnd = snapshot.nextText.length - commonSuffix;
    let nextBoundaryOffset = previousBoundaryOffset;

    if (previousBoundaryOffset > diffStart) {
      if (previousBoundaryOffset >= previousDiffEnd) {
        nextBoundaryOffset += nextDiffEnd - previousDiffEnd;
      } else {
        nextBoundaryOffset = diffStart;
      }
    }

    return Math.min(
      state.moves.length,
      state.tokens.reduce(
        (count, token) =>
          token !== state.draft && token.end <= nextBoundaryOffset
            ? count + 1
            : count,
        0,
      ),
    );
  }

  function restoreRotationEditorSnapshot(snapshot) {
    const state = getRotationSequenceEditorState(
      snapshot.text,
      snapshot.selection.focus,
    );

    if (!state) {
      return;
    }

    renderRotationEditor(state, rotationActions);
    cursorRotationEntry =
      rotationActions[snapshot.boundaryCount - 1]?.entry ?? null;
    queuedRotationActions = rotationActions.slice(snapshot.boundaryCount);
    highlightActiveRotation();
    updateRotationMediaControlState();
    setRotationEditorCaret(snapshot.selection.focus);
  }

  function handleRotationEditorInput(
    snapshot = null,
    editedValue = null,
    editedCaretOffset = null,
  ) {
    const value = editedValue ?? getRotationEditorText();
    const selection = getRotationSelectionOffsets();
    const caretOffset = editedCaretOffset ?? selection?.focus ?? value.length;
    const state = getRotationSequenceEditorState(value, caretOffset);

    if (!state) {
      if (snapshot) {
        restoreRotationEditorSnapshot(snapshot);
      }

      return;
    }

    const previousActions = rotationActions.slice();
    const previousBoundaryCount = cursorRotationEntry
      ? Math.max(getRotationEntries().indexOf(cursorRotationEntry) + 1, 0)
      : 0;
    const nextActions = parseCustomSequence(state.moves.join(" ")).map(
      (move, index) => ({
        label: state.moves[index],
        run: move.run,
        inverse: {
          label: move.inverseLabel,
          run: move.inverse,
        },
      }),
    );

    const nextBoundaryCount = getEditedPlaybackBoundary(
      state,
      snapshot
        ? { ...snapshot, nextText: value }
        : {
            boundaryCount: previousBoundaryCount,
            text: previousActions.map((action) => action.label).join(" "),
            nextText: value,
          },
      previousActions,
    );
    const previousCompleted = previousActions
      .slice(0, previousBoundaryCount)
      .map((action) => action.label);
    const nextCompleted = nextActions
      .slice(0, nextBoundaryCount)
      .map((action) => action.label);
    const completedHistoryChanged =
      previousCompleted.length !== nextCompleted.length ||
      previousCompleted.some((label, index) => label !== nextCompleted[index]);
    const actionHistoryChanged =
      previousActions.length !== nextActions.length ||
      previousActions.some(
        (action, index) => action.label !== nextActions[index]?.label,
      );

    rotationActions.splice(0, rotationActions.length, ...nextActions);
    queuedRotationActions = nextActions.slice(nextBoundaryCount);
    renderRotationEditor(state, nextActions);
    cursorRotationEntry = nextActions[nextBoundaryCount - 1]?.entry ?? null;
    queuedRotationActions = nextActions.slice(nextBoundaryCount);
    rotationText.style.display = "block";
    highlightActiveRotation();
    updateRotationMediaControlState();
    setRotationEditorCaret(caretOffset);
    syncRotationBlockLayout();

    if (actionHistoryChanged) {
      markSetupChanged();
    }

    if (completedHistoryChanged) {
      void rebuildCubeToCursor();
    }
  }

  function captureRotationEditorBeforeInput() {
    const selection = getRotationSelectionOffsets();
    const boundaryCount = cursorRotationEntry
      ? Math.max(getRotationEntries().indexOf(cursorRotationEntry) + 1, 0)
      : 0;

    return {
      text: getRotationEditorText(),
      selection: selection ?? {
        start: 0,
        end: 0,
        focus: getRotationEditorText().length,
      },
      boundaryCount,
    };
  }

  function insertRotationEditorText(text) {
    if (!canEditRotationSequence()) {
      return;
    }

    const snapshot = captureRotationEditorBeforeInput();
    const { start, end } = snapshot.selection;
    const nextText =
      snapshot.text.slice(0, start) + text + snapshot.text.slice(end);

    handleRotationEditorInput(snapshot, nextText, start + text.length);
  }

  function getRotationDeletionRange(snapshot, isBackward) {
    const { start, end } = snapshot.selection;

    if (start !== end) {
      return { start, end };
    }

    const tokens = [...snapshot.text.matchAll(/\S+/gu)].map((match) => ({
      start: match.index,
      end: match.index + match[0].length,
    }));

    if (isBackward) {
      const previousToken = tokens.filter((token) => token.end <= start).at(-1);

      if (previousToken && start <= previousToken.end + 1) {
        return previousToken;
      }

      return start > 0 ? { start: start - 1, end: start } : null;
    }

    const nextToken = tokens.find((token) => token.end > start);

    if (nextToken && start <= nextToken.end) {
      return nextToken;
    }

    return null;
  }

  function deleteRotationEditorText(isBackward) {
    if (!canEditRotationSequence()) {
      return;
    }

    const snapshot = captureRotationEditorBeforeInput();
    const range = getRotationDeletionRange(snapshot, isBackward);

    if (!range) {
      return;
    }

    const nextText =
      snapshot.text.slice(0, range.start) + snapshot.text.slice(range.end);

    handleRotationEditorInput(snapshot, nextText, range.start);
  }

  rotationText.addEventListener("beforeinput", (event) => {
    if (!canEditRotationSequence()) {
      event.preventDefault();
      return;
    }

    if (event.inputType.startsWith("insert")) {
      event.preventDefault();

      if (
        event.inputType === "insertParagraph" ||
        event.inputType === "insertLineBreak"
      ) {
        insertRotationEditorText(" ");
      } else if (event.data !== null) {
        insertRotationEditorText(event.data);
      }

      return;
    }

    if (
      event.inputType === "deleteContentBackward" ||
      event.inputType === "deleteContentForward" ||
      event.inputType === "deleteByCut"
    ) {
      event.preventDefault();
      deleteRotationEditorText(event.inputType !== "deleteContentForward");
      return;
    }

    event.preventDefault();
  });

  rotationText.addEventListener("keydown", (event) => {
    if (!canEditRotationSequence()) {
      if (
        event.key.length === 1 ||
        event.key === "Backspace" ||
        event.key === "Delete"
      ) {
        event.preventDefault();
      }

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      insertRotationEditorText(" ");
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      deleteRotationEditorText(event.key === "Backspace");
    }
  });

  rotationText.addEventListener("paste", (event) => {
    if (!canEditRotationSequence()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    insertRotationEditorText(
      event.clipboardData?.getData("text/plain").replace(/\s+/gu, " ") ?? "",
    );
  });

  rotationText.addEventListener("blur", () => {
    const editorText = getRotationEditorText();
    const editorState = getRotationSequenceEditorState(
      editorText,
      editorText.length,
    );

    if (editorState?.draft) {
      const completedState = getRotationSequenceEditorState(
        rotationActions.map((action) => action.label).join(" "),
        Number.MAX_SAFE_INTEGER,
      );

      if (completedState) {
        renderRotationEditor(completedState, rotationActions);
        const boundaryCount = cursorRotationEntry
          ? Math.max(getRotationEntries().indexOf(cursorRotationEntry) + 1, 0)
          : 0;

        cursorRotationEntry = rotationActions[boundaryCount - 1]?.entry ?? null;
        queuedRotationActions = rotationActions.slice(boundaryCount);
      }
    }

    highlightActiveRotation();
    updateRotationMediaControlState();
    syncRotationBlockLayout();

    window.setTimeout(() => {
      if (
        document.activeElement !== rotationText &&
        canEditRotationSequence()
      ) {
        resumeQueuedRotations();
      }
    }, 0);
  });

  function setCursorRotationEntry(entry) {
    markSetupChanged();
    cursorRotationEntry = entry;
    updateRotationMediaControlState();
    highlightActiveRotation();
    rebuildCubeToCursor();
  }

  function highlightActiveRotation() {
    const activeEntry = pendingRotationEntries[0];
    const cursorEntry = activeEntry ?? cursorRotationEntry;
    const isCursorMode =
      rotationPlaybackState === "idle" || rotationPlaybackState === "stopped";
    const isEditorFocused =
      document.activeElement === rotationText && canEditRotationSequence();
    const entries = getRotationEntries();

    if (isEditorFocused) {
      rotationCursor.style.display = "none";
    } else if (isCursorMode && entries.length > 0) {
      if (cursorEntry) {
        cursorEntry.after(rotationCursor);
      } else {
        rotationStartTarget.after(rotationCursor);
      }
      rotationCursor.style.display = "inline-block";
    } else {
      rotationCursor.style.display = "none";
    }

    for (const entry of entries) {
      const isActive = entry === activeEntry && !isCursorMode;
      const isCursor = entry === cursorEntry;
      const isPending = pendingRotationEntries.includes(entry);
      const isPrepared = queuedRotationActions.some(
        (action) => action.entry === entry,
      );
      const isUndoPending = entry.dataset.undoPending === "true";

      entry.style.color = isPending || isPrepared ? "#999" : "#222";
      entry.style.backgroundColor = isUndoPending ? "#fee2e2" : "transparent";
      entry.style.border = isUndoPending
        ? "1px solid #fca5a5"
        : isCursor
          ? "1px solid #86efac"
          : "none";
      entry.style.borderRadius = isUndoPending || isCursor ? "2px" : "";
      entry.style.padding = isUndoPending || isCursor ? "0 2px" : "";
      entry.style.animation = isUndoPending
        ? "rotation-undo-blink 600ms ease-in-out infinite"
        : isActive
          ? "rotation-entry-blink 600ms ease-in-out infinite"
          : "none";
    }
  }

  rotationStartTarget.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    setCursorRotationEntry(null);
    rotationText.focus({ preventScroll: true });
    if (getRotationEntries().length === 0) {
      setRotationEditorCaret(0);
    }
  });

  rotationText.addEventListener("focus", () => {
    highlightActiveRotation();
  });

  rotationText.addEventListener("pointerdown", (event) => {
    if (event.target !== rotationText) {
      return;
    }

    const entries = getRotationEntries();

    if (entries.length === 0) {
      rotationText.focus({ preventScroll: true });
      setRotationEditorCaret(0);
      return;
    }

    const firstBounds = entries[0].getBoundingClientRect();

    if (event.clientX < firstBounds.left) {
      setCursorRotationEntry(null);
      return;
    }

    const closestEntry = entries.reduce((closest, entry) => {
      const bounds = entry.getBoundingClientRect();
      const closestBounds = closest.getBoundingClientRect();
      const distance = Math.hypot(
        event.clientX - (bounds.left + bounds.width / 2),
        event.clientY - (bounds.top + bounds.height / 2),
      );
      const closestDistance = Math.hypot(
        event.clientX - (closestBounds.left + closestBounds.width / 2),
        event.clientY - (closestBounds.top + closestBounds.height / 2),
      );

      return distance < closestDistance ? entry : closest;
    });

    setCursorRotationEntry(closestEntry);
    rotationText.focus({ preventScroll: true });
  });

  function queueRotationAction(
    action,
    { record = true, display = true, animationEntry = null, onComplete } = {},
  ) {
    if (record) {
      markSetupChanged();
      if (pendingRotationEntries.length === 0) {
        queuedRotationActions = [];
      }
      durationState.stopAfterCurrent = false;
      rotationStopRequested = false;
    }

    const rotationEntry = display ? appendRotationEntry(action.label) : null;
    const activeEntry = animationEntry ?? rotationEntry;

    if (record) {
      action.entry = rotationEntry;
      rotationActions.push(action);
    }

    if (record && pendingRotationEntries.length > 0) {
      queuedRotationActions.push(action);
      copyIconImage.src = copyIcon;
      if (display) {
        showRotationStatus();
      }
      highlightActiveRotation();
      updateRotationMediaControlState();
      return Promise.resolve(false);
    }

    copyIconImage.src = copyIcon;
    if (display) {
      showRotationStatus();
    }
    pendingRotationEntries.push(activeEntry);
    if (!cursorRotationEntry && activeEntry) {
      cursorRotationEntry = activeEntry;
    }
    if (!rotationStopRequested) {
      rotationPlaybackState = "playing";
    }
    durationState.paused = false;
    durationState.pauseStartedAt = null;
    setPlayPauseIcon(true);
    highlightActiveRotation();
    updateRotationMediaControlState();
    markRotationStarted();

    return Promise.resolve(action.run(durationState)).then((completed) => {
      if (rotationEntry) {
        rotationEntry.style.color = "#222";
        rotationEntry.style.backgroundColor = "transparent";
        rotationEntry.style.animation = "none";
      }
      if (completed !== false) {
        cursorRotationEntry = activeEntry ?? rotationEntry;
      } else {
        queuedRotationActions.push(action);
      }
      pendingRotationEntries.shift();
      onComplete?.();
      if (pendingRotationEntries.length === 0) {
        durationState.paused = false;
        durationState.pauseStartedAt = null;

        if (rotationStopRequested) {
          rotationPlaybackState = "stopped";
          setRotationStatus("stopped");
          setPlayPauseIcon(false);
        } else if (queuedRotationActions.length > 0) {
          resumeQueuedRotations();
        } else if (queuedRotationActions.length === 0) {
          rotationPlaybackState = "idle";
          setRotationStatus("idle");
          setPlayPauseIcon(false);
        }
      }
      highlightActiveRotation();
      updateRotationMediaControlState();
      markRotationCompleted();
      resolveRotationStopWaiters();
    });
  }

  function resumeQueuedRotations() {
    if (rotationPlaybackState === "paused") {
      durationState.paused = false;
      rotationPlaybackState = "playing";
      setRotationStatus("playing");
      setPlayPauseIcon(true);
      highlightActiveRotation();
      updateRotationMediaControlState();
      return;
    }

    if (
      pendingRotationEntries.length > 0 ||
      queuedRotationActions.length === 0
    ) {
      return;
    }

    const action = queuedRotationActions.shift();
    rotationStopRequested = false;

    queueRotationAction(action, {
      record: false,
      display: false,
      animationEntry: action.entry,
    });
  }

  function pauseRotationAnimation() {
    if (rotationPlaybackState !== "playing") {
      return;
    }

    durationState.paused = true;
    durationState.pauseStartedAt = performance.now();
    rotationPlaybackState = "paused";
    setRotationStatus("paused");
    setPlayPauseIcon(false);
    highlightActiveRotation();
    updateRotationMediaControlState();
  }

  function resumePausedRotation() {
    if (rotationPlaybackState !== "paused") {
      return;
    }

    durationState.paused = false;
    durationState.pauseStartedAt = null;
    rotationPlaybackState = "playing";
    setRotationStatus("playing");
    setPlayPauseIcon(true);
    highlightActiveRotation();
    updateRotationMediaControlState();
  }

  function stopRotationAfterCurrent() {
    if (rotationPlaybackState === "paused") {
      resumePausedRotation();
    }

    if (rotationPlaybackState !== "playing") {
      return;
    }

    rotationStopRequested = true;
    durationState.stopAfterCurrent = true;
    rotationPlaybackState = "stopped";
    setRotationStatus("stopped");
  }

  function stopRotationAndWait({ force = false, finishWithin = null } = {}) {
    if (pendingRotationEntries.length === 0) {
      return Promise.resolve();
    }

    if (stopRotationPromise) {
      if (force) {
        durationState.cancelCurrentRotation?.();
      }

      return stopRotationPromise;
    }

    const configuredDuration = durationState.value;

    durationState.finishCurrentRotationWithin =
      !force && finishWithin !== null && configuredDuration > finishWithin
        ? finishWithin
        : null;
    durationState.value = NAVIGATION_DURATION;
    stopRotationAfterCurrent();

    stopRotationPromise = new Promise((resolve) => {
      rotationStopWaiters.push(resolve);
    }).finally(() => {
      durationState.value = configuredDuration;
      durationState.finishCurrentRotationWithin = null;
      stopRotationPromise = null;
    });

    if (force) {
      durationState.cancelCurrentRotation?.();
    }

    return stopRotationPromise;
  }

  function finishCurrentRotationForNavigation() {
    return stopRotationAndWait({
      finishWithin: STOP_ROTATION_FINISH_DURATION,
    });
  }

  let rebuildGeneration = 0;
  let rebuildInProgress = false;

  async function rebuildCubeToCursor() {
    const generation = ++rebuildGeneration;
    let prefixLength = 0;

    rebuildInProgress = true;
    updateRotationMediaControlState();

    try {
      await stopRotationAndWait();

      if (generation !== rebuildGeneration) {
        return;
      }

      const entries = getRotationEntries();
      const cursorIndex = cursorRotationEntry
        ? entries.indexOf(cursorRotationEntry)
        : -1;
      prefixLength = Math.max(cursorIndex + 1, 0);
      const rebuildDuration = {
        ...durationState,
        value: NAVIGATION_DURATION,
        paused: false,
        pauseStartedAt: null,
      };

      resetCube();

      for (let index = 0; index < prefixLength; index += 1) {
        await rotationActions[index]?.run(rebuildDuration);

        if (generation !== rebuildGeneration) {
          return;
        }
      }
    } finally {
      if (generation === rebuildGeneration) {
        rebuildInProgress = false;
      }
    }

    if (generation !== rebuildGeneration) {
      return;
    }

    queuedRotationActions = rotationActions.slice(prefixLength);

    highlightActiveRotation();
    updateRotationMediaControlState();
  }

  async function ensureCursorAtEndForInsertion() {
    if (pendingRotationEntries.length > 0) {
      return;
    }

    const entries = getRotationEntries();

    if (entries.length === 0) {
      return;
    }

    const lastEntry = entries.at(-1);

    if (
      cursorRotationEntry === lastEntry &&
      pendingRotationEntries.length === 0 &&
      queuedRotationActions.length === 0 &&
      (rotationPlaybackState === "idle" || rotationPlaybackState === "stopped")
    ) {
      return;
    }

    await stopRotationAndWait();

    if (pendingRotationEntries.length > 0) {
      return;
    }

    const finalEntries = getRotationEntries();
    const finalEntry = finalEntries.at(-1);

    if (!finalEntry || cursorRotationEntry === finalEntry) {
      return;
    }

    cursorRotationEntry = finalEntry;
    highlightActiveRotation();
    updateRotationMediaControlState();
    await rebuildCubeToCursor();
  }

  function removeRotationEntry(entry) {
    if (!entry) {
      return;
    }

    const separator = entry.previousSibling;

    entry.remove();

    if (separator?.nodeType === Node.TEXT_NODE) {
      separator.remove();
    }

    rotationText.dataset.empty = String(
      getRotationEntries().length === 0 && !rotationText.textContent.trim(),
    );
  }

  function clearRotationEntries() {
    for (const entry of getRotationEntries()) {
      removeRotationEntry(entry);
    }
  }

  function getInverseMoveName(moveName) {
    if (moveName.endsWith("'")) {
      return moveName.slice(0, -1);
    }

    if (moveName.endsWith("2")) {
      return moveName;
    }

    return `${moveName}'`;
  }

  function getCurrentFaceletColor(facelet) {
    return (
      facelet?.currentColor ?? facelet?.defaultColor ?? facelet?.color ?? ""
    );
  }

  function getFaceletData(facelet) {
    return facelet?.facelet ?? facelet;
  }

  function getCurrentFaceletRecord(facelet) {
    const faceletData = getFaceletData(facelet);

    return facelets.find(
      (currentFacelet) => currentFacelet.facelet === faceletData,
    );
  }

  function sortFaceletsBySolvedPosition(firstFacelet, secondFacelet) {
    const firstPosition = getFaceletData(firstFacelet).solvedPosition;
    const secondPosition = getFaceletData(secondFacelet).solvedPosition;
    const face = firstFacelet.face;
    const faceAxes = {
      F: ["y", "x"],
      B: ["y", "x"],
      R: ["y", "z"],
      L: ["y", "z"],
      U: ["z", "x"],
      D: ["z", "x"],
    };
    const [rowAxis, columnAxis] = faceAxes[face] ?? ["y", "x"];

    return (
      secondPosition[rowAxis] - firstPosition[rowAxis] ||
      firstPosition[columnAxis] - secondPosition[columnAxis]
    );
  }

  function getCurrentInnerColor(cubie) {
    return (
      cubie?.userData?.currentInnerColor ??
      cubie?.userData?.defaultInnerColor ??
      cubie?.userData?.innerColor ??
      ""
    );
  }

  copyRotationButton.addEventListener("click", async () => {
    const rotationTextValue = rotationActions
      .map((action) => action.label)
      .join(" ");

    copyIconImage.src = copiedIcon;

    try {
      await navigator.clipboard.writeText(rotationTextValue);
    } catch {
      copyIconImage.src = copyIcon;
    }
  });

  undoRotationButton.addEventListener("click", async () => {
    if (pendingRotationEntries.length > 0) {
      return;
    }

    markSetupChanged();

    const latestAction = rotationActions.at(-1);

    if (!latestAction?.entry) {
      return;
    }

    const latestEntry = latestAction.entry;
    const entries = getRotationEntries();
    const entryIndex = entries.indexOf(latestEntry);
    const previousEntry = entryIndex > 0 ? entries[entryIndex - 1] : null;
    const isCubeAtHistoryEnd =
      cursorRotationEntry === latestEntry &&
      pendingRotationEntries.length === 0 &&
      queuedRotationActions.length === 0 &&
      (rotationPlaybackState === "idle" || rotationPlaybackState === "stopped");

    cursorRotationEntry = latestEntry;
    highlightActiveRotation();
    updateRotationMediaControlState();

    if (!isCubeAtHistoryEnd) {
      await rebuildCubeToCursor();
    }

    if (rotationActions.at(-1) !== latestAction) {
      return;
    }

    latestEntry.dataset.undoPending = "true";

    await queueRotationAction(latestAction.inverse, {
      record: false,
      display: false,
      animationEntry: latestEntry,
    });

    rotationActions.pop();
    latestEntry.dataset.undoPending = "false";
    removeRotationEntry(latestEntry);
    cursorRotationEntry = previousEntry;

    rotationBlock.text.style.display = "block";

    syncRotationBlockLayout();
    highlightActiveRotation();
    updateRotationMediaControlState();
  });

  // ============================================================
  // Buttons
  // ============================================================

  const buttonContainer = document.createElement("div");

  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "8px";
  buttonContainer.style.marginBottom = "10px";

  // ============================================================
  // Duration
  // ============================================================

  const durationLabel = createLabel("Duration (seconds)");

  rotationContent.appendChild(durationLabel);

  const durationContainer = document.createElement("div");

  durationContainer.style.display = "flex";
  durationContainer.style.alignItems = "center";
  durationContainer.style.gap = "8px";
  durationContainer.style.marginBottom = "16px";

  const durationSlider = document.createElement("input");

  durationSlider.type = "range";
  durationSlider.min = "0";
  durationSlider.max = "5";
  durationSlider.step = "0.1";
  durationSlider.value = "1";

  durationSlider.style.flex = "1";
  durationSlider.style.minWidth = "0";

  const durationValue = document.createElement("input");

  durationValue.type = "text";
  durationValue.value = "1";
  durationValue.style.width = "40px";
  durationValue.style.boxSizing = "border-box";
  durationValue.style.flexShrink = "0";
  durationValue.style.textAlign = "right";

  const durationUnit = document.createElement("span");

  durationUnit.textContent = "s";

  function updateDurationState() {
    const duration = Number(durationValue.value);

    if (Number.isFinite(duration)) {
      durationState.value = Math.max(duration, 0) * 1000;
    }
  }

  durationSlider.addEventListener("input", () => {
    syncEditValueFromSlider(durationSlider, durationValue);
    updateDurationState();
  });

  durationValue.addEventListener("input", () => {
    const raw = durationValue.value;
    const decimalIndex = raw.indexOf(".");
    const integerPart = (
      decimalIndex === -1 ? raw : raw.slice(0, decimalIndex)
    ).replace(/[^\d]/g, "");
    const fractionalPart = (
      decimalIndex === -1 ? "" : raw.slice(decimalIndex + 1)
    )
      .replace(/[^\d]/g, "")
      .slice(0, 3);
    const normalized = `${integerPart}${decimalIndex === -1 ? "" : `.${fractionalPart}`}`;

    if (raw === "") {
      return;
    }

    if (normalized !== raw) {
      durationValue.value = normalized;
    }

    if (normalized === "" || normalized === ".") {
      return;
    }

    syncSliderFromEditValue(durationSlider, durationValue, Number(normalized));
    updateDurationState();
  });

  durationValue.addEventListener("blur", () => {
    const raw = Number(durationValue.value);
    const duration = Number.isFinite(raw) ? Math.max(raw, 0) : 1;

    const acceptedDuration = syncSliderFromEditValue(
      durationSlider,
      durationValue,
      duration,
    );
    durationValue.value = String(acceptedDuration);
    updateDurationState();
  });

  durationContainer.appendChild(durationSlider);
  durationContainer.appendChild(durationValue);
  durationContainer.appendChild(durationUnit);

  rotationContent.appendChild(durationContainer);

  // ============================================================
  // Moves title
  // ============================================================

  const movesTitle = document.createElement("div");

  movesTitle.textContent = "Moves";
  movesTitle.style.fontSize = "14px";
  movesTitle.style.fontWeight = "bold";
  movesTitle.style.marginBottom = "8px";

  rotationContent.appendChild(movesTitle);

  const stopRotationButton = document.createElement("button");

  stopRotationButton.className = "rotation-control rotation-control-stop";
  stopRotationButton.type = "button";
  stopRotationButton.title = "Stop Rotation";
  stopRotationButton.setAttribute("aria-label", "Stop Rotation");
  stopRotationButton.style.display = "block";
  stopRotationButton.style.position = "absolute";
  stopRotationButton.style.width = "42px";
  stopRotationButton.style.height = "42px";
  stopRotationButton.style.minWidth = "42px";
  stopRotationButton.style.minHeight = "42px";
  stopRotationButton.style.maxWidth = "42px";
  stopRotationButton.style.maxHeight = "42px";
  stopRotationButton.style.padding = "0";
  stopRotationButton.style.border = "0";
  stopRotationButton.style.background = "transparent";
  stopRotationButton.style.boxSizing = "border-box";
  stopRotationButton.style.cursor = "pointer";
  addHoverEffect(stopRotationButton, "rgba(59, 130, 246, 0.1)");

  const stopRotationImage = document.createElement("img");

  stopRotationImage.src = stopIcon;
  stopRotationImage.alt = "";
  stopRotationImage.style.display = "block";
  stopRotationImage.style.width = "48px";
  stopRotationImage.style.height = "48px";
  stopRotationImage.style.pointerEvents = "none";

  stopRotationButton.appendChild(stopRotationImage);
  document.body.appendChild(stopRotationButton);

  stopRotationButton.addEventListener("click", async () => {
    await finishCurrentRotationForNavigation();
  });

  const toEndButton = document.createElement("button");

  toEndButton.className = "rotation-control rotation-control-end";
  toEndButton.type = "button";
  toEndButton.title = "Go To End";
  toEndButton.setAttribute("aria-label", "Go To End");
  toEndButton.style.display = "block";
  toEndButton.style.position = "absolute";
  toEndButton.style.width = "48px";
  toEndButton.style.height = "48px";
  toEndButton.style.minWidth = "48px";
  toEndButton.style.minHeight = "48px";
  toEndButton.style.maxWidth = "48px";
  toEndButton.style.maxHeight = "48px";
  toEndButton.style.padding = "0";
  toEndButton.style.border = "0";
  toEndButton.style.background = "transparent";
  toEndButton.style.boxSizing = "border-box";
  toEndButton.style.cursor = "pointer";
  addHoverEffect(toEndButton, "rgba(59, 130, 246, 0.1)");

  const toEndImage = document.createElement("img");

  toEndImage.src = toEndIcon;
  toEndImage.alt = "";
  toEndImage.style.display = "block";
  toEndImage.style.width = "48px";
  toEndImage.style.height = "48px";
  toEndImage.style.pointerEvents = "none";

  toEndButton.appendChild(toEndImage);
  document.body.appendChild(toEndButton);

  function createResizeControl(label, className, iconSource) {
    const button = document.createElement("button");

    button.className = `rotation-control ${className}`;
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.position = "absolute";
    button.style.width = `${RESIZE_CONTROL_SIZE}px`;
    button.style.height = `${RESIZE_CONTROL_SIZE}px`;
    button.style.minWidth = `${RESIZE_CONTROL_SIZE}px`;
    button.style.minHeight = `${RESIZE_CONTROL_SIZE}px`;
    button.style.maxWidth = `${RESIZE_CONTROL_SIZE}px`;
    button.style.maxHeight = `${RESIZE_CONTROL_SIZE}px`;
    button.style.padding = "0";
    button.style.border = "0";
    button.style.background = "transparent";
    button.style.boxSizing = "border-box";
    button.style.cursor = "pointer";
    addHoverEffect(button, "rgba(59, 130, 246, 0.1)");

    const image = document.createElement("img");

    image.src = iconSource;
    image.alt = "";
    image.style.display = "block";
    image.style.width = `${RESIZE_CONTROL_SIZE}px`;
    image.style.height = `${RESIZE_CONTROL_SIZE}px`;
    image.style.pointerEvents = "none";
    button.appendChild(image);
    document.body.appendChild(button);

    return { button, image };
  }

  const resizeCubeControl = createResizeControl(
    "Collapse The Cube",
    "rotation-resize-cube",
    RESIZE_CUBE_COLLAPSE_ICON,
  );
  resizeCubeControl.button.setAttribute("aria-pressed", "false");

  function updateCubeResizeButton(isCollapsed) {
    const label = isCollapsed ? "Expand The Cube" : "Collapse The Cube";

    resizeCubeControl.button.title = label;
    resizeCubeControl.button.setAttribute("aria-label", label);
    resizeCubeControl.button.setAttribute("aria-pressed", String(isCollapsed));
    resizeCubeControl.image.src = isCollapsed
      ? RESIZE_CUBE_EXPAND_ICON
      : RESIZE_CUBE_COLLAPSE_ICON;
    setCubeViewportCollapsed(isCollapsed);
    syncRotationBlockLayout();
  }

  resizeCubeControl.button.addEventListener("click", () => {
    const isCollapsed =
      resizeCubeControl.button.getAttribute("aria-pressed") !== "true";

    updateCubeResizeButton(isCollapsed);
  });

  const resizeRotationTextControl = createResizeControl(
    "Resize Rotation Text",
    "rotation-resize-text",
    RESIZE_ROTATION_TEXT_ICON,
  );
  resizeRotationTextControl.button.setAttribute("aria-pressed", "false");
  resizeRotationTextControl.button.addEventListener("click", () => {
    rotationText.style.display =
      rotationText.style.display === "none" ? "block" : "none";
    syncRotationBlockLayout();
  });

  toEndButton.addEventListener("click", async () => {
    await finishCurrentRotationForNavigation();

    const entries = getRotationEntries();

    if (entries.length > 0) {
      setCursorRotationEntry(entries.at(-1));
    }
  });

  function createRotationControlButton(icon, title) {
    const button = document.createElement("button");

    button.className = "rotation-control";
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.style.display = "block";
    button.style.position = "absolute";
    button.style.width = stopRotationButton.style.width;
    button.style.height = stopRotationButton.style.height;
    button.style.minWidth = stopRotationButton.style.minWidth;
    button.style.minHeight = stopRotationButton.style.minHeight;
    button.style.maxWidth = stopRotationButton.style.maxWidth;
    button.style.maxHeight = stopRotationButton.style.maxHeight;
    button.style.padding = "0";
    button.style.border = "0";
    button.style.background = "transparent";
    button.style.boxSizing = "border-box";
    button.style.cursor = "pointer";
    addHoverEffect(button, "rgba(59, 130, 246, 0.1)");

    const image = document.createElement("img");

    image.src = icon;
    image.alt = "";
    image.style.display = "block";
    image.style.width = stopRotationImage.style.width;
    image.style.height = stopRotationImage.style.height;
    image.style.pointerEvents = "none";

    button.appendChild(image);
    document.body.appendChild(button);

    return button;
  }

  const playPauseButton = createRotationControlButton(
    playIcon,
    "Play Or Pause Rotation",
  );
  playPauseButton.classList.add("rotation-control-play");

  playPauseButton.addEventListener("click", () => {
    if (rotationPlaybackState === "playing") {
      pauseRotationAnimation();
    } else {
      resumeQueuedRotations();
    }
  });

  const toStartButton = createRotationControlButton(toStartIcon, "Go To Start");
  toStartButton.classList.add("rotation-control-start");
  toStartButton.title = "Go To Solved State";
  toStartButton.setAttribute("aria-label", "Go To Solved State");

  toStartButton.addEventListener("click", async () => {
    await finishCurrentRotationForNavigation();
    setCursorRotationEntry(null);
  });

  const previousRotationButton = createRotationControlButton(
    previousRotationIcon,
    "Previous Rotation",
  );
  previousRotationButton.classList.add("rotation-control-previous");

  async function playNextQueuedRotation() {
    if (
      pendingRotationEntries.length > 0 ||
      queuedRotationActions.length === 0
    ) {
      return false;
    }

    const action = queuedRotationActions.shift();

    rotationStopRequested = true;
    durationState.stopAfterCurrent = true;
    rotationPlaybackState = "playing";

    await queueRotationAction(action, {
      record: false,
      display: false,
      animationEntry: action.entry,
    });

    return true;
  }

  previousRotationButton.addEventListener("click", async () => {
    if (pendingRotationEntries.length > 0 || rebuildInProgress) {
      return;
    }

    const entries = getRotationEntries();
    const cursorIndex = entries.indexOf(cursorRotationEntry);
    const currentAction = rotationActions[cursorIndex];

    if (cursorIndex < 0 || !currentAction?.inverse) {
      return;
    }

    const currentEntry = entries[cursorIndex];
    const previousEntry = entries[cursorIndex - 1] ?? null;

    currentEntry.dataset.undoPending = "true";
    queuedRotationActions.unshift({
      ...currentAction.inverse,
      entry: currentEntry,
    });
    highlightActiveRotation();
    updateRotationMediaControlState();
    markSetupChanged();

    await playNextQueuedRotation();

    currentEntry.dataset.undoPending = "false";
    cursorRotationEntry = previousEntry;
    queuedRotationActions = rotationActions.slice(cursorIndex);
    highlightActiveRotation();
    updateRotationMediaControlState();
  });

  const nextRotationButton = createRotationControlButton(
    nextRotationIcon,
    "Next Rotation",
  );
  nextRotationButton.classList.add("rotation-control-next");

  nextRotationButton.addEventListener("click", async () => {
    await playNextQueuedRotation();
  });

  function setRotationControlVisibility() {
    toStartButton.style.display = "block";
    previousRotationButton.style.display = "block";
    stopRotationButton.style.display = "block";
    nextRotationButton.style.display = "block";
    toEndButton.style.display = "block";
  }

  window.addEventListener("resize", syncRotationBlockLayout);
  syncRotationBlockLayout();
  updateRotationMediaControlState();

  // ============================================================
  // Move type
  // ============================================================

  const moveTypeContainer = document.createElement("div");

  moveTypeContainer.style.display = "flex";
  moveTypeContainer.style.alignItems = "center";
  moveTypeContainer.style.gap = "20px";
  moveTypeContainer.style.marginBottom = "12px";

  let moveType = null;

  // ------------------------------------------------------------
  // Fixed
  // ------------------------------------------------------------

  const fixedLabel = document.createElement("label");

  fixedLabel.style.display = "flex";
  fixedLabel.style.alignItems = "center";
  fixedLabel.style.gap = "7px";
  fixedLabel.style.cursor = "pointer";

  const fixedRadio = document.createElement("input");

  fixedRadio.type = "radio";
  fixedRadio.name = "moveType";
  fixedRadio.value = "fixed";

  const fixedText = document.createElement("span");

  fixedText.textContent = "Fixed";

  fixedLabel.appendChild(fixedRadio);
  fixedLabel.appendChild(fixedText);

  // ------------------------------------------------------------
  // Custom
  // ------------------------------------------------------------

  const customLabel = document.createElement("label");

  customLabel.style.display = "flex";
  customLabel.style.alignItems = "center";
  customLabel.style.gap = "7px";
  customLabel.style.cursor = "pointer";

  const customRadio = document.createElement("input");

  customRadio.type = "radio";
  customRadio.name = "moveType";
  customRadio.value = "custom";

  const customText = document.createElement("span");

  customText.textContent = "Custom";

  customLabel.appendChild(customRadio);
  customLabel.appendChild(customText);

  moveTypeContainer.appendChild(fixedLabel);
  moveTypeContainer.appendChild(customLabel);

  rotationContent.appendChild(moveTypeContainer);

  // ============================================================
  // Fixed move controls
  // ============================================================

  // ============================================================
  // Execute standardized move
  // ============================================================

  let rotationInsertionPromise = Promise.resolve();

  function scheduleRotationInsertion(insertion) {
    const nextInsertion = rotationInsertionPromise.then(insertion, insertion);

    rotationInsertionPromise = nextInsertion.catch(() => {});
    return nextInsertion;
  }

  function executeMove(moveName) {
    const definition = getRotationDefinition(moveName);

    if (!definition) {
      console.warn(`Unknown move: ${moveName}`);
      return;
    }

    return scheduleRotationInsertion(async () => {
      const inverseMoveName = getInverseMoveName(moveName);

      await ensureCursorAtEndForInsertion();

      queueRotationAction({
        label: moveName,
        run: (duration) => rotateMove(moveName, duration),
        inverse: {
          label: inverseMoveName,
          run: (duration) => rotateMove(inverseMoveName, duration),
        },
      });
    });
  }

  const fixedMoveControls = createFixedMoveControls({
    onMoveSelected: executeMove,
  });

  rotationContent.appendChild(fixedMoveControls.root);

  // ============================================================
  // Custom move controls
  // ============================================================

  function getCustomSequenceMoves(value) {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(stripCustomMoveParentheses);
  }

  function parseCustomSequence(value) {
    return getCustomSequenceMoves(value).map((move) => {
      const normalizedMove = normalizeWideMoveName(move);

      if (getRotationDefinition(normalizedMove)) {
        const inverse = getInverseMoveName(normalizedMove);

        return {
          label: move,
          run: (duration) => rotateMove(normalizedMove, duration),
          inverse: (duration) => rotateMove(inverse, duration),
          inverseLabel: getInverseMoveName(move),
        };
      }

      const customMove = parseCustomMove(move);

      const moveName = customMove
        ? normalizeWideMoveName(customMove.moveName)
        : null;

      if (!customMove || !getRotationDefinition(moveName)) {
        return null;
      }

      const angle = customMove.angle;
      const displayedAngle = Math.trunc(normalizeAngle(angle) * 1000) / 1000;
      const rotationAngle = getCustomRotationAngle(moveName, displayedAngle);

      return {
        label: getCustomMoveLabel(customMove.moveName, displayedAngle, {
          preserveEnteredAngle: true,
        }),
        run: (duration) => rotateSlice(moveName, rotationAngle, duration),
        inverse: (duration) => rotateSlice(moveName, -rotationAngle, duration),
        inverseLabel: getCustomMoveLabel(customMove.moveName, -displayedAngle, {
          preserveEnteredAngle: true,
        }),
      };
    });
  }

  const customMoveControls = createCustomMoveControls({
    createLabel,
    sequencePlaceholder: ROTATION_SEQUENCE_PLACEHOLDER,
    scheduleSubmission: scheduleRotationInsertion,
    onInsertRequest: insertRotation,
  });

  rotationContent.appendChild(customMoveControls.root);

  // ============================================================
  // Move type behavior
  // ============================================================

  fixedRadio.addEventListener("change", () => {
    if (!fixedRadio.checked) {
      return;
    }

    moveType = "fixed";

    fixedMoveControls.setVisible(true);
    customMoveControls.setVisible(false);
    syncRotationBlockLayout();
  });

  customRadio.addEventListener("change", () => {
    if (!customRadio.checked) {
      return;
    }

    moveType = "custom";

    fixedMoveControls.setVisible(false);
    customMoveControls.setVisible(true);
    syncRotationBlockLayout();
  });

  // ============================================================
  // View panel
  // ============================================================

  function getViewSettings() {
    return {
      ghostStickersVisibility,
      peekStickersVisibility,
      peekStickersDepth,
      peekStickersHideWhenColor,
    };
  }

  function resetViewState() {
    ghostStickersVisibility = ALWAYS_VISIBLE;
    peekStickersVisibility = ALWAYS_VISIBLE;
    peekStickersDepth = 0.2;
    peekStickersHideWhenColor = "";
    viewPanelController.setSettings(getViewSettings());
    updateGhostStickerVisibility();
    scheduleCubePanelPositionUpdate();
  }

  viewPanelController = createViewPanel({
    panelBackground: UI_PANEL_BACKGROUND,
    panelBorder: UI_PANEL_BORDER,
    panelBorderRadius: UI_PANEL_BORDER_RADIUS,
    panelBoxShadow: UI_PANEL_BOX_SHADOW,
    fontFamily: UI_FONT_FAMILY,
    fontSize: UI_FONT_SIZE,
    initialSettings: getViewSettings(),
    onExpand: () => collapseOtherPanels("view"),
    onLayoutChange: scheduleCubePanelPositionUpdate,
    onReset: () => {
      resetViewState();
      markSetupChanged();
    },
    onViewChange: (setting, value) => {
      if (setting === "ghostStickersVisibility") {
        ghostStickersVisibility = value;
        updateGhostStickerVisibility();
        scene.userData.shouldRefreshHiddenStickerState =
          ghostStickersVisibility !== ALWAYS_VISIBLE ||
          peekStickersVisibility !== ALWAYS_VISIBLE;
      } else if (setting === "peekStickersVisibility") {
        peekStickersVisibility = value;
        updateGhostStickerVisibility();
        scene.userData.shouldRefreshHiddenStickerState =
          ghostStickersVisibility !== ALWAYS_VISIBLE ||
          peekStickersVisibility !== ALWAYS_VISIBLE;
      } else if (setting === "peekStickersDepth") {
        peekStickersDepth = value;
        updateGhostStickerVisibility();
      } else if (setting === "peekStickersHideWhenColor") {
        peekStickersHideWhenColor = value;
      }
    },
    onPeekColorPicked: updateGhostStickerVisibility,
    getColorPreviewValue: (value) => {
      const color = new Color();

      if (!isValidColorValue(value)) {
        return null;
      }

      color.set(value);
      return value;
    },
  });
  viewPanel = viewPanelController.root;

  // ============================================================
  // Colors panel
  // ============================================================

  const colorsPanel = document.createElement("div");

  colorsPanel.style.position = "absolute";
  colorsPanel.style.top = "20px";
  colorsPanel.style.right = "20px";
  colorsPanel.style.width = "280px";
  colorsPanel.style.maxHeight = "calc(100vh - 40px)";
  colorsPanel.style.overflowY = "auto";
  colorsPanel.style.padding = "16px";
  colorsPanel.style.background = UI_PANEL_BACKGROUND;
  colorsPanel.style.borderRadius = UI_PANEL_BORDER_RADIUS;
  colorsPanel.style.boxShadow = UI_PANEL_BOX_SHADOW;
  colorsPanel.style.fontFamily = UI_FONT_FAMILY;
  colorsPanel.style.fontSize = UI_FONT_SIZE;
  colorsPanel.style.boxSizing = "border-box";

  controlsRoot.appendChild(colorsPanel);

  // ============================================================
  // Colors header
  // ============================================================

  const colorsHeader = document.createElement("div");

  colorsHeader.style.display = "flex";
  colorsHeader.style.alignItems = "center";
  colorsHeader.style.justifyContent = "space-between";
  colorsHeader.style.cursor = "pointer";
  colorsHeader.style.userSelect = "none";

  const colorsTitle = document.createElement("div");

  colorsTitle.textContent = "Colors";
  colorsTitle.style.fontSize = "18px";
  colorsTitle.style.fontWeight = "bold";

  const colorsTitleRow = document.createElement("div");

  colorsTitleRow.style.display = "flex";
  colorsTitleRow.style.alignItems = "center";
  colorsTitleRow.style.gap = "6px";

  const resetColorsButton = createResetButton(
    "Reset Colors",
    resetColorsInterface,
  );

  colorsTitleRow.appendChild(resetColorsButton);
  colorsTitleRow.appendChild(colorsTitle);

  const colorsCollapseIcon = document.createElement("span");

  colorsCollapseIcon.textContent = "−";
  colorsCollapseIcon.style.fontSize = "20px";
  colorsCollapseIcon.style.lineHeight = "1";

  colorsHeader.appendChild(colorsTitleRow);
  colorsHeader.appendChild(colorsCollapseIcon);
  colorsHeader.setAttribute("role", "button");
  colorsHeader.setAttribute("aria-expanded", "false");
  colorsHeader.tabIndex = 0;

  controlsRoot.appendChild(colorsPanel);
  controlsRoot.insertBefore(viewPanel, colorsPanel);

  colorsPanel.appendChild(colorsHeader);

  const colorsContent = document.createElement("div");

  colorsContent.id = "colors-panel-content";
  colorsHeader.setAttribute("aria-controls", colorsContent.id);
  colorsContent.style.marginTop = "12px";

  colorsPanel.appendChild(colorsContent);

  let colorsCollapsed = true;
  colorsContent.style.display = "none";
  colorsPanel.style.overflowY = "hidden";
  colorsCollapseIcon.textContent = "+";

  function toggleColorsPanel() {
    colorsCollapsed = !colorsCollapsed;

    if (!colorsCollapsed) {
      collapseOtherPanels("colors");
    }

    colorsContent.style.display = colorsCollapsed ? "none" : "block";

    colorsPanel.style.overflowY = colorsCollapsed ? "hidden" : "auto";

    colorsCollapseIcon.textContent = colorsCollapsed ? "+" : "−";
    colorsHeader.setAttribute("aria-expanded", String(!colorsCollapsed));
    scheduleCubePanelPositionUpdate();
  }

  colorsHeader.addEventListener("click", toggleColorsPanel);
  colorsHeader.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleColorsPanel();
  });

  // ============================================================
  // Facelet color editor
  // ============================================================

  const faceletSections = [
    ["F", "F - Front"],
    ["B", "B - Back"],
    ["R", "R - Right"],
    ["L", "L - Left"],
    ["U", "U - Up"],
    ["D", "D - Down"],
  ];

  const colorInputs = new Map();
  const faceColorControls = new Map();

  function showInvalidColor(preview) {
    preview.style.backgroundColor = "transparent";
    preview.style.backgroundImage = `url(${invalidColorIcon})`;
    preview.style.backgroundSize = "contain";
    preview.style.backgroundRepeat = "no-repeat";
    preview.style.backgroundPosition = "center";
  }

  function isValidColorValue(value) {
    if (value === "") {
      return false;
    }

    const probe = document.createElement("span");

    probe.style.color = value;

    return probe.style.color !== "";
  }

  function getFaceletPositionName(facelet) {
    const faceletData = getFaceletData(facelet);

    if (faceletData.visibilityKey === "outer") {
      return getFaceletLabel(
        faceletData.orientationKey,
        facelet.cubie.userData.faces,
      );
    }

    if (faceletData.name) {
      return faceletData.name;
    }

    const { x, y, z } = facelet.cubie.userData;

    const view = {
      F: {
        row: y,
        column: x,
        rowPositive: "U",
        rowNegative: "D",
        columnPositive: "R",
        columnNegative: "L",
      },
      B: {
        row: y,
        column: x,
        rowPositive: "U",
        rowNegative: "D",
        columnPositive: "L",
        columnNegative: "R",
      },
      R: {
        row: y,
        column: z,
        rowPositive: "U",
        rowNegative: "D",
        columnPositive: "F",
        columnNegative: "B",
      },
      L: {
        row: y,
        column: z,
        rowPositive: "U",
        rowNegative: "D",
        columnPositive: "F",
        columnNegative: "B",
      },
      U: {
        row: z,
        column: x,
        rowPositive: "F",
        rowNegative: "B",
        columnPositive: "R",
        columnNegative: "L",
      },
      D: {
        row: z,
        column: x,
        rowPositive: "F",
        rowNegative: "B",
        columnPositive: "R",
        columnNegative: "L",
      },
    }[facelet.face];

    if (!view) {
      return facelet.name;
    }

    const position = [facelet.face];

    if (view.row !== 0) {
      position.push(view.row > 0 ? view.rowPositive : view.rowNegative);
    }

    if (view.column !== 0) {
      position.push(
        view.column > 0 ? view.columnPositive : view.columnNegative,
      );
    }

    return position.join("");
  }

  function getFaceletSection(facelet) {
    return getFaceletPositionName(facelet).charAt(0);
  }

  const faceletLabels = new Map();

  function getFaceletColorSnapshot(filter = () => true) {
    return facelets
      .filter(filter)
      .map((facelet) => [facelet, getCurrentFaceletColor(facelet)]);
  }

  function restoreFaceletColorSnapshot(snapshot) {
    for (const [facelet, value] of snapshot) {
      const faceletData = getFaceletData(facelet);
      const currentFacelet = getCurrentFaceletRecord(facelet);

      faceletData.currentColor = value;
      faceletData.color = value;

      const controls = colorInputs.get(faceletData);

      if (controls) {
        controls.input.value = value;
        controls.preview.style.backgroundImage = "none";
        controls.preview.style.backgroundColor = value;
      }

      const materialIndex = currentFacelet?.materialIndex;

      if (
        materialIndex !== undefined &&
        currentFacelet.cubie.material[materialIndex]
      ) {
        currentFacelet.cubie.material[materialIndex].color.set(value);
      }
    }

    for (const [face] of faceletSections) {
      updateFaceColorControl(face);
    }

    updateOuterFaceletsControl();
  }

  function createFaceletLabel(facelet) {
    const faceletData = getFaceletData(facelet);
    const canvas = document.createElement("canvas");

    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext("2d");

    context.font = "bold 72px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = 10;
    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.fillStyle = "#111";

    const label = getFaceletPositionName(facelet);

    context.strokeText(label, 128, 128);
    context.fillText(label, 128, 128);

    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new Sprite(material);

    sprite.renderOrder = 10;
    sprite.visible = false;
    sprite.userData.canvas = canvas;
    sprite.userData.labelText = label;
    sprite.userData.labelColor = "#111";
    sprite.userData.context = context;
    facelet.cubie.add(sprite);
    faceletLabels.set(faceletData, sprite);
  }

  function updateFaceletLabelColor(facelet, color) {
    const label = faceletLabels.get(getFaceletData(facelet));

    if (!label) {
      return;
    }

    const context = label.userData.context;

    label.userData.labelColor = color;
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = color;
    context.strokeText(label.userData.labelText, 128, 128);
    context.fillText(label.userData.labelText, 128, 128);
    label.material.map.needsUpdate = true;
  }

  function refreshFaceletLabel(facelet) {
    const label = faceletLabels.get(getFaceletData(facelet));

    if (!label) {
      return;
    }

    const cubieSize = Math.max(
      0,
      (facelet.cubie.userData.currentSize ??
        facelet.cubie.userData.size ??
        size) -
        (facelet.cubie.userData.currentGap ??
          facelet.cubie.userData.gap ??
          gap),
    );
    const normal = facelet.normal ?? getFaceletData(facelet)?.normal;
    const offset = cubieSize / 2 + labelDepth;

    const labelText = getFaceletPositionName(facelet);

    if (label.userData.labelText !== labelText) {
      const context = label.userData.canvas.getContext("2d");

      context.clearRect(0, 0, 256, 256);
      context.strokeText(labelText, 128, 128);
      context.fillText(labelText, 128, 128);
      label.material.map.needsUpdate = true;
      label.userData.labelText = labelText;
    }

    label.position.set(normal.x * offset, normal.y * offset, normal.z * offset);
    label.scale.setScalar(cubieSize * 0.62);
  }

  function refreshFaceletLabels() {
    for (const facelet of facelets) {
      refreshFaceletLabel(facelet);
    }
  }

  for (const facelet of facelets) {
    createFaceletLabel(facelet);
  }

  updateFaceletLabelTransforms = refreshFaceletLabels;

  function createFaceletRow(facelet) {
    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.marginBottom = "5px";

    const name = document.createElement("span");

    name.textContent = `${getFaceletPositionName(facelet)}:`;

    name.style.width = "38px";
    name.style.flexShrink = "0";
    name.style.fontFamily = "monospace";

    const input = document.createElement("input");

    input.type = "text";

    input.value = getCurrentFaceletColor(facelet);

    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.padding = "4px";
    input.style.boxSizing = "border-box";

    const preview = document.createElement("span");

    preview.style.width = "18px";
    preview.style.height = "18px";
    preview.style.borderRadius = "50%";
    preview.style.border = "1px solid #999";
    preview.style.flexShrink = "0";
    preview.style.backgroundColor = input.value;

    function updateColor() {
      const value = input.value.trim();

      const color = new Color();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          showInvalidColor(preview);
        }
        return;
      }

      color.set(value);

      const faceletData = getFaceletData(facelet);
      const currentFacelet = getCurrentFaceletRecord(facelet);

      faceletData.currentColor = value;
      faceletData.color = value;

      const materialIndex = currentFacelet?.materialIndex;

      if (
        materialIndex !== undefined &&
        currentFacelet.cubie.material[materialIndex]
      ) {
        currentFacelet.cubie.material[materialIndex].color.set(value);
      }

      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = value;
      updateFaceColorControl(getFaceletSection(facelet));
      updateOuterFaceletsControl();
    }

    input.addEventListener("input", updateColor);
    input.addEventListener("change", updateColor);
    attachColorPicker({ preview, input, onColorChange: updateColor });

    colorInputs.set(getFaceletData(facelet), {
      input,
      preview,
    });

    row.appendChild(name);
    row.appendChild(input);
    row.appendChild(preview);

    return row;
  }

  function updateFaceColorControl(face) {
    const controls = faceColorControls.get(face);

    if (!controls) {
      return;
    }

    const sectionFacelets = facelets.filter(
      (facelet) => getFaceletSection(facelet) === face,
    );
    const colors = sectionFacelets.map((facelet) => {
      const color = new Color();

      color.set(getCurrentFaceletColor(facelet));
      return color.getHex();
    });

    const firstColor = colors[0];
    const isUniform = colors.every((color) => color === firstColor);

    if (isUniform) {
      const firstFacelet = sectionFacelets[0];

      controls.input.value = firstFacelet
        ? getCurrentFaceletColor(firstFacelet)
        : "";
      controls.input.placeholder = "";
      controls.preview.style.backgroundImage = "none";
      controls.preview.style.backgroundColor = firstFacelet
        ? getCurrentFaceletColor(firstFacelet)
        : "transparent";
    } else {
      controls.input.value = "";
      controls.input.placeholder = "Mixed";
      controls.preview.style.backgroundColor = "transparent";
      controls.preview.style.backgroundImage = `url(${mixedColorIcon})`;
      controls.preview.style.backgroundSize = "contain";
      controls.preview.style.backgroundRepeat = "no-repeat";
      controls.preview.style.backgroundPosition = "center";
    }
  }

  function createFaceColorControl(face) {
    const input = document.createElement("input");

    input.type = "text";
    input.style.width = "70px";
    input.style.padding = "3px";
    input.style.boxSizing = "border-box";

    const preview = document.createElement("span");

    preview.style.width = "18px";
    preview.style.height = "18px";
    preview.style.borderRadius = "50%";
    preview.style.border = "1px solid #999";
    preview.style.flexShrink = "0";
    preview.style.backgroundSize = "contain";
    preview.style.backgroundRepeat = "no-repeat";
    preview.style.backgroundPosition = "center";

    const controls = { input, preview };

    faceColorControls.set(face, controls);

    function applyColor() {
      const value = input.value.trim();
      const color = new Color();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          showInvalidColor(controls.preview);
        }
        return;
      }

      color.set(value);

      const currentFacelets = facelets.filter(
        (facelet) => getFaceletSection(facelet) === face,
      );

      for (const facelet of currentFacelets) {
        const faceletData = getFaceletData(facelet);
        const currentFacelet = getCurrentFaceletRecord(facelet);

        faceletData.currentColor = value;
        faceletData.color = value;

        const faceletControls = colorInputs.get(faceletData);

        if (faceletControls) {
          faceletControls.input.value = value;
          faceletControls.preview.style.backgroundImage = "none";
          faceletControls.preview.style.backgroundColor = value;
        }

        const materialIndex = currentFacelet?.materialIndex;

        if (
          materialIndex !== undefined &&
          currentFacelet.cubie.material[materialIndex]
        ) {
          currentFacelet.cubie.material[materialIndex].color.set(value);
        }
      }

      updateFaceColorControl(face);
      updateOuterFaceletsControl();
    }

    input.addEventListener("input", applyColor);
    input.addEventListener("change", applyColor);
    attachColorPicker({
      preview,
      input,
      onColorChange: applyColor,
      getInitialColor: () =>
        getCurrentFaceletColor(
          facelets.find((facelet) => getFaceletSection(facelet) === face),
        ),
      undo: {
        isAvailable: () => input.placeholder === "Mixed",
        getSnapshot: () =>
          getFaceletColorSnapshot(
            (facelet) => getFaceletSection(facelet) === face,
          ),
        restoreSnapshot: restoreFaceletColorSnapshot,
      },
    });

    return controls;
  }

  function createCollapsibleSection({
    title,
    titleControls = [],
    initiallyExpanded = true,
    headerStyles = {},
    titleStyles = {},
    contentStyles = {},
    getContentId,
  }) {
    const section = document.createElement("div");
    const header = document.createElement("div");
    const titleRow = document.createElement("div");
    const titleLabel = document.createElement("span");
    const content = document.createElement("div");
    const collapseIcon = document.createElement("span");

    let collapsed = !initiallyExpanded;

    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "6px";
    header.style.cursor = "pointer";
    header.style.userSelect = "none";
    Object.assign(header.style, headerStyles);

    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.gap = "6px";
    titleRow.style.flex = "1";
    titleRow.style.minWidth = "0";
    Object.assign(titleRow.style, titleStyles);

    titleLabel.textContent = title;
    styleUiTitle(titleLabel, { container: header });

    collapseIcon.textContent = "−";
    collapseIcon.style.fontSize = "20px";
    collapseIcon.style.lineHeight = "1";
    collapseIcon.style.flexShrink = "0";

    titleRow.appendChild(titleLabel);
    for (const control of titleControls) {
      control.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      control.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      control.addEventListener("keydown", (event) => {
        event.stopPropagation();
      });
      titleRow.appendChild(control);
    }

    header.appendChild(titleRow);
    header.appendChild(collapseIcon);
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");

    content.id = getContentId();
    header.setAttribute("aria-controls", content.id);
    Object.assign(content.style, contentStyles);
    section.appendChild(header);
    section.appendChild(content);

    function updateCollapseState() {
      content.style.display = collapsed ? "none" : "block";
      collapseIcon.textContent = collapsed ? "+" : "−";
      header.setAttribute("aria-expanded", String(!collapsed));
    }

    function toggleCollapse() {
      collapsed = !collapsed;
      updateCollapseState();
      scheduleCubePanelPositionUpdate();
    }

    header.addEventListener("click", toggleCollapse);
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleCollapse();
    });

    updateCollapseState();

    return { section, header, titleRow, content, toggleCollapse, collapseIcon };
  }

  const outerFaceletsInput = document.createElement("input");

  outerFaceletsInput.type = "text";
  outerFaceletsInput.style.width = "70px";
  outerFaceletsInput.style.padding = "3px";
  outerFaceletsInput.style.boxSizing = "border-box";

  const outerFaceletsPreview = document.createElement("span");

  outerFaceletsPreview.style.width = "18px";
  outerFaceletsPreview.style.height = "18px";
  outerFaceletsPreview.style.borderRadius = "50%";
  outerFaceletsPreview.style.border = "1px solid #999";
  outerFaceletsPreview.style.flexShrink = "0";

  function updateOuterFaceletsControl() {
    const colors = facelets.map((facelet) => getCurrentFaceletColor(facelet));
    const firstColor = colors[0];
    const isUniform = colors.every((color) => color === firstColor);

    if (isUniform) {
      outerFaceletsInput.value = firstColor ?? "";
      outerFaceletsInput.placeholder = "";
      outerFaceletsPreview.style.backgroundImage = "none";
      outerFaceletsPreview.style.backgroundColor = firstColor ?? "transparent";
    } else {
      outerFaceletsInput.value = "";
      outerFaceletsInput.placeholder = "Mixed";
      outerFaceletsPreview.style.backgroundColor = "transparent";
      outerFaceletsPreview.style.backgroundImage = `url(${mixedColorIcon})`;
      outerFaceletsPreview.style.backgroundSize = "contain";
      outerFaceletsPreview.style.backgroundRepeat = "no-repeat";
      outerFaceletsPreview.style.backgroundPosition = "center";
    }
  }

  function applyOuterFaceletsColor() {
    const value = outerFaceletsInput.value.trim();
    const color = new Color();

    if (!isValidColorValue(value)) {
      if (value !== "") {
        showInvalidColor(outerFaceletsPreview);
      }
      return;
    }

    color.set(value);

    for (const facelet of facelets) {
      const faceletData = getFaceletData(facelet);
      const currentFacelet = getCurrentFaceletRecord(facelet);

      faceletData.currentColor = value;
      faceletData.color = value;

      const controls = colorInputs.get(faceletData);

      if (controls) {
        controls.input.value = value;
        controls.preview.style.backgroundImage = "none";
        controls.preview.style.backgroundColor = value;
      }

      const materialIndex = currentFacelet?.materialIndex;

      if (
        materialIndex !== undefined &&
        currentFacelet.cubie.material[materialIndex]
      ) {
        currentFacelet.cubie.material[materialIndex].color.set(value);
      }
    }

    for (const [face] of faceletSections) {
      updateFaceColorControl(face);
    }

    updateOuterFaceletsControl();
  }

  outerFaceletsInput.addEventListener("input", applyOuterFaceletsColor);
  outerFaceletsInput.addEventListener("change", applyOuterFaceletsColor);
  attachColorPicker({
    preview: outerFaceletsPreview,
    input: outerFaceletsInput,
    onColorChange: applyOuterFaceletsColor,
    getInitialColor: () =>
      facelets[0] ? getCurrentFaceletColor(facelets[0]) : "#000000",
    undo: {
      isAvailable: () => outerFaceletsInput.placeholder === "Mixed",
      getSnapshot: () => getFaceletColorSnapshot(),
      restoreSnapshot: restoreFaceletColorSnapshot,
    },
  });

  const outerFaceletsSection = createCollapsibleSection({
    title: "Outer Facelets",
    titleControls: [outerFaceletsInput, outerFaceletsPreview],
    headerStyles: {
      marginTop: "14px",
      marginBottom: "7px",
      fontWeight: "bold",
      textAlign: "left",
    },
    contentStyles: { marginTop: "0" },
    getContentId: () => "outer-facelets-panel-content",
  });

  colorsContent.appendChild(outerFaceletsSection.section);
  updateOuterFaceletsControl();

  const outerFaceletsEntries = outerFaceletsSection.content;

  for (const [face, title] of faceletSections) {
    const sectionFacelets = facelets
      .filter((facelet) => getFaceletSection(facelet) === face)
      .sort(sortFaceletsBySolvedPosition);

    const heading = document.createElement("div");

    heading.style.display = "flex";
    heading.style.alignItems = "center";
    heading.style.gap = "6px";
    heading.style.marginTop = "10px";
    heading.style.marginBottom = "7px";

    const headingText = document.createElement("span");

    headingText.textContent = title;
    styleUiTitle(headingText, { container: heading });

    const faceControls = createFaceColorControl(face);

    heading.appendChild(headingText);
    heading.appendChild(faceControls.input);
    heading.appendChild(faceControls.preview);
    outerFaceletsEntries.appendChild(heading);

    for (const facelet of sectionFacelets) {
      outerFaceletsEntries.appendChild(createFaceletRow(facelet));
    }

    updateFaceColorControl(face);
  }

  // ============================================================
  // Inner cubie color editor
  // ============================================================

  const innerInput = document.createElement("input");

  innerInput.type = "text";
  innerInput.style.width = "70px";
  innerInput.style.padding = "3px";
  innerInput.style.boxSizing = "border-box";

  const innerPreview = document.createElement("span");

  innerPreview.style.width = "18px";
  innerPreview.style.height = "18px";
  innerPreview.style.borderRadius = "50%";
  innerPreview.style.border = "1px solid #999";
  innerPreview.style.flexShrink = "0";
  innerPreview.style.backgroundColor = defaultColors.inner;

  const innerSection = createCollapsibleSection({
    title: "Inner",
    titleControls: [innerInput, innerPreview],
    headerStyles: {
      marginTop: "14px",
      marginBottom: "7px",
      fontWeight: "bold",
    },
    contentStyles: { marginTop: "0" },
    getContentId: () => "inner-panel-content",
  });

  colorsContent.appendChild(innerSection.section);

  function getCubiePositionName(cubie) {
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

  function setCubieInnerColor(cubie, value) {
    cubie.userData.currentInnerColor = value;
    cubie.userData.innerColor = value;

    for (const material of cubie.material) {
      material.color.set(value);
    }

    for (const facelet of facelets) {
      if (facelet.cubie !== cubie) {
        continue;
      }

      const faceColor = getCurrentFaceletColor(facelet);

      facelet.cubie.material[facelet.materialIndex].color.set(faceColor);
    }
  }

  function createInnerColorRow(cubie) {
    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.marginBottom = "5px";

    const name = document.createElement("span");

    name.textContent = `${getCubiePositionName(cubie)}:`;
    name.style.width = "38px";
    name.style.flexShrink = "0";
    name.style.fontFamily = "monospace";

    const input = document.createElement("input");

    input.type = "text";
    input.value = getCurrentInnerColor(cubie);
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.padding = "4px";
    input.style.boxSizing = "border-box";

    const preview = document.createElement("span");

    preview.style.width = "18px";
    preview.style.height = "18px";
    preview.style.borderRadius = "50%";
    preview.style.border = "1px solid #999";
    preview.style.flexShrink = "0";
    preview.style.backgroundColor = input.value;

    function updateInnerColor() {
      const value = input.value.trim();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          showInvalidColor(preview);
        }
        return;
      }

      setCubieInnerColor(cubie, value);

      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = value;
      updateInnerHeading();
    }

    input.addEventListener("input", updateInnerColor);
    input.addEventListener("change", updateInnerColor);
    attachColorPicker({ preview, input, onColorChange: updateInnerColor });

    row.appendChild(name);
    row.appendChild(input);
    row.appendChild(preview);

    return { row, input, preview };
  }

  const innerFaceOrder = {
    F: 0,
    B: 1,
    R: 2,
    L: 3,
    U: 4,
    D: 5,
  };

  const sortedInnerCubies = [...cubies].sort((firstCubie, secondCubie) => {
    const firstName = getCubiePositionName(firstCubie);
    const secondName = getCubiePositionName(secondCubie);
    const firstOrder = innerFaceOrder[firstName[0]] ?? 6;
    const secondOrder = innerFaceOrder[secondName[0]] ?? 6;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    const firstPosition = firstCubie.userData;
    const secondPosition = secondCubie.userData;

    return (
      firstPosition.x - secondPosition.x ||
      firstPosition.y - secondPosition.y ||
      firstPosition.z - secondPosition.z
    );
  });

  const innerColorControls = sortedInnerCubies.map((cubie) => {
    const controls = createInnerColorRow(cubie);

    innerSection.content.appendChild(controls.row);

    return { cubie, ...controls };
  });

  function updateInnerHeading() {
    const colors = cubies.map((cubie) => {
      const color = new Color();

      color.set(getCurrentInnerColor(cubie));
      return color.getHex();
    });
    const firstColor = colors[0];
    const isUniform = colors.every((color) => color === firstColor);

    if (isUniform) {
      innerInput.value = cubies[0] ? getCurrentInnerColor(cubies[0]) : "";
      innerInput.placeholder = "";
      innerPreview.style.backgroundImage = "none";
      innerPreview.style.backgroundColor = innerInput.value;
    } else {
      innerInput.value = "";
      innerInput.placeholder = "Mixed";
      innerPreview.style.backgroundColor = "transparent";
      innerPreview.style.backgroundImage = `url(${mixedColorIcon})`;
      innerPreview.style.backgroundSize = "contain";
      innerPreview.style.backgroundRepeat = "no-repeat";
      innerPreview.style.backgroundPosition = "center";
    }
  }

  function applyInnerColor() {
    const value = innerInput.value.trim();

    if (!isValidColorValue(value)) {
      if (value !== "") {
        showInvalidColor(innerPreview);
      }
      return;
    }

    for (const { cubie, input, preview } of innerColorControls) {
      setCubieInnerColor(cubie, value);
      input.value = getCurrentInnerColor(cubie);
      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = getCurrentInnerColor(cubie);
    }

    updateInnerHeading();
  }

  innerInput.addEventListener("input", applyInnerColor);
  innerInput.addEventListener("change", applyInnerColor);
  attachColorPicker({
    preview: innerPreview,
    input: innerInput,
    onColorChange: applyInnerColor,
    undo: {
      isAvailable: () => innerInput.placeholder === "Mixed",
      getSnapshot: () =>
        cubies.map((cubie) => [cubie, getCurrentInnerColor(cubie)]),
      restoreSnapshot: (snapshot) => {
        for (const [cubie, value] of snapshot) {
          setCubieInnerColor(cubie, value);
        }

        for (const { cubie, input, preview } of innerColorControls) {
          input.value = getCurrentInnerColor(cubie);
          preview.style.backgroundImage = "none";
          preview.style.backgroundColor = getCurrentInnerColor(cubie);
        }

        updateInnerHeading();
      },
    },
  });
  updateInnerHeading();

  // ============================================================
  // Facelet label color editor
  // ============================================================

  const defaultFaceletLabelColor = "#111";
  const faceletLabelColorControls = new Map();
  const faceletLabelFaceControls = new Map();

  function getFaceletLabelColor(facelet) {
    return (
      faceletLabels.get(getFaceletData(facelet))?.userData.labelColor ??
      defaultFaceletLabelColor
    );
  }

  function updateFaceletLabelColorControl(facelet) {
    const controls = faceletLabelColorControls.get(getFaceletData(facelet));

    if (!controls) {
      return;
    }

    controls.input.value = getFaceletLabelColor(facelet);
    controls.preview.style.backgroundImage = "none";
    controls.preview.style.backgroundColor = controls.input.value;
  }

  function updateFaceletLabelFaceControl(face) {
    const controls = faceletLabelFaceControls.get(face);

    if (!controls) {
      return;
    }

    const sectionFacelets = facelets.filter(
      (facelet) => getFaceletSection(facelet) === face,
    );
    const colors = sectionFacelets.map((facelet) =>
      getFaceletLabelColor(facelet),
    );
    const firstColor = colors[0];
    const isUniform = colors.every((color) => color === firstColor);

    if (isUniform) {
      controls.input.value = firstColor ?? defaultFaceletLabelColor;
      controls.input.placeholder = "";
      controls.preview.style.backgroundImage = "none";
      controls.preview.style.backgroundColor = controls.input.value;
    } else {
      controls.input.value = "";
      controls.input.placeholder = "Mixed";
      controls.preview.style.backgroundColor = "transparent";
      controls.preview.style.backgroundImage = `url(${mixedColorIcon})`;
      controls.preview.style.backgroundSize = "contain";
      controls.preview.style.backgroundRepeat = "no-repeat";
      controls.preview.style.backgroundPosition = "center";
    }
  }

  function updateFaceletLabelHeading() {
    const colors = facelets.map((facelet) => getFaceletLabelColor(facelet));
    const firstColor = colors[0];
    const isUniform = colors.every((color) => color === firstColor);

    if (isUniform) {
      faceletLabelInput.value = firstColor ?? defaultFaceletLabelColor;
      faceletLabelInput.placeholder = "";
      faceletLabelPreview.style.backgroundImage = "none";
      faceletLabelPreview.style.backgroundColor = faceletLabelInput.value;
    } else {
      faceletLabelInput.value = "";
      faceletLabelInput.placeholder = "Mixed";
      faceletLabelPreview.style.backgroundColor = "transparent";
      faceletLabelPreview.style.backgroundImage = `url(${mixedColorIcon})`;
      faceletLabelPreview.style.backgroundSize = "contain";
      faceletLabelPreview.style.backgroundRepeat = "no-repeat";
      faceletLabelPreview.style.backgroundPosition = "center";
    }
  }

  function createFaceletLabelColorControls(facelet, name) {
    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    row.style.marginBottom = "5px";

    const nameElement = document.createElement("span");

    nameElement.textContent = `Label ${name}:`;
    nameElement.style.width = "95px";
    nameElement.style.flexShrink = "0";
    nameElement.style.fontFamily = "monospace";

    const input = document.createElement("input");

    input.type = "text";
    input.value = getFaceletLabelColor(facelet);
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.padding = "4px";
    input.style.boxSizing = "border-box";

    const preview = document.createElement("span");

    preview.style.width = "18px";
    preview.style.height = "18px";
    preview.style.borderRadius = "50%";
    preview.style.border = "1px solid #999";
    preview.style.flexShrink = "0";
    preview.style.backgroundColor = input.value;

    function applyColor() {
      const value = input.value.trim();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          showInvalidColor(preview);
        }
        return;
      }

      updateFaceletLabelColor(facelet, value);
      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = value;
      updateFaceletLabelFaceControl(getFaceletSection(facelet));
      updateFaceletLabelHeading();
    }

    input.addEventListener("input", applyColor);
    input.addEventListener("change", applyColor);
    attachColorPicker({ preview, input, onColorChange: applyColor });

    faceletLabelColorControls.set(getFaceletData(facelet), {
      input,
      preview,
    });
    row.appendChild(nameElement);
    row.appendChild(input);
    row.appendChild(preview);

    return row;
  }

  const faceletLabelInput = document.createElement("input");

  faceletLabelInput.type = "text";
  faceletLabelInput.style.width = "70px";
  faceletLabelInput.style.padding = "3px";
  faceletLabelInput.style.boxSizing = "border-box";

  const faceletLabelPreview = document.createElement("span");

  faceletLabelPreview.style.width = "18px";
  faceletLabelPreview.style.height = "18px";
  faceletLabelPreview.style.borderRadius = "50%";
  faceletLabelPreview.style.border = "1px solid #999";
  faceletLabelPreview.style.flexShrink = "0";
  faceletLabelPreview.style.backgroundColor = defaultFaceletLabelColor;

  function applyAllFaceletLabelColor() {
    const value = faceletLabelInput.value.trim();

    if (!isValidColorValue(value)) {
      if (value !== "") {
        showInvalidColor(faceletLabelPreview);
      }
      return;
    }

    for (const facelet of facelets) {
      updateFaceletLabelColor(facelet, value);
      updateFaceletLabelColorControl(facelet);
    }

    faceletLabelPreview.style.backgroundImage = "none";
    faceletLabelPreview.style.backgroundColor = value;

    for (const face of faceletSections.map(([sectionFace]) => sectionFace)) {
      updateFaceletLabelFaceControl(face);
    }
  }

  faceletLabelInput.addEventListener("input", applyAllFaceletLabelColor);
  faceletLabelInput.addEventListener("change", applyAllFaceletLabelColor);
  attachColorPicker({
    preview: faceletLabelPreview,
    input: faceletLabelInput,
    onColorChange: applyAllFaceletLabelColor,
    getInitialColor: () => defaultFaceletLabelColor,
    undo: {
      isAvailable: () => faceletLabelInput.placeholder === "Mixed",
      getSnapshot: () =>
        facelets.map((facelet) => [facelet, getFaceletLabelColor(facelet)]),
      restoreSnapshot: (snapshot) => {
        for (const [facelet, color] of snapshot) {
          updateFaceletLabelColor(facelet, color);
          updateFaceletLabelColorControl(facelet);
        }

        for (const [face] of faceletSections) {
          updateFaceletLabelFaceControl(face);
        }

        updateFaceletLabelHeading();
      },
    },
  });

  const faceletLabelsSection = createCollapsibleSection({
    title: "Facelet Labels",
    titleControls: [faceletLabelInput, faceletLabelPreview],
    headerStyles: {
      marginTop: "14px",
      marginBottom: "7px",
      fontWeight: "bold",
    },
    contentStyles: { marginTop: "0" },
    getContentId: () => "facelet-labels-panel-content",
  });

  colorsContent.appendChild(faceletLabelsSection.section);

  for (const [face, title] of faceletSections) {
    const sectionFacelets = facelets
      .filter((facelet) => getFaceletSection(facelet) === face)
      .sort(sortFaceletsBySolvedPosition);
    const heading = document.createElement("div");

    heading.style.display = "flex";
    heading.style.alignItems = "center";
    heading.style.gap = "6px";
    heading.style.fontWeight = "bold";
    heading.style.marginTop = "10px";
    heading.style.marginBottom = "7px";

    const headingText = document.createElement("span");

    headingText.textContent = title;
    styleUiTitle(headingText, { container: heading });

    const input = document.createElement("input");

    input.type = "text";
    input.style.width = "70px";
    input.style.padding = "3px";
    input.style.boxSizing = "border-box";

    const preview = document.createElement("span");

    preview.style.width = "18px";
    preview.style.height = "18px";
    preview.style.borderRadius = "50%";
    preview.style.border = "1px solid #999";
    preview.style.flexShrink = "0";

    const controls = { input, preview };

    faceletLabelFaceControls.set(face, controls);

    function applyFaceletLabelFaceColor() {
      const value = input.value.trim();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          showInvalidColor(preview);
        }
        return;
      }

      for (const facelet of sectionFacelets) {
        updateFaceletLabelColor(facelet, value);
        updateFaceletLabelColorControl(facelet);
      }

      updateFaceletLabelFaceControl(face);
      updateFaceletLabelHeading();
    }

    input.addEventListener("input", applyFaceletLabelFaceColor);
    input.addEventListener("change", applyFaceletLabelFaceColor);
    attachColorPicker({
      preview,
      input,
      onColorChange: applyFaceletLabelFaceColor,
      getInitialColor: () => getFaceletLabelColor(sectionFacelets[0]),
      undo: {
        isAvailable: () => input.placeholder === "Mixed",
        getSnapshot: () =>
          sectionFacelets.map((facelet) => [
            facelet,
            getFaceletLabelColor(facelet),
          ]),
        restoreSnapshot: (snapshot) => {
          for (const [facelet, color] of snapshot) {
            updateFaceletLabelColor(facelet, color);
            updateFaceletLabelColorControl(facelet);
          }

          updateFaceletLabelFaceControl(face);
          updateFaceletLabelHeading();
        },
      },
    });

    heading.appendChild(headingText);
    heading.appendChild(input);
    heading.appendChild(preview);
    faceletLabelsSection.content.appendChild(heading);

    for (const facelet of sectionFacelets) {
      faceletLabelsSection.content.appendChild(
        createFaceletLabelColorControls(
          facelet,
          getFaceletPositionName(facelet),
        ),
      );
    }

    updateFaceletLabelFaceControl(face);
  }

  updateFaceletLabelHeading();

  // ============================================================
  // Default colors
  // ============================================================

  function resetColorsInterface() {
    const faceColors = {
      U: defaultColors.top,
      D: defaultColors.bottom,
      F: defaultColors.front,
      B: defaultColors.back,
      R: defaultColors.right,
      L: defaultColors.left,
    };

    for (const facelet of facelets) {
      const color = faceColors[facelet.face];

      if (!color) {
        continue;
      }

      const faceletData = getFaceletData(facelet);

      faceletData.currentColor = color;
      faceletData.color = color;

      const materialIndex = facelet.materialIndex;

      if (
        materialIndex !== undefined &&
        facelet.cubie.material[materialIndex]
      ) {
        facelet.cubie.material[materialIndex].color.set(color);
      }

      const controls = colorInputs.get(getFaceletData(facelet));

      if (controls) {
        controls.input.value = color;
        controls.preview.style.backgroundColor = color;
      }

      updateFaceColorControl(facelet.face);
      updateOuterFaceletsControl();
    }

    for (const { cubie, input, preview } of innerColorControls) {
      setCubieInnerColor(cubie, defaultColors.inner);
      input.value = defaultColors.inner;
      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = defaultColors.inner;
    }

    updateInnerHeading();

    for (const facelet of facelets) {
      updateFaceletLabelColor(facelet, defaultFaceletLabelColor);
      updateFaceletLabelColorControl(facelet);
    }

    updateFaceletLabelHeading();

    for (const [face] of faceletSections) {
      updateFaceletLabelFaceControl(face);
    }

    axisDefinitions.forEach((axisDefinition, index) => {
      updateAxisLabelColor(index, axisDefinition.color);
      updateRotationArrowColor(index, axisDefinition.color);
    });
    axisLabelColorControls.forEach((control) => control.sync());
    rotationArrowColorControls.forEach((control) => control.sync());
  }

  // ============================================================
  // Labels panel
  // ============================================================

  labelsPanel = document.createElement("div");

  labelsPanel.style.position = "absolute";
  labelsPanel.style.top = "20px";
  labelsPanel.style.right = "20px";
  labelsPanel.style.width = "280px";
  labelsPanel.style.padding = "16px";
  labelsPanel.style.background = UI_PANEL_BACKGROUND;
  labelsPanel.style.borderRadius = UI_PANEL_BORDER_RADIUS;
  labelsPanel.style.boxShadow = UI_PANEL_BOX_SHADOW;
  labelsPanel.style.fontFamily = UI_FONT_FAMILY;
  labelsPanel.style.fontSize = UI_FONT_SIZE;
  labelsPanel.style.boxSizing = "border-box";

  const labelsHeader = document.createElement("div");

  labelsHeader.style.display = "flex";
  labelsHeader.style.alignItems = "center";
  labelsHeader.style.justifyContent = "space-between";
  labelsHeader.style.gap = "8px";
  labelsHeader.style.cursor = "pointer";
  labelsHeader.style.userSelect = "none";
  labelsHeader.style.fontSize = "18px";
  labelsHeader.style.fontWeight = "bold";

  const labelsTitleRow = document.createElement("div");

  labelsTitleRow.style.display = "flex";
  labelsTitleRow.style.alignItems = "center";
  labelsTitleRow.style.gap = "6px";

  function resetLabelsState() {
    showFaceletLabelsCheckbox.checked = false;
    showAxisLabelsCheckbox.checked = false;
    showAxisArrowsCheckbox.checked = false;
    axisGroup.visible = false;
    axisLabelVisibilityControl.style.display = "none";
    setAllAxisLabelVisibility(false);
    axisArrowVisibilityControl.style.display = "none";
    setAllAxisArrowVisibility(false);
    faceletLabelsVisibility = ALWAYS_VISIBLE;
    faceletLabelsVisibilityControl.setVisibilityMode(faceletLabelsVisibility);
    faceletLabelsVisibilityControl.style.display = "none";
    axisLabelsVisibility = ALWAYS_VISIBLE;
    axisLabelsVisibilityControl.setVisibilityMode(axisLabelsVisibility);
    axisLabelsVisibilityControl.style.display = "none";
    axisArrowsVisibility = HIDDEN_BEHIND_CUBE;
    axisArrowsVisibilityControl.setVisibilityMode(axisArrowsVisibility);
    axisArrowsVisibilityControl.style.display = "none";
    rotationArrowsVisibility = ALWAYS_VISIBLE;
    rotationArrowsVisibilityControl.setVisibilityMode(rotationArrowsVisibility);
    rotationArrowsVisibilityControl.style.display = "none";
    updateFaceletLabelsVisibilityMode();
    updateAxisLabelsVisibilityMode();
    updateAxisArrowsVisibilityMode();
    updateRotationArrowsVisibilityMode();
    showRotationArrowsCheckbox.checked = false;
    rotationArrowGroup.visible = false;
    rotationArrowVisibilityControl.style.display = "none";
    updateRotationArrowDirectionControlVisibility();
    rotationArrowRadiusControl.style.display = "none";
    setAllRotationArrowVisibility(true);
    rotationArrowDepthControl.style.display = "none";
    rotationArrowThicknessControl.style.display = "none";
    rotationArrowDepth = DEFAULT_ROTATION_ARROW_DEPTH;
    rotationArrowDepthSlider.value = String(rotationArrowDepth);
    rotationArrowDepthValue.value = String(rotationArrowDepth);
    updateRotationArrowDepth();
    rotationArrowThickness = DEFAULT_ROTATION_ARROW_THICKNESS;
    rotationArrowThicknessSlider.value = String(rotationArrowThickness);
    rotationArrowThicknessValue.value = String(rotationArrowThickness);
    updateRotationArrowThickness();
    rotationArrowRadius = DEFAULT_ROTATION_ARROW_RADIUS;
    rotationArrowRadiusSlider.value = String(rotationArrowRadius);
    rotationArrowRadiusValue.value = String(rotationArrowRadius);
    updateRotationArrowRadius();
    rotationArrowDirection = "clockwise";
    rotationArrowDirectionSelect.value = rotationArrowDirection;
    updateRotationArrowDirection();
    axisLabelNameTitle.style.display = "none";
    axisLabelModeContainer.style.display = "none";
    selectAxisLabelMode("face");
    for (const [face, input] of axisLabelCustomInputs) {
      input.value = face;
      const axisDefinition = axisDefinitions.find(
        (definition) => definition.label.face === face,
      );

      if (axisDefinition) {
        axisDefinition.label.custom = face;
      }
    }
    axisDepthControl.style.display = "none";
    axisDepth = DEFAULT_AXIS_DEPTH;
    axisDepthSlider.value = String(axisDepth);
    axisDepthValue.value = String(axisDepth);
    updateAxisDepth();
    axisLabelDepthControl.style.display = "none";
    axisLabelDepth = DEFAULT_LABEL_DEPTH;
    axisLabelDepthSlider.value = String(axisLabelDepth);
    axisLabelDepthValue.value = String(axisLabelDepth);
    updateAxisLabelDepth();
    labelDepth = DEFAULT_LABEL_DEPTH;
    labelDepthSlider.value = String(labelDepth);
    labelDepthValue.value = String(labelDepth);
    updateFaceletLabelVisibility();
  }

  const resetLabelsButton = createResetButton("Reset Labels", resetLabelsState);

  const labelsTitle = document.createElement("span");

  labelsTitle.textContent = "Labels";
  labelsTitleRow.appendChild(resetLabelsButton);
  labelsTitleRow.appendChild(labelsTitle);
  labelsHeader.appendChild(labelsTitleRow);

  const labelsCollapseIcon = document.createElement("span");

  labelsCollapseIcon.textContent = "+";
  labelsCollapseIcon.style.fontSize = "20px";
  labelsCollapseIcon.style.lineHeight = "1";
  labelsHeader.appendChild(labelsCollapseIcon);

  labelsHeader.setAttribute("role", "button");
  labelsHeader.setAttribute("aria-expanded", "false");
  labelsHeader.tabIndex = 0;

  const labelsContent = document.createElement("div");

  labelsContent.id = "labels-panel-content";
  labelsContent.style.marginTop = "12px";

  let labelsCollapsed = true;
  labelsContent.style.display = "none";

  function toggleLabelsPanel() {
    labelsCollapsed = !labelsCollapsed;

    if (!labelsCollapsed) {
      collapseOtherPanels("labels");
    }

    labelsContent.style.display = labelsCollapsed ? "none" : "block";
    labelsCollapseIcon.textContent = labelsCollapsed ? "+" : "−";
    labelsHeader.setAttribute("aria-expanded", String(!labelsCollapsed));
    scheduleCubePanelPositionUpdate();
  }

  labelsHeader.setAttribute("aria-controls", labelsContent.id);
  labelsHeader.addEventListener("click", toggleLabelsPanel);
  labelsHeader.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleLabelsPanel();
  });

  const showFaceletLabelsLabel = document.createElement("label");

  showFaceletLabelsLabel.style.display = "flex";
  showFaceletLabelsLabel.style.alignItems = "center";
  showFaceletLabelsLabel.style.gap = "7px";
  showFaceletLabelsLabel.style.marginTop = "12px";
  showFaceletLabelsLabel.style.cursor = "pointer";

  const showFaceletLabelsCheckbox = document.createElement("input");

  showFaceletLabelsCheckbox.type = "checkbox";

  const showFaceletLabelsText = document.createElement("span");

  showFaceletLabelsText.textContent = "Show Facelet Labels";
  styleUiTitle(showFaceletLabelsText, {
    container: showFaceletLabelsLabel,
    marginBottom: "0",
  });

  showFaceletLabelsLabel.appendChild(showFaceletLabelsCheckbox);
  showFaceletLabelsLabel.appendChild(showFaceletLabelsText);

  const axisGroup = new Group();
  const axisLength = 1;
  let axisDepth = DEFAULT_AXIS_DEPTH;
  let rotationArrowDepth = DEFAULT_ROTATION_ARROW_DEPTH;
  let rotationArrowThickness = DEFAULT_ROTATION_ARROW_THICKNESS;
  let rotationArrowRadius = DEFAULT_ROTATION_ARROW_RADIUS;
  let rotationArrowDirection = "clockwise";
  let faceletLabelsVisibility = ALWAYS_VISIBLE;
  let axisLabelsVisibility = ALWAYS_VISIBLE;
  let axisArrowsVisibility = HIDDEN_BEHIND_CUBE;
  let rotationArrowsVisibility = ALWAYS_VISIBLE;
  let axisLabelDepth = DEFAULT_LABEL_DEPTH;
  let axisLabelMode = "face";
  const defaultFaceColors = {
    R: defaultColors.right,
    L: defaultColors.left,
    U: defaultColors.top,
    D: defaultColors.bottom,
    F: defaultColors.front,
    B: defaultColors.back,
  };
  const axisDefinitions = [
    {
      direction: new Vector3(1, 0, 0),
      label: { custom: "R", coordinate: "+x", face: "R" },
      color: defaultFaceColors.R,
      depth: DEFAULT_LABEL_DEPTH,
    },
    {
      direction: new Vector3(-1, 0, 0),
      label: { custom: "L", coordinate: "-x", face: "L" },
      color: defaultFaceColors.L,
      depth: DEFAULT_LABEL_DEPTH,
    },
    {
      direction: new Vector3(0, 1, 0),
      label: { custom: "U", coordinate: "+y", face: "U" },
      color: defaultFaceColors.U,
      depth: DEFAULT_LABEL_DEPTH,
    },
    {
      direction: new Vector3(0, -1, 0),
      label: { custom: "D", coordinate: "-y", face: "D" },
      color: defaultFaceColors.D,
      depth: DEFAULT_LABEL_DEPTH,
    },
    {
      direction: new Vector3(0, 0, 1),
      label: { custom: "F", coordinate: "+z", face: "F" },
      color: defaultFaceColors.F,
      depth: DEFAULT_LABEL_DEPTH,
    },
    {
      direction: new Vector3(0, 0, -1),
      label: { custom: "B", coordinate: "-z", face: "B" },
      color: defaultFaceColors.B,
      depth: DEFAULT_LABEL_DEPTH,
    },
  ];

  function getAxisLabelText(axisDefinition) {
    return axisLabelMode === "custom"
      ? axisDefinition.label.custom
      : axisDefinition.label[axisLabelMode];
  }

  function createAxisLabel(axisDefinition) {
    const canvas = document.createElement("canvas");
    const canvasScale = 8;

    canvas.width = 128 * canvasScale;
    canvas.height = 64 * canvasScale;

    const context = canvas.getContext("2d");

    context.font = `bold ${36 * canvasScale}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = axisDefinition.color;
    context.strokeStyle = "rgba(0, 0, 0, 0.9)";
    context.lineWidth = 6 * canvasScale;
    context.lineJoin = "round";
    context.lineCap = "round";
    const labelText = getAxisLabelText(axisDefinition);

    context.strokeText(
      labelText,
      (128 / 2) * canvasScale,
      (64 / 2) * canvasScale,
    );
    context.fillText(
      labelText,
      (128 / 2) * canvasScale,
      (64 / 2) * canvasScale,
    );

    const sprite = new Sprite(
      new SpriteMaterial({
        map: new CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );

    sprite.scale.set(0.45, 0.225, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.context = context;
    sprite.userData.labelColor = axisDefinition.color;
    sprite.userData.axisDefinition = axisDefinition;
    sprite.userData.coordinateLabel = axisDefinition.label.coordinate;
    sprite.userData.faceLabel = axisDefinition.label.face;
    return sprite;
  }

  for (const axisDefinition of axisDefinitions) {
    const guideline = new ArrowHelper(
      axisDefinition.direction,
      axisDefinition.direction.clone().multiplyScalar(axisDepth),
      axisLength,
      0x000000,
      0.165,
      0.095,
    );
    const guidelineLine = guideline.line;
    const guidelineShaftLength = axisLength - 0.165;

    guideline.remove(guidelineLine);
    guideline.line = new Mesh(
      new CylinderGeometry(0.008, 0.008, guidelineShaftLength, 12),
      new MeshBasicMaterial({ color: 0x000000 }),
    );
    guideline.line.position.y = guidelineShaftLength / 2;
    guideline.add(guideline.line);
    const arrow = new ArrowHelper(
      new Vector3(0, 1, 0),
      new Vector3(),
      axisLength,
      axisDefinition.color,
      0.16,
      0.09,
    );
    const axisLabel = createAxisLabel(axisDefinition);

    guideline.line.material.depthWrite = false;
    guideline.cone.material.depthWrite = false;
    guideline.add(arrow);
    guideline.visible = false;
    axisLabel.visible = false;
    axisLabel.position
      .copy(axisDefinition.direction)
      .multiplyScalar(axisLength + axisDefinition.depth);
    axisGroup.add(guideline, axisLabel);
  }

  axisGroup.visible = false;
  scene.add(axisGroup);

  const rotationArrowGroup = new Group();
  const rotationArrowColors = axisDefinitions.map(
    (axisDefinition) => axisDefinition.color,
  );
  const rotationArrowVisibility = axisDefinitions.map(() => true);

  function createRotationArrow(axisDefinition, color) {
    const direction = axisDefinition.direction;
    let firstBasis;
    let secondBasis;

    if (Math.abs(direction.x) === 1) {
      firstBasis = new Vector3(0, 1, 0);
      secondBasis = new Vector3(0, 0, 1);
    } else if (Math.abs(direction.y) === 1) {
      firstBasis = new Vector3(1, 0, 0);
      secondBasis = new Vector3(0, 0, 1);
    } else {
      firstBasis = new Vector3(1, 0, 0);
      secondBasis = new Vector3(0, 1, 0);
    }

    if (firstBasis.clone().cross(secondBasis).dot(direction) < 0) {
      secondBasis.negate();
    }

    const arrow = new Group();
    arrow.userData.color = color;
    arrow.userData.index = axisDefinitions.indexOf(axisDefinition);
    const angleDirection = rotationArrowDirection === "clockwise" ? -1 : 1;

    function addCircularArrow(startAngle, endAngle, segments = 18) {
      const points = [];

      for (let index = 0; index <= segments; index += 1) {
        const angle = startAngle + ((endAngle - startAngle) * index) / segments;
        const point = firstBasis
          .clone()
          .multiplyScalar(Math.cos(angle) * rotationArrowRadius)
          .add(
            secondBasis
              .clone()
              .multiplyScalar(Math.sin(angle) * rotationArrowRadius),
          );

        points.push(point);
      }

      const line = new Mesh(
        new TubeGeometry(
          new CatmullRomCurve3(points, false, "centripetal"),
          segments,
          rotationArrowThickness / 2,
          8,
          false,
        ),
        new MeshBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false,
        }),
      );
      line.renderOrder = 20;

      const arrowPosition = points.at(-1);
      const previousPoint = points.at(-2);
      const arrowDirection = arrowPosition
        .clone()
        .sub(previousPoint)
        .normalize();
      const arrowhead = new ArrowHelper(
        arrowDirection,
        arrowPosition,
        rotationArrowThickness * 10,
        color,
        rotationArrowThickness * 6,
        rotationArrowThickness * 4,
      );
      arrowhead.renderOrder = 20;

      arrow.add(line, arrowhead);
    }

    addCircularArrow(Math.PI * 0.82, Math.PI * (0.82 + angleDirection * 0.74));
    addCircularArrow(
      -Math.PI * 0.18,
      Math.PI * (-0.18 + angleDirection * 0.74),
    );

    arrow.position
      .copy(axisDefinition.direction)
      .multiplyScalar(rotationArrowDepth);
    return arrow;
  }

  axisDefinitions.forEach((axisDefinition, index) => {
    const arrow = createRotationArrow(
      axisDefinition,
      rotationArrowColors[index],
    );

    arrow.visible = rotationArrowVisibility[index];
    rotationArrowGroup.add(arrow);
  });

  function updateRotationArrowGeometry() {
    const colors = rotationArrowGroup.children.map(
      (arrow) => arrow.userData.color,
    );

    rotationArrowGroup.clear();
    axisDefinitions.forEach((axisDefinition, index) => {
      const arrow = createRotationArrow(axisDefinition, colors[index]);

      arrow.visible = rotationArrowVisibility[index];
      rotationArrowGroup.add(arrow);
    });
    updateRotationArrowsVisibilityMode();
  }

  const updateRotationArrowDirection = updateRotationArrowGeometry;
  const updateRotationArrowThickness = updateRotationArrowGeometry;
  const updateRotationArrowRadius = updateRotationArrowGeometry;

  rotationArrowGroup.visible = false;
  scene.add(rotationArrowGroup);

  function updateRotationArrowDepth() {
    for (const [index, axisDefinition] of axisDefinitions.entries()) {
      rotationArrowGroup.children[index].position
        .copy(axisDefinition.direction)
        .multiplyScalar(rotationArrowDepth);
    }
  }

  updateRotationArrowDepth();

  updateAxisHelperScale = () => {
    const scale = Math.max(size * 2.4, 1.5);

    axisGroup.scale.setScalar(scale);
    rotationArrowGroup.scale.setScalar(scale);
  };
  updateAxisHelperScale();

  const axisLabelColorControls = new Map();
  const rotationArrowColorControls = new Map();

  function updateAxisLabelColor(index, color) {
    const label = axisGroup.children[index * 2 + 1];

    label.userData.labelColor = color;
    label.userData.context.fillStyle = color;
    const canvas = label.userData.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    label.userData.context.clearRect(0, 0, canvas.width, canvas.height);
    const labelText = getAxisLabelText(label.userData.axisDefinition);

    label.userData.context.strokeText(labelText, centerX, centerY);
    label.userData.context.fillText(labelText, centerX, centerY);
    label.material.map.needsUpdate = true;
  }

  function updateRotationArrowColor(index, color) {
    const arrow = rotationArrowGroup.children[index];

    arrow.userData.color = color;
    arrow.traverse((object) => {
      if (object.material?.color) {
        object.material.color.set(color);
      }
    });
  }

  function createAxisColorControl(
    title,
    getColor,
    applyColor,
    container = colorsContent,
  ) {
    const heading = document.createElement("div");

    heading.style.display = "flex";
    heading.style.alignItems = "center";
    heading.style.gap = "6px";
    heading.style.marginTop = "10px";
    heading.style.marginBottom = "7px";

    const titleElement = document.createElement("span");

    titleElement.textContent = title;

    const input = document.createElement("input");

    input.type = "text";
    input.style.width = "70px";
    input.style.padding = "3px";
    input.style.boxSizing = "border-box";

    const preview = document.createElement("span");

    preview.style.width = "18px";
    preview.style.height = "18px";
    preview.style.borderRadius = "50%";
    preview.style.border = "1px solid #999";
    preview.style.flexShrink = "0";

    function sync() {
      const color = getColor();

      if (color) {
        input.value = color;
        input.placeholder = "";
        preview.style.backgroundImage = "none";
        preview.style.backgroundColor = color;
      } else {
        input.value = "";
        input.placeholder = "Mixed";
        preview.style.backgroundColor = "transparent";
        preview.style.backgroundImage = `url(${mixedColorIcon})`;
        preview.style.backgroundSize = "contain";
        preview.style.backgroundRepeat = "no-repeat";
        preview.style.backgroundPosition = "center";
      }
    }

    function apply() {
      const value = input.value.trim();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          showInvalidColor(preview);
        }
        return;
      }

      applyColor(value);
      sync();
    }

    input.addEventListener("input", apply);
    input.addEventListener("change", apply);
    attachColorPicker({
      preview,
      input,
      onColorChange: apply,
      getInitialColor: () => getColor() ?? "#111",
    });

    heading.appendChild(titleElement);
    heading.appendChild(input);
    heading.appendChild(preview);
    container.appendChild(heading);

    return { input, preview, sync };
  }

  function getUniformColor(getColor) {
    const colors = axisDefinitions.map((_, index) => getColor(index));
    const firstColor = colors[0];

    return colors.every((color) => color === firstColor) ? firstColor : null;
  }

  const axisLabelOrder = FACE_ORDER;

  function createInlineColorField(
    getColor,
    applyColor,
    getPickerState,
    restorePickerState,
  ) {
    const input = document.createElement("input");
    const preview = document.createElement("span");

    input.type = "text";
    input.style.width = "70px";
    input.style.padding = "3px";
    input.style.boxSizing = "border-box";

    preview.style.width = "18px";
    preview.style.height = "18px";
    preview.style.borderRadius = "50%";
    preview.style.border = "1px solid #999";
    preview.style.flexShrink = "0";

    function sync() {
      const color = getColor();

      if (color) {
        input.value = color;
        input.placeholder = "";
        preview.style.backgroundImage = "none";
        preview.style.backgroundColor = color;
      } else {
        input.value = "";
        input.placeholder = "Mixed";
        preview.style.backgroundColor = "transparent";
        preview.style.backgroundImage = `url(${mixedColorIcon})`;
        preview.style.backgroundSize = "contain";
        preview.style.backgroundRepeat = "no-repeat";
        preview.style.backgroundPosition = "center";
      }
    }

    function handleInput() {
      const value = input.value.trim();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          showInvalidColor(preview);
        }
        return;
      }

      applyColor(value);
      sync();
    }

    input.addEventListener("input", handleInput);
    input.addEventListener("change", handleInput);
    attachColorPicker({
      preview,
      input,
      onColorChange: handleInput,
      getInitialColor: () => getColor() ?? "#111",
      undo: {
        isAvailable: () => input.placeholder === "Mixed",
        getSnapshot: getPickerState,
        restoreSnapshot: restorePickerState,
      },
    });

    sync();

    return { input, preview, sync };
  }

  const axisLabelAllControls = createInlineColorField(
    () =>
      getUniformColor(
        (index) => axisGroup.children[index * 2 + 1].userData.labelColor,
      ),
    (color) => {
      axisDefinitions.forEach((_, index) => updateAxisLabelColor(index, color));
      axisLabelColorControls.forEach((control) => control.sync());
    },
    () =>
      axisDefinitions.map(
        (_, index) => axisGroup.children[index * 2 + 1].userData.labelColor,
      ),
    (snapshot) => {
      snapshot.forEach((color, index) => updateAxisLabelColor(index, color));
      axisLabelColorControls.forEach((control) => control.sync());
    },
  );

  const axisLabelColorSection = createCollapsibleSection({
    title: "Axis Labels",
    titleControls: [axisLabelAllControls.input, axisLabelAllControls.preview],
    headerStyles: {
      marginTop: "14px",
      marginBottom: "7px",
      fontWeight: "bold",
    },
    contentStyles: { marginTop: "0" },
    getContentId: () => "axis-label-color-panel-content",
  });

  const rotationArrowAllControls = createInlineColorField(
    () =>
      getUniformColor(
        (index) => rotationArrowGroup.children[index].userData.color,
      ),
    (color) => {
      axisDefinitions.forEach((_, index) =>
        updateRotationArrowColor(index, color),
      );
      rotationArrowColorControls.forEach((control) => control.sync());
    },
    () =>
      axisDefinitions.map(
        (_, index) => rotationArrowGroup.children[index].userData.color,
      ),
    (snapshot) => {
      snapshot.forEach((color, index) =>
        updateRotationArrowColor(index, color),
      );
      rotationArrowColorControls.forEach((control) => control.sync());
    },
  );

  const rotationArrowSection = createCollapsibleSection({
    title: "Arrows",
    titleControls: [
      rotationArrowAllControls.input,
      rotationArrowAllControls.preview,
    ],
    headerStyles: {
      marginTop: "14px",
      marginBottom: "7px",
      fontWeight: "bold",
    },
    contentStyles: { marginTop: "0" },
    getContentId: () => "rotation-arrow-color-panel-content",
  });

  colorsContent.appendChild(axisLabelColorSection.section);
  colorsContent.appendChild(rotationArrowSection.section);

  axisLabelColorControls.set("all", {
    input: axisLabelAllControls.input,
    preview: axisLabelAllControls.preview,
    sync: axisLabelAllControls.sync,
  });
  rotationArrowColorControls.set("all", {
    input: rotationArrowAllControls.input,
    preview: rotationArrowAllControls.preview,
    sync: rotationArrowAllControls.sync,
  });

  axisLabelOrder.forEach((face) => {
    const index = axisDefinitions.findIndex(
      (axisDefinition) => axisDefinition.label.face === face,
    );

    if (index === -1) {
      return;
    }

    axisLabelColorControls.set(
      index,
      createAxisColorControl(
        `Axis Label ${face}`,
        () => axisGroup.children[index * 2 + 1].userData.labelColor,
        (color) => {
          updateAxisLabelColor(index, color);
          axisLabelColorControls.get("all")?.sync();
        },
        axisLabelColorSection.content,
      ),
    );

    rotationArrowColorControls.set(
      index,
      createAxisColorControl(
        `Arrow ${face}`,
        () => rotationArrowGroup.children[index].userData.color,
        (color) => {
          updateRotationArrowColor(index, color);
          rotationArrowColorControls.get("all")?.sync();
        },
        rotationArrowSection.content,
      ),
    );
  });

  axisLabelColorControls.forEach((control) => control.sync());
  rotationArrowColorControls.forEach((control) => control.sync());

  const showAxisLabelsLabel = document.createElement("label");

  showAxisLabelsLabel.style.display = "flex";
  showAxisLabelsLabel.style.alignItems = "center";
  showAxisLabelsLabel.style.gap = "7px";
  showAxisLabelsLabel.style.marginTop = "12px";
  showAxisLabelsLabel.style.cursor = "pointer";

  const showAxisLabelsCheckbox = document.createElement("input");

  showAxisLabelsCheckbox.type = "checkbox";

  const showAxisLabelsText = document.createElement("span");

  showAxisLabelsText.textContent = "Show Axis Labels";
  styleUiTitle(showAxisLabelsText, {
    container: showAxisLabelsLabel,
    marginBottom: "0",
  });

  showAxisLabelsLabel.appendChild(showAxisLabelsCheckbox);
  showAxisLabelsLabel.appendChild(showAxisLabelsText);

  const axisLabelVisibilityControl = document.createElement("div");

  axisLabelVisibilityControl.style.display = "none";
  axisLabelVisibilityControl.style.marginTop = "8px";
  axisLabelVisibilityControl.style.marginLeft = "22px";

  const axisLabelVisibilityCheckboxes = new Map();
  const axisLabelCustomInputs = new Map();
  const axisLabelCustomMarkers = new Map();

  for (const face of FACE_ORDER) {
    const label = document.createElement("label");

    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "7px";
    label.style.marginBottom = "6px";
    label.style.cursor = "pointer";

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = false;

    const text = document.createElement("span");

    text.textContent = `Show Label ${face}`;
    const asText = document.createElement("span");

    asText.textContent = "as";
    asText.style.visibility = "hidden";

    const customInput = document.createElement("input");

    customInput.type = "text";
    customInput.value = face;
    customInput.style.visibility = "hidden";
    customInput.style.width = "55px";
    customInput.style.padding = "3px";
    customInput.style.boxSizing = "border-box";
    customInput.setAttribute("aria-label", `Custom Label ${face}`);
    customInput.addEventListener("input", () => {
      const axisDefinition = axisDefinitions.find(
        (definition) => definition.label.face === face,
      );

      if (!axisDefinition) {
        return;
      }

      axisDefinition.label.custom = customInput.value;
      updateAxisLabelText();
    });

    label.appendChild(checkbox);
    label.appendChild(text);
    label.appendChild(asText);
    label.appendChild(customInput);
    axisLabelVisibilityControl.appendChild(label);
    axisLabelVisibilityCheckboxes.set(face, checkbox);
    axisLabelCustomInputs.set(face, customInput);
    axisLabelCustomMarkers.set(face, asText);
  }

  const showRotationArrowsLabel = document.createElement("label");

  showRotationArrowsLabel.style.display = "flex";
  showRotationArrowsLabel.style.alignItems = "center";
  showRotationArrowsLabel.style.gap = "7px";
  showRotationArrowsLabel.style.marginTop = "10px";
  showRotationArrowsLabel.style.cursor = "pointer";

  const showRotationArrowsCheckbox = document.createElement("input");

  showRotationArrowsCheckbox.type = "checkbox";

  const showRotationArrowsText = document.createElement("span");

  showRotationArrowsText.textContent = "Show Rotation Arrows";
  styleUiTitle(showRotationArrowsText, {
    container: showRotationArrowsLabel,
    marginBottom: "0",
  });
  showRotationArrowsLabel.appendChild(showRotationArrowsCheckbox);
  showRotationArrowsLabel.appendChild(showRotationArrowsText);

  const rotationArrowVisibilityControl = document.createElement("div");

  rotationArrowVisibilityControl.style.display = "none";
  rotationArrowVisibilityControl.style.marginTop = "8px";
  rotationArrowVisibilityControl.style.marginLeft = "22px";

  const rotationArrowVisibilityCheckboxes = new Map();

  for (const face of FACE_ORDER) {
    const label = document.createElement("label");

    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "7px";
    label.style.marginBottom = "6px";
    label.style.cursor = "pointer";

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = false;

    const text = document.createElement("span");

    text.textContent = `Show Arrow ${face}`;
    label.appendChild(checkbox);
    label.appendChild(text);
    rotationArrowVisibilityControl.appendChild(label);
    rotationArrowVisibilityCheckboxes.set(face, checkbox);
  }

  const rotationArrowDepthControl = document.createElement("div");

  rotationArrowDepthControl.style.display = "none";
  rotationArrowDepthControl.style.marginTop = "10px";

  const rotationArrowDepthLabel = document.createElement("label");

  rotationArrowDepthLabel.textContent = "Rotation Arrow Depth";
  rotationArrowDepthLabel.style.display = "block";
  rotationArrowDepthLabel.style.marginBottom = "5px";

  const rotationArrowDepthSlider = document.createElement("input");

  rotationArrowDepthSlider.type = "range";
  rotationArrowDepthSlider.min = "0";
  rotationArrowDepthSlider.max = "2";
  rotationArrowDepthSlider.step = "0.001";
  rotationArrowDepthSlider.value = String(rotationArrowDepth);
  rotationArrowDepthSlider.style.flex = "1";
  rotationArrowDepthSlider.style.minWidth = "0";
  rotationArrowDepthSlider.setAttribute("aria-label", "Rotation Arrow Depth");

  const rotationArrowDepthValue = document.createElement("input");

  rotationArrowDepthValue.type = "text";
  rotationArrowDepthValue.value = String(rotationArrowDepth);
  rotationArrowDepthValue.style.width = "55px";
  rotationArrowDepthValue.style.boxSizing = "border-box";
  rotationArrowDepthValue.style.textAlign = "center";
  rotationArrowDepthValue.setAttribute(
    "aria-label",
    "Rotation Arrow Depth Value",
  );

  const rotationArrowDepthRow = document.createElement("div");

  rotationArrowDepthRow.style.display = "flex";
  rotationArrowDepthRow.style.alignItems = "center";
  rotationArrowDepthRow.style.gap = "8px";

  rotationArrowDepthControl.appendChild(rotationArrowDepthLabel);
  rotationArrowDepthRow.appendChild(rotationArrowDepthSlider);
  rotationArrowDepthRow.appendChild(rotationArrowDepthValue);
  rotationArrowDepthControl.appendChild(rotationArrowDepthRow);

  const rotationArrowThicknessControl = document.createElement("div");

  rotationArrowThicknessControl.style.display = "none";
  rotationArrowThicknessControl.style.marginTop = "10px";

  const rotationArrowThicknessLabel = document.createElement("label");

  rotationArrowThicknessLabel.textContent = "Rotation Arrow Thickness";
  rotationArrowThicknessLabel.style.display = "block";
  rotationArrowThicknessLabel.style.marginBottom = "5px";

  const rotationArrowThicknessSlider = document.createElement("input");

  rotationArrowThicknessSlider.type = "range";
  rotationArrowThicknessSlider.min = "0.001";
  rotationArrowThicknessSlider.max = "0.1";
  rotationArrowThicknessSlider.step = "0.001";
  rotationArrowThicknessSlider.value = String(rotationArrowThickness);
  rotationArrowThicknessSlider.style.flex = "1";
  rotationArrowThicknessSlider.style.minWidth = "0";
  rotationArrowThicknessSlider.setAttribute(
    "aria-label",
    "Rotation Arrow Thickness",
  );

  const rotationArrowThicknessValue = document.createElement("input");

  rotationArrowThicknessValue.type = "text";
  rotationArrowThicknessValue.value = String(rotationArrowThickness);
  rotationArrowThicknessValue.style.width = "55px";
  rotationArrowThicknessValue.style.boxSizing = "border-box";
  rotationArrowThicknessValue.style.textAlign = "center";
  rotationArrowThicknessValue.setAttribute(
    "aria-label",
    "Rotation Arrow Thickness Value",
  );

  const rotationArrowThicknessRow = document.createElement("div");

  rotationArrowThicknessRow.style.display = "flex";
  rotationArrowThicknessRow.style.alignItems = "center";
  rotationArrowThicknessRow.style.gap = "8px";

  rotationArrowThicknessControl.appendChild(rotationArrowThicknessLabel);
  rotationArrowThicknessRow.appendChild(rotationArrowThicknessSlider);
  rotationArrowThicknessRow.appendChild(rotationArrowThicknessValue);
  rotationArrowThicknessControl.appendChild(rotationArrowThicknessRow);

  const rotationArrowRadiusControl = document.createElement("div");

  rotationArrowRadiusControl.style.display = "none";
  rotationArrowRadiusControl.style.marginTop = "10px";

  const rotationArrowRadiusLabel = document.createElement("label");

  rotationArrowRadiusLabel.textContent = "Rotation Arrow Radius";
  rotationArrowRadiusLabel.style.display = "block";
  rotationArrowRadiusLabel.style.marginBottom = "5px";

  const rotationArrowRadiusSlider = document.createElement("input");

  rotationArrowRadiusSlider.type = "range";
  rotationArrowRadiusSlider.min = "0.1";
  rotationArrowRadiusSlider.max = "2";
  rotationArrowRadiusSlider.step = "0.01";
  rotationArrowRadiusSlider.value = String(rotationArrowRadius);
  rotationArrowRadiusSlider.style.flex = "1";
  rotationArrowRadiusSlider.style.minWidth = "0";
  rotationArrowRadiusSlider.setAttribute("aria-label", "Rotation Arrow Radius");

  const rotationArrowRadiusValue = document.createElement("input");

  rotationArrowRadiusValue.type = "text";
  rotationArrowRadiusValue.value = String(rotationArrowRadius);
  rotationArrowRadiusValue.style.width = "55px";
  rotationArrowRadiusValue.style.boxSizing = "border-box";
  rotationArrowRadiusValue.style.textAlign = "center";
  rotationArrowRadiusValue.setAttribute(
    "aria-label",
    "Rotation Arrow Radius Value",
  );

  const rotationArrowRadiusRow = document.createElement("div");

  rotationArrowRadiusRow.style.display = "flex";
  rotationArrowRadiusRow.style.alignItems = "center";
  rotationArrowRadiusRow.style.gap = "8px";

  rotationArrowRadiusControl.appendChild(rotationArrowRadiusLabel);
  rotationArrowRadiusRow.appendChild(rotationArrowRadiusSlider);
  rotationArrowRadiusRow.appendChild(rotationArrowRadiusValue);
  rotationArrowRadiusControl.appendChild(rotationArrowRadiusRow);

  const rotationArrowDirectionControl = document.createElement("div");

  rotationArrowDirectionControl.style.display = "none";
  rotationArrowDirectionControl.style.marginTop = "10px";

  const rotationArrowDirectionLabel = document.createElement("label");

  rotationArrowDirectionLabel.textContent = "Arrow Direction";
  rotationArrowDirectionLabel.style.display = "block";
  rotationArrowDirectionLabel.style.marginBottom = "5px";

  const rotationArrowDirectionSelect = document.createElement("select");

  rotationArrowDirectionSelect.style.width = "100%";
  rotationArrowDirectionSelect.style.padding = "6px";
  rotationArrowDirectionSelect.style.boxSizing = "border-box";

  for (const optionData of [
    ["clockwise", "Clockwise"],
    ["counter-clockwise", "Counter-Clockwise"],
  ]) {
    const option = document.createElement("option");

    option.value = optionData[0];
    option.textContent = optionData[1];
    rotationArrowDirectionSelect.appendChild(option);
  }

  rotationArrowDirectionSelect.value = rotationArrowDirection;
  rotationArrowDirectionLabel.htmlFor = "rotation-arrow-direction";
  rotationArrowDirectionSelect.id = "rotation-arrow-direction";
  rotationArrowDirectionControl.appendChild(rotationArrowDirectionLabel);
  rotationArrowDirectionControl.appendChild(rotationArrowDirectionSelect);

  const axisLabelNameTitle = document.createElement("div");

  axisLabelNameTitle.textContent = "Label Name";
  axisLabelNameTitle.style.display = "none";
  axisLabelNameTitle.style.marginTop = "10px";
  axisLabelNameTitle.style.fontSize = "14px";
  axisLabelNameTitle.style.fontWeight = "600";
  axisLabelNameTitle.style.color = "#374151";
  axisLabelNameTitle.style.marginBottom = "5px";

  const axisLabelModeContainer = document.createElement("div");

  axisLabelModeContainer.style.display = "none";
  axisLabelModeContainer.style.gap = "16px";

  const customAxisLabel = document.createElement("label");

  customAxisLabel.style.display = "flex";
  customAxisLabel.style.alignItems = "center";
  customAxisLabel.style.gap = "7px";
  customAxisLabel.style.cursor = "pointer";

  const customCheckbox = document.createElement("input");

  customCheckbox.type = "radio";
  customCheckbox.name = "axis-label-mode";
  customCheckbox.value = "custom";

  const customAxisText = document.createElement("span");

  customAxisText.textContent = "Custom";
  customAxisLabel.appendChild(customCheckbox);
  customAxisLabel.appendChild(customAxisText);

  const cartesianLabel = document.createElement("label");

  cartesianLabel.style.display = "flex";
  cartesianLabel.style.alignItems = "center";
  cartesianLabel.style.gap = "7px";
  cartesianLabel.style.cursor = "pointer";

  const cartesianCheckbox = document.createElement("input");

  cartesianCheckbox.type = "radio";
  cartesianCheckbox.name = "axis-label-mode";
  cartesianCheckbox.value = "coordinate";
  cartesianCheckbox.checked = false;

  const cartesianText = document.createElement("span");

  cartesianText.textContent = "Cartesian";
  cartesianLabel.appendChild(cartesianCheckbox);
  cartesianLabel.appendChild(cartesianText);

  const faceLabel = document.createElement("label");

  faceLabel.style.display = "flex";
  faceLabel.style.alignItems = "center";
  faceLabel.style.gap = "7px";
  faceLabel.style.cursor = "pointer";

  const faceCheckbox = document.createElement("input");

  faceCheckbox.type = "radio";
  faceCheckbox.name = "axis-label-mode";
  faceCheckbox.value = "face";
  faceCheckbox.checked = true;

  const faceText = document.createElement("span");

  faceText.textContent = "Face";
  faceLabel.appendChild(faceCheckbox);
  faceLabel.appendChild(faceText);
  axisLabelModeContainer.appendChild(faceLabel);
  axisLabelModeContainer.appendChild(cartesianLabel);
  axisLabelModeContainer.appendChild(customAxisLabel);

  const showAxisArrowsLabel = document.createElement("label");

  showAxisArrowsLabel.style.display = "flex";
  showAxisArrowsLabel.style.alignItems = "center";
  showAxisArrowsLabel.style.gap = "7px";
  showAxisArrowsLabel.style.marginTop = "10px";
  showAxisArrowsLabel.style.cursor = "pointer";

  const showAxisArrowsCheckbox = document.createElement("input");

  showAxisArrowsCheckbox.type = "checkbox";

  const showAxisArrowsText = document.createElement("span");

  showAxisArrowsText.textContent = "Show Axis Arrows";
  styleUiTitle(showAxisArrowsText, {
    container: showAxisArrowsLabel,
    marginBottom: "0",
  });
  showAxisArrowsLabel.appendChild(showAxisArrowsCheckbox);
  showAxisArrowsLabel.appendChild(showAxisArrowsText);

  const axisArrowVisibilityControl = document.createElement("div");

  axisArrowVisibilityControl.style.display = "none";
  axisArrowVisibilityControl.style.marginTop = "8px";
  axisArrowVisibilityControl.style.marginLeft = "22px";

  const axisArrowVisibilityCheckboxes = new Map();

  for (const face of FACE_ORDER) {
    const label = document.createElement("label");

    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "7px";
    label.style.marginBottom = "6px";
    label.style.cursor = "pointer";

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = false;

    const text = document.createElement("span");

    text.textContent = `Show Axis ${face}`;
    label.appendChild(checkbox);
    label.appendChild(text);
    axisArrowVisibilityControl.appendChild(label);
    axisArrowVisibilityCheckboxes.set(face, checkbox);
  }

  const axisDepthControl = document.createElement("div");

  axisDepthControl.style.display = "none";
  axisDepthControl.style.marginTop = "10px";

  const axisDepthLabel = document.createElement("label");

  axisDepthLabel.textContent = "Axis Arrow Depth";
  axisDepthLabel.style.display = "block";
  axisDepthLabel.style.marginBottom = "5px";

  const axisDepthSlider = document.createElement("input");

  axisDepthSlider.type = "range";
  axisDepthSlider.min = "0";
  axisDepthSlider.max = "1";
  axisDepthSlider.step = "0.001";
  axisDepthSlider.value = String(axisDepth);
  axisDepthSlider.style.flex = "1";
  axisDepthSlider.style.minWidth = "0";
  axisDepthSlider.setAttribute("aria-label", "Axis Arrow Depth");

  const axisDepthValue = document.createElement("input");

  axisDepthValue.type = "text";
  axisDepthValue.value = String(axisDepth);
  axisDepthValue.style.width = "55px";
  axisDepthValue.style.boxSizing = "border-box";
  axisDepthValue.style.textAlign = "center";
  axisDepthValue.setAttribute("aria-label", "Axis Arrow Depth Value");

  const axisDepthRow = document.createElement("div");

  axisDepthRow.style.display = "flex";
  axisDepthRow.style.alignItems = "center";
  axisDepthRow.style.gap = "8px";

  axisDepthControl.appendChild(axisDepthLabel);
  axisDepthRow.appendChild(axisDepthSlider);
  axisDepthRow.appendChild(axisDepthValue);
  axisDepthControl.appendChild(axisDepthRow);

  const axisLabelDepthControl = document.createElement("div");

  axisLabelDepthControl.style.display = "none";
  axisLabelDepthControl.style.marginTop = "10px";

  const axisLabelDepthLabel = document.createElement("label");

  axisLabelDepthLabel.textContent = "Axis Label Depth";
  axisLabelDepthLabel.style.display = "block";
  axisLabelDepthLabel.style.marginBottom = "5px";

  const axisLabelDepthSlider = document.createElement("input");

  axisLabelDepthSlider.type = "range";
  axisLabelDepthSlider.min = "0";
  axisLabelDepthSlider.max = "1";
  axisLabelDepthSlider.step = "0.001";
  axisLabelDepthSlider.value = String(axisLabelDepth);
  axisLabelDepthSlider.style.flex = "1";
  axisLabelDepthSlider.style.minWidth = "0";
  axisLabelDepthSlider.setAttribute("aria-label", "Axis Label Depth");

  const axisLabelDepthValue = document.createElement("input");

  axisLabelDepthValue.type = "text";
  axisLabelDepthValue.value = String(axisLabelDepth);
  axisLabelDepthValue.style.width = "55px";
  axisLabelDepthValue.style.boxSizing = "border-box";
  axisLabelDepthValue.style.textAlign = "center";
  axisLabelDepthValue.setAttribute("aria-label", "Axis Label Depth Value");

  const axisLabelDepthRow = document.createElement("div");

  axisLabelDepthRow.style.display = "flex";
  axisLabelDepthRow.style.alignItems = "center";
  axisLabelDepthRow.style.gap = "8px";

  axisLabelDepthControl.appendChild(axisLabelDepthLabel);
  axisLabelDepthRow.appendChild(axisLabelDepthSlider);
  axisLabelDepthRow.appendChild(axisLabelDepthValue);
  axisLabelDepthControl.appendChild(axisLabelDepthRow);

  const labelDepthControl = document.createElement("div");

  labelDepthControl.style.display = "none";
  labelDepthControl.style.marginTop = "10px";

  const labelDepthLabel = document.createElement("label");

  labelDepthLabel.textContent = "Label Depth";
  labelDepthLabel.style.display = "block";
  labelDepthLabel.style.marginBottom = "5px";

  const labelDepthSlider = document.createElement("input");

  labelDepthSlider.type = "range";
  labelDepthSlider.min = "0";
  labelDepthSlider.max = "1";
  labelDepthSlider.step = "0.001";
  labelDepthSlider.value = String(labelDepth);
  labelDepthSlider.style.flex = "1";
  labelDepthSlider.style.minWidth = "0";
  labelDepthSlider.setAttribute("aria-label", "Label Depth");

  const labelDepthValue = document.createElement("input");

  labelDepthValue.type = "text";
  labelDepthValue.value = String(labelDepth);
  labelDepthValue.style.width = "55px";
  labelDepthValue.style.boxSizing = "border-box";
  labelDepthValue.style.textAlign = "center";
  labelDepthValue.setAttribute("aria-label", "Label Depth Value");

  const labelDepthRow = document.createElement("div");

  labelDepthRow.style.display = "flex";
  labelDepthRow.style.alignItems = "center";
  labelDepthRow.style.gap = "8px";

  labelDepthControl.appendChild(labelDepthLabel);
  labelDepthRow.appendChild(labelDepthSlider);
  labelDepthRow.appendChild(labelDepthValue);
  labelDepthControl.appendChild(labelDepthRow);

  function createVisibilityControl(title, groupName, initialValue, onChange) {
    const control = document.createElement("div");

    control.style.display = "none";
    control.style.marginTop = "10px";

    const titleElement = document.createElement("div");

    titleElement.textContent = title;
    titleElement.style.fontSize = "14px";
    titleElement.style.fontWeight = "600";
    titleElement.style.color = "#374151";
    titleElement.style.marginBottom = "5px";

    const options = document.createElement("div");

    options.style.display = "flex";
    options.style.gap = "12px";

    for (const [value, text] of [
      [ALWAYS_VISIBLE, "Visible"],
      [HIDDEN_BEHIND_CUBE, "Hidden"],
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
    control.setVisibilityMode = (value) => {
      for (const radio of options.querySelectorAll("input")) {
        radio.checked = radio.value === value;
      }
    };

    return control;
  }

  updateGhostStickerVisibility();

  const faceletLabelsVisibilityControl = createVisibilityControl(
    "Facelet Labels Visibility",
    "facelet-labels-visibility",
    faceletLabelsVisibility,
    (value) => {
      faceletLabelsVisibility = value;
      updateFaceletLabelsVisibilityMode();
    },
  );
  const axisLabelsVisibilityControl = createVisibilityControl(
    "Axis Labels Visibility",
    "axis-labels-visibility",
    axisLabelsVisibility,
    (value) => {
      axisLabelsVisibility = value;
      updateAxisLabelsVisibilityMode();
    },
  );
  const axisArrowsVisibilityControl = createVisibilityControl(
    "Axis Arrows Visibility",
    "axis-arrows-visibility",
    axisArrowsVisibility,
    (value) => {
      axisArrowsVisibility = value;
      updateAxisArrowsVisibilityMode();
    },
  );
  const rotationArrowsVisibilityControl = createVisibilityControl(
    "Rotation Arrows Visibility",
    "rotation-arrows-visibility",
    rotationArrowsVisibility,
    (value) => {
      rotationArrowsVisibility = value;
      updateRotationArrowsVisibilityMode();
    },
  );

  labelsContent.appendChild(showFaceletLabelsLabel);
  labelsContent.appendChild(labelDepthControl);
  labelsContent.appendChild(faceletLabelsVisibilityControl);
  labelsContent.appendChild(showAxisLabelsLabel);
  labelsContent.appendChild(axisLabelVisibilityControl);
  labelsContent.appendChild(axisLabelNameTitle);
  labelsContent.appendChild(axisLabelModeContainer);
  labelsContent.appendChild(axisLabelDepthControl);
  labelsContent.appendChild(axisLabelsVisibilityControl);
  labelsContent.appendChild(showAxisArrowsLabel);
  labelsContent.appendChild(axisArrowVisibilityControl);
  labelsContent.appendChild(axisDepthControl);
  labelsContent.appendChild(axisArrowsVisibilityControl);
  labelsContent.appendChild(showRotationArrowsLabel);
  labelsContent.appendChild(rotationArrowVisibilityControl);
  labelsContent.appendChild(rotationArrowDepthControl);
  labelsContent.appendChild(rotationArrowThicknessControl);
  labelsContent.appendChild(rotationArrowRadiusControl);
  labelsContent.appendChild(rotationArrowDirectionControl);
  labelsContent.appendChild(rotationArrowsVisibilityControl);
  labelsPanel.appendChild(labelsHeader);
  labelsPanel.appendChild(labelsContent);
  controlsRoot.appendChild(labelsPanel);

  function getJsonExportSetup() {
    const faceletLabels = {};

    for (const facelet of facelets) {
      const faceletData = getFaceletData(facelet);

      faceletLabels[faceletData.id] = getFaceletLabelColor(facelet);
    }

    const axisLabels = {};
    const axisArrows = {};
    const rotationArrows = {};
    const axisLabelColors = {};
    const rotationArrowColors = {};

    for (const [index, axisDefinition] of axisDefinitions.entries()) {
      const face = axisDefinition.label.face;
      const axisLabel = axisGroup.children[index * 2 + 1];
      const rotationArrow = rotationArrowGroup.children[index];

      axisLabels[face] = {
        visible: axisLabelVisibilityCheckboxes.get(face).checked,
        customText: axisDefinition.label.custom,
      };
      axisLabelColors[face] = axisLabel.userData.labelColor;
      axisArrows[face] = {
        visible:
          showAxisArrowsCheckbox.checked &&
          axisArrowVisibilityCheckboxes.get(face).checked,
      };
      rotationArrows[face] = {
        visible: rotationArrowVisibilityCheckboxes.get(face).checked,
      };
      rotationArrowColors[face] = rotationArrow.userData.color;
    }

    return {
      cube: getCubeState(),
      view: {
        cameraPosition: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        target: {
          x: controls.target.x,
          y: controls.target.y,
          z: controls.target.z,
        },
      },
      rotations: {
        moves: rotationActions.map((action) => action.label),
        text: getRotationEntries()
          .map((entry) => entry.textContent)
          .join(" "),
        durationSeconds: durationState.value / 1000,
      },
      colors: {
        faceletLabels,
        axisLabels: axisLabelColors,
        rotationArrows: rotationArrowColors,
      },
      labels: {
        facelets: showFaceletLabelsCheckbox.checked,
        faceletVisibility: faceletLabelsVisibility,
        axisLabels: showAxisLabelsCheckbox.checked,
        axisLabelVisibility: axisLabelsVisibility,
        axisLabelMode,
        axisLabelDepth,
        axisLabelsByFace: axisLabels,
        axisArrows: showAxisArrowsCheckbox.checked,
        axisArrowVisibility: axisArrowsVisibility,
        axisDepth,
        axisArrowsByFace: axisArrows,
        rotationArrows: showRotationArrowsCheckbox.checked,
        rotationArrowVisibility: rotationArrowsVisibility,
        rotationArrowDepth,
        rotationArrowThickness,
        rotationArrowRadius,
        rotationArrowDirection,
        rotationArrowsByFace: rotationArrows,
        labelDepth,
      },
    };
  }

  function getDefaultJsonExportSetup() {
    const defaultFaceletLabels = {};

    for (const facelet of facelets) {
      const faceletData = getFaceletData(facelet);

      defaultFaceletLabels[faceletData.id] = defaultFaceletLabelColor;
    }

    const defaultAxisLabels = {};
    const defaultAxisArrows = {};
    const defaultRotationArrows = {};

    for (const axisDefinition of axisDefinitions) {
      const face = axisDefinition.label.face;

      defaultAxisLabels[face] = {
        visible: false,
        customText: face,
      };
      defaultAxisArrows[face] = { visible: false };
      defaultRotationArrows[face] = {
        visible: false,
      };
    }

    return {
      cube: getDefaultCubeState(),
      view: {
        cameraPosition: { x: 5, y: 5, z: 7 },
        target: { x: 0, y: 0, z: 0 },
      },
      rotations: { moves: [], text: "", durationSeconds: 1 },
      colors: {
        faceletLabels: defaultFaceletLabels,
        axisLabels: Object.fromEntries(
          axisDefinitions.map((axisDefinition) => [
            axisDefinition.label.face,
            defaultFaceColors[axisDefinition.label.face],
          ]),
        ),
        rotationArrows: Object.fromEntries(
          axisDefinitions.map((axisDefinition) => [
            axisDefinition.label.face,
            defaultFaceColors[axisDefinition.label.face],
          ]),
        ),
      },
      labels: {
        facelets: false,
        faceletVisibility: ALWAYS_VISIBLE,
        axisLabels: false,
        axisLabelVisibility: ALWAYS_VISIBLE,
        axisLabelMode: "face",
        axisLabelDepth: DEFAULT_LABEL_DEPTH,
        axisLabelsByFace: defaultAxisLabels,
        axisArrows: false,
        axisArrowVisibility: HIDDEN_BEHIND_CUBE,
        axisDepth: DEFAULT_AXIS_DEPTH,
        axisArrowsByFace: defaultAxisArrows,
        rotationArrows: false,
        rotationArrowVisibility: ALWAYS_VISIBLE,
        rotationArrowDepth: DEFAULT_ROTATION_ARROW_DEPTH,
        rotationArrowThickness: DEFAULT_ROTATION_ARROW_THICKNESS,
        rotationArrowRadius: DEFAULT_ROTATION_ARROW_RADIUS,
        rotationArrowDirection: "clockwise",
        rotationArrowsByFace: defaultRotationArrows,
        labelDepth: DEFAULT_LABEL_DEPTH,
      },
    };
  }

  function applyImportedColors(importedColors) {
    for (const facelet of facelets) {
      const faceletData = getFaceletData(facelet);
      const color = importedColors.faceletLabels[faceletData.id];

      updateFaceletLabelColor(facelet, color);
      updateFaceletLabelColorControl(facelet);
    }

    for (const [face, color] of Object.entries(importedColors.axisLabels)) {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      if (index !== -1) {
        updateAxisLabelColor(index, color);
      }
    }

    for (const [face, color] of Object.entries(importedColors.rotationArrows)) {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      if (index !== -1) {
        updateRotationArrowColor(index, color);
      }
    }

    for (const [face] of faceletSections) {
      updateFaceletLabelFaceControl(face);
    }
    updateFaceletLabelHeading();
    axisLabelColorControls.forEach((control) => control.sync());
    rotationArrowColorControls.forEach((control) => control.sync());
  }

  function setNumericControl(controls, value) {
    controls.slider.value = String(value);
    controls.value.value = String(value);
  }

  function applyImportedLabels(importedLabels) {
    showFaceletLabelsCheckbox.checked = importedLabels.facelets;
    showFaceletLabelsCheckbox.dispatchEvent(
      new Event("change", { bubbles: true }),
    );
    faceletLabelsVisibility = importedLabels.faceletVisibility;
    faceletLabelsVisibilityControl.setVisibilityMode(faceletLabelsVisibility);
    updateFaceletLabelsVisibilityMode();

    showAxisLabelsCheckbox.checked = importedLabels.axisLabels;
    showAxisLabelsCheckbox.dispatchEvent(
      new Event("change", { bubbles: true }),
    );
    axisLabelsVisibility = importedLabels.axisLabelVisibility;
    axisLabelsVisibilityControl.setVisibilityMode(axisLabelsVisibility);
    updateAxisLabelsVisibilityMode();

    for (const [face, importedLabel] of Object.entries(
      importedLabels.axisLabelsByFace,
    )) {
      const checkbox = axisLabelVisibilityCheckboxes.get(face);
      const customInput = axisLabelCustomInputs.get(face);
      const axisDefinition = axisDefinitions.find(
        (definition) => definition.label.face === face,
      );

      if (checkbox) {
        checkbox.checked = importedLabel.visible;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (customInput && axisDefinition) {
        customInput.value = importedLabel.customText;
        axisDefinition.label.custom = importedLabel.customText;
      }
    }

    selectAxisLabelMode(importedLabels.axisLabelMode);
    axisLabelDepth = importedLabels.axisLabelDepth;
    setNumericControl(
      { slider: axisLabelDepthSlider, value: axisLabelDepthValue },
      axisLabelDepth,
    );
    updateAxisLabelDepth();

    showAxisArrowsCheckbox.checked = importedLabels.axisArrows;
    showAxisArrowsCheckbox.dispatchEvent(
      new Event("change", { bubbles: true }),
    );
    axisArrowsVisibility = importedLabels.axisArrowVisibility;
    axisArrowsVisibilityControl.setVisibilityMode(axisArrowsVisibility);
    updateAxisArrowsVisibilityMode();
    for (const [face, importedArrow] of Object.entries(
      importedLabels.axisArrowsByFace,
    )) {
      const checkbox = axisArrowVisibilityCheckboxes.get(face);

      if (checkbox) {
        checkbox.checked = importedArrow.visible;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    axisDepth = importedLabels.axisDepth;
    setNumericControl(
      { slider: axisDepthSlider, value: axisDepthValue },
      axisDepth,
    );
    updateAxisDepth();

    showRotationArrowsCheckbox.checked = importedLabels.rotationArrows;
    showRotationArrowsCheckbox.dispatchEvent(
      new Event("change", { bubbles: true }),
    );
    rotationArrowsVisibility = importedLabels.rotationArrowVisibility;
    rotationArrowsVisibilityControl.setVisibilityMode(rotationArrowsVisibility);
    updateRotationArrowsVisibilityMode();
    for (const [face, importedArrow] of Object.entries(
      importedLabels.rotationArrowsByFace,
    )) {
      const checkbox = rotationArrowVisibilityCheckboxes.get(face);

      if (checkbox) {
        checkbox.checked = importedArrow.visible;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    rotationArrowDepth = importedLabels.rotationArrowDepth;
    setNumericControl(
      { slider: rotationArrowDepthSlider, value: rotationArrowDepthValue },
      rotationArrowDepth,
    );
    updateRotationArrowDepth();
    rotationArrowThickness = importedLabels.rotationArrowThickness;
    setNumericControl(
      {
        slider: rotationArrowThicknessSlider,
        value: rotationArrowThicknessValue,
      },
      rotationArrowThickness,
    );
    updateRotationArrowThickness();
    rotationArrowRadius = importedLabels.rotationArrowRadius;
    rotationArrowRadiusSlider.value = String(
      Math.min(Math.max(rotationArrowRadius, 0.1), 2),
    );
    rotationArrowRadiusValue.value = String(rotationArrowRadius);
    updateRotationArrowRadius();
    rotationArrowDirection = importedLabels.rotationArrowDirection;
    rotationArrowDirectionSelect.value = rotationArrowDirection;
    updateRotationArrowDirection();
    labelDepth = importedLabels.labelDepth;
    setNumericControl(
      { slider: labelDepthSlider, value: labelDepthValue },
      labelDepth,
    );
    refreshFaceletLabels();
  }

  function createImportedRotationAction(label) {
    const normalizedMoveName = normalizeWideMoveName(label);
    const definition = getRotationDefinition(normalizedMoveName);

    if (definition) {
      const inverse = getInverseMoveName(normalizedMoveName);

      return {
        label,
        run: (duration) => rotateMove(normalizedMoveName, duration),
        inverse: {
          label: getInverseMoveName(label),
          run: (duration) => rotateMove(inverse, duration),
        },
      };
    }

    const customMatch = label.match(/^([A-Za-z]+)\[(-?\d+(?:\.\d+)?)°\]$/u);

    const customMoveName = customMatch
      ? normalizeWideMoveName(customMatch[1])
      : null;

    if (!customMatch || !getRotationDefinition(customMoveName)) {
      return {
        label,
        run: () => Promise.resolve(true),
        inverse: { label, run: () => Promise.resolve(true) },
      };
    }

    const moveName = customMoveName;
    const angle = Number(customMatch[2]);
    const signedAngle = getCustomRotationAngle(moveName, angle);

    return {
      label,
      run: (duration) => rotateSlice(moveName, signedAngle, duration),
      inverse: {
        label: getCustomMoveLabel(customMatch[1], -angle, {
          preserveEnteredAngle: true,
        }),
        run: (duration) => rotateSlice(moveName, -signedAngle, duration),
      },
    };
  }

  function restoreImportedRotations(importedRotations) {
    clearRotationEntries();
    rotationActions.length = 0;
    pendingRotationEntries.length = 0;
    queuedRotationActions = [];
    cursorRotationEntry = null;

    const moves = importedRotations.moves.length
      ? importedRotations.moves
      : importedRotations.text.trim()
        ? importedRotations.text.trim().split(/\s+/u)
        : [];

    for (const move of moves) {
      const entry = appendRotationEntry(move);
      const action = createImportedRotationAction(move);

      action.entry = entry;
      rotationActions.push(action);
      cursorRotationEntry = entry;
    }

    if (moves.length > 0) {
      showRotationStatus();
    }
    rotationPlaybackState = "idle";
    rotationStopRequested = false;
    highlightActiveRotation();
    updateRotationMediaControlState();
  }

  function applyImportedSetup(importedSetup) {
    resetEverythingInterface();

    camera.position.set(
      importedSetup.view.cameraPosition.x,
      importedSetup.view.cameraPosition.y,
      importedSetup.view.cameraPosition.z,
    );
    controls.target.set(
      importedSetup.view.target.x,
      importedSetup.view.target.y,
      importedSetup.view.target.z,
    );
    controls.update();

    cubeDimensionPanel.applyDimensions(
      importedSetup.cube.size,
      importedSetup.cube.gap,
    );
    applyCubeState(importedSetup.cube);
    applyImportedColors(importedSetup.colors);
    applyImportedLabels(importedSetup.labels);

    durationState.value = importedSetup.rotations.durationSeconds * 1000;
    durationValue.value = String(importedSetup.rotations.durationSeconds);
    durationSlider.value = String(
      Math.min(importedSetup.rotations.durationSeconds, 5),
    );
    restoreImportedRotations(importedSetup.rotations);
  }

  function openImportDialog() {
    openSetupImportDialog({
      getDefaultSetup: getDefaultJsonExportSetup,
      onImport: (importedSetup) => {
        applyImportedSetup(importedSetup);
        markSetupChanged();
      },
      dialogStyle: {
        borderRadius: UI_PANEL_BORDER_RADIUS,
        boxShadow: UI_PANEL_BOX_SHADOW,
        fontFamily: UI_FONT_FAMILY,
      },
    });
  }

  function downloadJsonExport() {
    const exportData = createCurrentJsonExport();
    const blob = new Blob([`${JSON.stringify(exportData, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = prefixWithLocalTimestamp("cube-setup.json");
    link.click();
    URL.revokeObjectURL(url);
  }

  function createCurrentJsonExport() {
    return createJsonExport(getJsonExportSetup(), getDefaultJsonExportSetup());
  }

  // ============================================================
  // Setup panel
  // ============================================================

  setupPanel = createSetupPanel({
    panelBackground: UI_PANEL_BACKGROUND,
    panelBorder: UI_PANEL_BORDER,
    panelBorderRadius: UI_PANEL_BORDER_RADIUS,
    panelBoxShadow: UI_PANEL_BOX_SHADOW,
    fontFamily: UI_FONT_FAMILY,
    fontSize: UI_FONT_SIZE,
    onExportJson: downloadJsonExport,
    onImportJson: openImportDialog,
    onExportSvg: exportSvgArchive,
    onExpand: () => collapseOtherPanels("setup"),
    onLayoutChange: scheduleCubePanelPositionUpdate,
  });

  controlsRoot.appendChild(setupPanel.root);

  function updateFaceletLabelVisibility() {
    const isVisible = showFaceletLabelsCheckbox.checked;

    labelDepthControl.style.display = isVisible ? "block" : "none";
    refreshFaceletLabels();

    for (const label of faceletLabels.values()) {
      label.visible = isVisible;
    }

    scheduleCubePanelPositionUpdate();
  }

  showFaceletLabelsCheckbox.addEventListener("change", () => {
    updateFaceletLabelVisibility();
    faceletLabelsVisibilityControl.style.display =
      showFaceletLabelsCheckbox.checked ? "block" : "none";
  });

  showAxisLabelsCheckbox.addEventListener("change", () => {
    axisGroup.visible =
      showAxisLabelsCheckbox.checked || showAxisArrowsCheckbox.checked;
    axisLabelVisibilityControl.style.display = showAxisLabelsCheckbox.checked
      ? "block"
      : "none";

    if (showAxisLabelsCheckbox.checked) {
      setAllAxisLabelVisibility(true);
    } else {
      setAllAxisLabelVisibility(false);
    }

    axisLabelNameTitle.style.display = showAxisLabelsCheckbox.checked
      ? "block"
      : "none";
    axisLabelModeContainer.style.display = showAxisLabelsCheckbox.checked
      ? "flex"
      : "none";
    axisLabelDepthControl.style.display = showAxisLabelsCheckbox.checked
      ? "block"
      : "none";
    axisLabelsVisibilityControl.style.display = showAxisLabelsCheckbox.checked
      ? "block"
      : "none";
    scheduleCubePanelPositionUpdate();
  });

  showAxisArrowsCheckbox.addEventListener("change", () => {
    axisGroup.visible =
      showAxisLabelsCheckbox.checked || showAxisArrowsCheckbox.checked;
    axisArrowVisibilityControl.style.display = showAxisArrowsCheckbox.checked
      ? "block"
      : "none";

    if (showAxisArrowsCheckbox.checked) {
      setAllAxisArrowVisibility(true);
    } else {
      setAllAxisArrowVisibility(false);
    }

    axisDepthControl.style.display = showAxisArrowsCheckbox.checked
      ? "block"
      : "none";
    axisArrowsVisibilityControl.style.display = showAxisArrowsCheckbox.checked
      ? "block"
      : "none";
    scheduleCubePanelPositionUpdate();
  });

  function setAllAxisLabelVisibility(isVisible) {
    for (const [face, checkbox] of axisLabelVisibilityCheckboxes) {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      checkbox.checked = isVisible;
      axisGroup.children[index * 2 + 1].visible = isVisible;
    }
  }

  for (const [face, checkbox] of axisLabelVisibilityCheckboxes) {
    checkbox.addEventListener("change", () => {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      axisGroup.children[index * 2 + 1].visible = checkbox.checked;
    });
  }

  function setAllAxisArrowVisibility(isVisible) {
    for (const [face, checkbox] of axisArrowVisibilityCheckboxes) {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      checkbox.checked = isVisible;
      axisGroup.children[index * 2].visible = isVisible;
    }
  }

  for (const [face, checkbox] of axisArrowVisibilityCheckboxes) {
    checkbox.addEventListener("change", () => {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      axisGroup.children[index * 2].visible = checkbox.checked;
    });
  }

  function setDepthTest(root, depthTest) {
    root.traverse((object) => {
      if (object.material) {
        object.material.depthTest = depthTest;
        object.material.needsUpdate = true;
      }
    });
  }

  function updateFaceletLabelsVisibilityMode() {
    for (const label of faceletLabels.values()) {
      setDepthTest(label, faceletLabelsVisibility === HIDDEN_BEHIND_CUBE);
    }
  }

  function updateAxisLabelsVisibilityMode() {
    for (let index = 1; index < axisGroup.children.length; index += 2) {
      setDepthTest(
        axisGroup.children[index],
        axisLabelsVisibility === HIDDEN_BEHIND_CUBE,
      );
    }
  }

  function updateAxisArrowsVisibilityMode() {
    for (let index = 0; index < axisGroup.children.length; index += 2) {
      setDepthTest(
        axisGroup.children[index],
        axisArrowsVisibility === HIDDEN_BEHIND_CUBE,
      );
    }
  }

  function updateRotationArrowsVisibilityMode() {
    for (const arrow of rotationArrowGroup.children) {
      setDepthTest(arrow, rotationArrowsVisibility === HIDDEN_BEHIND_CUBE);
    }
  }

  function updateRotationArrowDirectionControlVisibility() {
    rotationArrowDirectionControl.style.display =
      showRotationArrowsCheckbox.checked ? "block" : "none";
  }

  showRotationArrowsCheckbox.addEventListener("change", () => {
    rotationArrowGroup.visible = showRotationArrowsCheckbox.checked;
    rotationArrowVisibilityControl.style.display =
      showRotationArrowsCheckbox.checked ? "block" : "none";

    if (showRotationArrowsCheckbox.checked) {
      setAllRotationArrowVisibility(true);
    }

    rotationArrowDepthControl.style.display = showRotationArrowsCheckbox.checked
      ? "block"
      : "none";
    updateRotationArrowDirectionControlVisibility();
    rotationArrowThicknessControl.style.display =
      showRotationArrowsCheckbox.checked ? "block" : "none";
    rotationArrowRadiusControl.style.display =
      showRotationArrowsCheckbox.checked ? "block" : "none";
    rotationArrowsVisibilityControl.style.display =
      showRotationArrowsCheckbox.checked ? "block" : "none";
    scheduleCubePanelPositionUpdate();
  });

  function setAllRotationArrowVisibility(isVisible) {
    for (const [face, checkbox] of rotationArrowVisibilityCheckboxes) {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      checkbox.checked = isVisible;
      rotationArrowVisibility[index] = isVisible;
      rotationArrowGroup.children[index].visible = isVisible;
    }
  }

  for (const [face, checkbox] of rotationArrowVisibilityCheckboxes) {
    checkbox.addEventListener("change", () => {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      rotationArrowVisibility[index] = checkbox.checked;
      rotationArrowGroup.children[index].visible = checkbox.checked;
    });
  }

  rotationArrowDirectionSelect.addEventListener("change", () => {
    rotationArrowDirection = rotationArrowDirectionSelect.value;
    updateRotationArrowDirection();
  });

  rotationArrowDepthSlider.addEventListener("input", () => {
    rotationArrowDepth = syncEditValueFromSlider(
      rotationArrowDepthSlider,
      rotationArrowDepthValue,
    );
    updateRotationArrowDepth();
  });

  rotationArrowDepthValue.addEventListener("input", () => {
    const raw = rotationArrowDepthValue.value;

    if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
      return;
    }

    if (!/^-?\d*\.?\d+$/.test(raw)) {
      rotationArrowDepthValue.value = raw
        .replace(/(?!^)-/g, "")
        .replace(/[^\d.-]/g, "")
        .replace(/(\..*)\./g, "$1");
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      return;
    }

    rotationArrowDepth = syncSliderFromEditValue(
      rotationArrowDepthSlider,
      rotationArrowDepthValue,
      value,
    );
    updateRotationArrowDepth();
  });

  rotationArrowDepthValue.addEventListener("blur", () => {
    const value = Number(rotationArrowDepthValue.value);

    const nextValue = Number.isFinite(value)
      ? value
      : DEFAULT_ROTATION_ARROW_DEPTH;
    rotationArrowDepth = syncSliderFromEditValue(
      rotationArrowDepthSlider,
      rotationArrowDepthValue,
      nextValue,
    );
    rotationArrowDepthValue.value = String(rotationArrowDepth);
    updateRotationArrowDepth();
  });

  rotationArrowThicknessSlider.addEventListener("input", () => {
    rotationArrowThickness = syncEditValueFromSlider(
      rotationArrowThicknessSlider,
      rotationArrowThicknessValue,
    );
    updateRotationArrowThickness();
  });

  rotationArrowThicknessValue.addEventListener("input", () => {
    const raw = rotationArrowThicknessValue.value;

    if (raw === "" || raw === ".") {
      return;
    }

    if (!/^\d*\.?\d+$/.test(raw)) {
      rotationArrowThicknessValue.value = raw
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1");
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      return;
    }

    rotationArrowThickness = syncSliderFromEditValue(
      rotationArrowThicknessSlider,
      rotationArrowThicknessValue,
      value,
    );
    updateRotationArrowThickness();
  });

  rotationArrowThicknessValue.addEventListener("blur", () => {
    const value = Number(rotationArrowThicknessValue.value);

    const nextValue = Number.isFinite(value)
      ? Math.max(value, 0.001)
      : DEFAULT_ROTATION_ARROW_THICKNESS;
    rotationArrowThickness = syncSliderFromEditValue(
      rotationArrowThicknessSlider,
      rotationArrowThicknessValue,
      nextValue,
    );
    rotationArrowThicknessValue.value = String(rotationArrowThickness);
    updateRotationArrowThickness();
  });

  rotationArrowRadiusSlider.addEventListener("input", () => {
    rotationArrowRadius = syncEditValueFromSlider(
      rotationArrowRadiusSlider,
      rotationArrowRadiusValue,
    );
    updateRotationArrowRadius();
  });

  rotationArrowRadiusValue.addEventListener("input", () => {
    const raw = rotationArrowRadiusValue.value;

    if (raw === "" || raw === ".") {
      return;
    }

    if (!/^\d*\.?\d+$/.test(raw)) {
      rotationArrowRadiusValue.value = raw
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1");
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0.1) {
      return;
    }

    rotationArrowRadius = syncSliderFromEditValue(
      rotationArrowRadiusSlider,
      rotationArrowRadiusValue,
      value,
    );
    updateRotationArrowRadius();
  });

  rotationArrowRadiusValue.addEventListener("blur", () => {
    const value = Number(rotationArrowRadiusValue.value);

    const nextValue = Number.isFinite(value)
      ? Math.max(value, 0.1)
      : DEFAULT_ROTATION_ARROW_RADIUS;
    rotationArrowRadius = syncSliderFromEditValue(
      rotationArrowRadiusSlider,
      rotationArrowRadiusValue,
      nextValue,
    );
    rotationArrowRadiusValue.value = String(rotationArrowRadius);
    updateRotationArrowRadius();
  });

  function updateAxisLabelText() {
    for (let index = 1; index < axisGroup.children.length; index += 2) {
      const axisLabel = axisGroup.children[index];
      const axisDefinition = axisLabel.userData.axisDefinition;
      const context = axisLabel.userData.context;
      const labelText = getAxisLabelText(axisDefinition);

      const canvas = axisLabel.userData.canvas;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = axisLabel.userData.labelColor;
      context.strokeText(labelText, canvas.width / 2, canvas.height / 2);
      context.fillText(labelText, canvas.width / 2, canvas.height / 2);
      axisLabel.material.map.needsUpdate = true;
    }
  }

  function selectAxisLabelMode(mode) {
    axisLabelMode = mode;
    customCheckbox.checked = mode === "custom";
    cartesianCheckbox.checked = mode === "coordinate";
    faceCheckbox.checked = mode === "face";
    for (const input of axisLabelCustomInputs.values()) {
      input.style.visibility = mode === "custom" ? "visible" : "hidden";
    }
    for (const marker of axisLabelCustomMarkers.values()) {
      marker.style.visibility = mode === "custom" ? "visible" : "hidden";
    }
    updateAxisLabelText();
  }

  customCheckbox.addEventListener("change", () => {
    if (customCheckbox.checked) {
      selectAxisLabelMode("custom");
    }
  });

  cartesianCheckbox.addEventListener("change", () => {
    if (cartesianCheckbox.checked) {
      selectAxisLabelMode("coordinate");
    }
  });

  faceCheckbox.addEventListener("change", () => {
    if (faceCheckbox.checked) {
      selectAxisLabelMode("face");
    }
  });

  function updateAxisDepth() {
    let arrowIndex = 0;

    for (const axisDefinition of axisDefinitions) {
      const arrow = axisGroup.children[arrowIndex];

      arrow.position.copy(axisDefinition.direction).multiplyScalar(axisDepth);
      arrowIndex += 2;
    }
  }

  axisDepthSlider.addEventListener("input", () => {
    axisDepth = syncEditValueFromSlider(axisDepthSlider, axisDepthValue);
    updateAxisDepth();
  });

  axisDepthValue.addEventListener("input", () => {
    const raw = axisDepthValue.value;

    if (raw === "" || raw === ".") {
      return;
    }

    if (!/^\d*\.?\d+$/.test(raw)) {
      axisDepthValue.value = raw
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1");
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      return;
    }

    axisDepth = syncSliderFromEditValue(axisDepthSlider, axisDepthValue, value);
    updateAxisDepth();
  });

  axisDepthValue.addEventListener("blur", () => {
    const value = Number(axisDepthValue.value);

    const nextValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
    axisDepth = syncSliderFromEditValue(
      axisDepthSlider,
      axisDepthValue,
      nextValue,
    );
    axisDepthValue.value = String(axisDepth);
    updateAxisDepth();
  });

  function updateAxisLabelDepth() {
    for (const axisDefinition of axisDefinitions) {
      axisDefinition.depth = axisLabelDepth;
    }

    let labelIndex = 0;

    for (const axisDefinition of axisDefinitions) {
      const axisLabel = axisGroup.children[labelIndex + 1];

      axisLabel.position
        .copy(axisDefinition.direction)
        .multiplyScalar(axisLength + axisDefinition.depth);
      labelIndex += 2;
    }
  }

  axisLabelDepthSlider.addEventListener("input", () => {
    axisLabelDepth = syncEditValueFromSlider(
      axisLabelDepthSlider,
      axisLabelDepthValue,
    );
    updateAxisLabelDepth();
  });

  axisLabelDepthValue.addEventListener("input", () => {
    const raw = axisLabelDepthValue.value;

    if (raw === "" || raw === ".") {
      return;
    }

    if (!/^\d*\.?\d+$/.test(raw)) {
      axisLabelDepthValue.value = raw
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1");
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    axisLabelDepth = syncSliderFromEditValue(
      axisLabelDepthSlider,
      axisLabelDepthValue,
      value,
    );
    updateAxisLabelDepth();
  });

  axisLabelDepthValue.addEventListener("blur", () => {
    const value = Number(axisLabelDepthValue.value);

    if (!Number.isFinite(value) || value <= 0) {
      axisLabelDepth = syncSliderFromEditValue(
        axisLabelDepthSlider,
        axisLabelDepthValue,
        DEFAULT_LABEL_DEPTH,
      );
      axisLabelDepthValue.value = String(axisLabelDepth);
    } else {
      axisLabelDepth = syncSliderFromEditValue(
        axisLabelDepthSlider,
        axisLabelDepthValue,
        value,
      );
      axisLabelDepthValue.value = String(axisLabelDepth);
    }

    updateAxisLabelDepth();
  });

  labelDepthSlider.addEventListener("input", () => {
    labelDepth = syncEditValueFromSlider(labelDepthSlider, labelDepthValue);
    refreshFaceletLabels();
  });

  labelDepthValue.addEventListener("input", () => {
    const raw = labelDepthValue.value;

    if (raw === "" || raw === ".") {
      return;
    }

    if (!/^\d*\.?\d+$/.test(raw)) {
      labelDepthValue.value = raw
        .replace(/[^\d.]/g, "")
        .replace(/(\..*)\./g, "$1");
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    labelDepth = syncSliderFromEditValue(
      labelDepthSlider,
      labelDepthValue,
      value,
    );
    refreshFaceletLabels();
  });

  labelDepthValue.addEventListener("blur", () => {
    const value = Number(labelDepthValue.value);

    if (!Number.isFinite(value) || value <= 0) {
      labelDepth = syncSliderFromEditValue(
        labelDepthSlider,
        labelDepthValue,
        DEFAULT_LABEL_DEPTH,
      );
      labelDepthValue.value = String(labelDepth);
    } else {
      labelDepth = syncSliderFromEditValue(
        labelDepthSlider,
        labelDepthValue,
        value,
      );
      labelDepthValue.value = String(labelDepth);
    }

    refreshFaceletLabels();
  });

  // ============================================================
  // Cube panel
  // ============================================================

  const cubePanel = document.createElement("div");

  cubePanel.style.position = "absolute";
  cubePanel.style.top = "20px";
  cubePanel.style.right = "20px";
  cubePanel.style.width = "280px";
  cubePanel.style.padding = "16px";
  cubePanel.style.background = UI_PANEL_BACKGROUND;
  cubePanel.style.borderRadius = UI_PANEL_BORDER_RADIUS;
  cubePanel.style.boxShadow = UI_PANEL_BOX_SHADOW;
  cubePanel.style.fontFamily = UI_FONT_FAMILY;
  cubePanel.style.fontSize = UI_FONT_SIZE;
  cubePanel.style.boxSizing = "border-box";

  controlsRoot.insertBefore(cubePanel, colorsPanel);

  function updateCubePanelPosition() {
    if (window.innerWidth <= 900) {
      cubePanel.style.top = "";
      cubePanel.style.right = "";
      if (viewPanel) {
        viewPanel.style.top = "";
        viewPanel.style.right = "";
      }
      colorsPanel.style.top = "";
      colorsPanel.style.right = "";

      if (labelsPanel) {
        labelsPanel.style.top = "";
        labelsPanel.style.right = "";
      }

      if (setupPanel) {
        setupPanel.root.style.top = "";
        setupPanel.root.style.right = "";
      }

      syncRightPanelChevron();
      syncRotationBlockLayout();
      return;
    }

    cubePanel.style.top = "20px";
    cubePanel.style.right = "20px";

    if (viewPanel) {
      viewPanel.style.top = `${cubePanel.offsetTop + cubePanel.offsetHeight + 10}px`;
      viewPanel.style.right = "20px";
    }

    colorsPanel.style.top = `${
      (viewPanel ?? cubePanel).offsetTop +
      (viewPanel ?? cubePanel).offsetHeight +
      10
    }px`;
    colorsPanel.style.right = "20px";

    if (labelsPanel) {
      labelsPanel.style.top = `${
        colorsPanel.offsetTop + colorsPanel.offsetHeight + 10
      }px`;
      labelsPanel.style.right = "20px";
    }

    if (setupPanel) {
      setupPanel.root.style.top = `${
        (labelsPanel ?? colorsPanel).offsetTop +
        (labelsPanel ?? colorsPanel).offsetHeight +
        10
      }px`;
      setupPanel.root.style.right = "20px";
    }

    syncRightPanelChevron();
    syncRotationBlockLayout();
  }

  function scheduleCubePanelPositionUpdate() {
    updateCubePanelPosition();
    requestAnimationFrame(updateCubePanelPosition);
  }

  // ============================================================
  // Cube title
  // ============================================================

  const cubeHeader = document.createElement("div");

  cubeHeader.style.display = "flex";
  cubeHeader.style.alignItems = "center";
  cubeHeader.style.justifyContent = "space-between";
  cubeHeader.style.cursor = "pointer";
  cubeHeader.style.userSelect = "none";
  cubeHeader.setAttribute("role", "button");
  cubeHeader.setAttribute("aria-expanded", "false");
  cubeHeader.tabIndex = 0;

  const cubeTitle = document.createElement("div");

  cubeTitle.textContent = "Cube";
  cubeTitle.style.fontSize = "18px";
  cubeTitle.style.fontWeight = "bold";

  const cubeTitleRow = document.createElement("div");

  cubeTitleRow.style.display = "flex";
  cubeTitleRow.style.alignItems = "center";
  cubeTitleRow.style.gap = "6px";

  const resetCubeButton = createResetButton("Reset Cube Settings", () => {
    cubeDimensionPanel.reset();
  });

  cubeTitleRow.appendChild(resetCubeButton);
  cubeTitleRow.appendChild(cubeTitle);

  const cubeCollapseIcon = document.createElement("span");

  cubeCollapseIcon.textContent = "−";
  cubeCollapseIcon.style.fontSize = "20px";
  cubeCollapseIcon.style.lineHeight = "1";

  cubeHeader.appendChild(cubeTitleRow);
  cubeHeader.appendChild(cubeCollapseIcon);
  cubePanel.appendChild(cubeHeader);

  const cubeContent = document.createElement("div");

  cubeContent.id = "cube-panel-content";
  cubeHeader.setAttribute("aria-controls", cubeContent.id);
  cubeContent.style.marginTop = "12px";
  cubePanel.appendChild(cubeContent);

  let cubeCollapsed = true;
  cubeContent.style.display = "none";
  cubeCollapseIcon.textContent = "+";

  function collapseOtherPanels(activePanel) {
    if (window.innerWidth > 900) {
      return;
    }

    if (activePanel !== "rotation" && !rotationCollapsed) {
      rotationCollapsed = true;
      rotationContent.style.display = "none";
      updateRotationToggle();
    }

    if (activePanel !== "view") {
      viewPanelController.setExpanded(false);
    }

    if (activePanel !== "colors" && !colorsCollapsed) {
      colorsCollapsed = true;
      colorsContent.style.display = "none";
      colorsPanel.style.overflowY = "hidden";
      colorsCollapseIcon.textContent = "+";
    }

    if (activePanel !== "cube" && !cubeCollapsed) {
      cubeCollapsed = true;
      cubeContent.style.display = "none";
      cubeCollapseIcon.textContent = "+";
    }

    if (activePanel !== "labels" && !labelsCollapsed) {
      labelsCollapsed = true;
      labelsContent.style.display = "none";
      labelsCollapseIcon.textContent = "+";
      labelsHeader.setAttribute("aria-expanded", "false");
    }

    if (activePanel !== "setup") {
      setupPanel.setExpanded(false);
    }
  }

  function toggleCubePanel() {
    cubeCollapsed = !cubeCollapsed;

    if (!cubeCollapsed) {
      collapseOtherPanels("cube");
    }

    cubeContent.style.display = cubeCollapsed ? "none" : "block";
    cubeCollapseIcon.textContent = cubeCollapsed ? "+" : "−";
    cubeHeader.setAttribute("aria-expanded", String(!cubeCollapsed));
    scheduleCubePanelPositionUpdate();
  }

  cubeHeader.addEventListener("click", toggleCubePanel);
  cubeHeader.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleCubePanel();
  });

  window.addEventListener("resize", scheduleCubePanelPositionUpdate);

  const cubeDimensionPanel = createCubePanel({
    cubies,
    initialSize: size,
    initialGap: gap,
    defaultSize,
    defaultGap,
    createLabel,
    styleUiTitle,
    panelBackground: UI_PANEL_BACKGROUND,
    onDimensionsChange: (nextSize, nextGap, customDimensions) => {
      updateCubeDimensions(nextSize, nextGap, customDimensions);
    },
    onGlobalValuesChange: (nextSize, nextGap) => {
      size = nextSize;
      gap = nextGap;
    },
    onLayoutChange: scheduleCubePanelPositionUpdate,
    onCustomModeSelected: () => {
      cubeCollapsed = false;
      cubeContent.style.display = "block";
      cubeCollapseIcon.textContent = "−";
    },
  });

  cubeContent.appendChild(cubeDimensionPanel.root);

  // ============================================================
  // Rotate button
  // ============================================================

  async function insertRotation(request) {
    if (!moveType) {
      return;
    }

    if (request.type === "sequence") {
      const sequence = parseCustomSequence(request.value);

      if (!sequence?.length || sequence.some((move) => !move)) {
        return;
      }

      await ensureCursorAtEndForInsertion();

      for (const move of sequence) {
        queueRotationAction({
          label: move.label,
          run: (duration) => move.run(duration),
          inverse: {
            label: move.inverseLabel,
            run: (duration) => move.inverse(duration),
          },
        });
      }

      return;
    }

    // --------------------------------------------------------
    // Fixed
    // --------------------------------------------------------

    if (moveType === "fixed") {
      return;
    }

    // --------------------------------------------------------
    // Custom
    // --------------------------------------------------------

    if (moveType === "custom" && !request.moveName) {
      return;
    }

    const move = request.moveName;
    const angle = request.angle;

    if (!move) {
      return;
    }

    await ensureCursorAtEndForInsertion();

    // --------------------------------------------------------
    // Custom rotation
    //
    // This is intentionally kept as a compatibility path.
    // The standardized fixed moves use rotateMove().
    // --------------------------------------------------------

    if (request.shortName !== undefined) {
      const moveText = getCustomMoveLabel(request.shortName, angle);
      const rotationAngle = getCustomRotationAngle(move, angle);

      if (moveText) {
        queueRotationAction({
          label: moveText,
          run: (duration) => rotateSlice(move, rotationAngle, duration),
          inverse: {
            label: getCustomMoveLabel(request.shortName, -angle),
            run: (duration) => rotateSlice(move, -rotationAngle, duration),
          },
        });
      }
    }
  }

  // ============================================================
  // Reset
  // ============================================================

  function resetRotationInterface() {
    resetCubeOrientation();
    resetCameraView();

    customMoveControls.reset();

    durationSlider.value = "1";
    durationValue.value = "1";
    updateDurationState();

    clearRotationEntries();
    rotationActions.length = 0;
    pendingRotationEntries.length = 0;
    queuedRotationActions = [];
    cursorRotationEntry = null;
    rotationPlaybackState = "idle";
    rotationStopRequested = false;
    durationState.paused = false;
    durationState.pauseStartedAt = null;
    durationState.stopAfterCurrent = false;
    updateRotationMediaControlState();
    setRotationStatus("idle");
    setPlayPauseIcon(false);
    rotationCursor.style.display = "none";
    pendingRotationCount = 0;
    setRotationControlVisibility();
    rotationText.replaceChildren(rotationStartTarget, rotationCursor);
    rotationText.dataset.empty = "true";
    rotationText.style.display = "block";
    copyIconImage.src = copyIcon;
    syncRotationBlockLayout();

    fixedRadio.checked = false;
    customRadio.checked = false;

    moveType = null;

    fixedMoveControls.setVisible(false);
    customMoveControls.setVisible(false);
  }

  function resetEverythingInterface() {
    updateCubeResizeButton(false);
    resetCube();
    cubeDimensionPanel.reset();
    resetColorsInterface();
    resetRotationInterface();
    resetLabelsState();
    resetViewState();

    viewPanelController.setExpanded(false);

    rotationCollapsed = window.innerWidth <= 900;
    rotationContent.style.display = rotationCollapsed ? "none" : "block";
    updateRotationToggle();

    cubeDimensionPanel.useGlobalMode();

    labelsCollapsed = true;
    labelsContent.style.display = "none";
    labelsCollapseIcon.textContent = "+";
    labelsHeader.setAttribute("aria-expanded", "false");

    colorsCollapsed = true;
    colorsContent.style.display = "none";
    colorsPanel.style.overflowY = "hidden";
    colorsCollapseIcon.textContent = "+";
    colorsHeader.setAttribute("aria-expanded", "false");

    cubeCollapsed = true;
    cubeContent.style.display = "none";
    cubeCollapseIcon.textContent = "+";
    cubeHeader.setAttribute("aria-expanded", "false");

    setupPanel.setExpanded(false);
    rotationToolbarOffset.x = 0;
    rotationToolbarOffset.y = 0;
    syncRotationBlockLayout();
    scheduleCubePanelPositionUpdate();
  }

  const resetEverythingButton = document.createElement("button");

  resetEverythingButton.type = "button";
  resetEverythingButton.textContent = "RESET EVERYTHING";
  resetEverythingButton.style.position = "absolute";
  resetEverythingButton.style.top = "20px";
  resetEverythingButton.style.left = "20px";
  resetEverythingButton.style.height = "42px";
  resetEverythingButton.style.width = "220px";
  resetEverythingButton.style.padding = "8px";
  resetEverythingButton.style.cursor = "pointer";
  resetEverythingButton.style.background = "#f8d7da";
  resetEverythingButton.style.border = "1px solid #c94c59";
  resetEverythingButton.style.color = "#842029";
  resetEverythingButton.style.fontWeight = "bold";
  resetEverythingButton.style.boxSizing = "border-box";
  addHoverEffect(resetEverythingButton, "#f3c7cc");

  resetEverythingButton.addEventListener("click", async () => {
    resetEverythingButton.disabled = true;

    try {
      await stopRotationAndWait({ force: true });
      resetEverythingInterface();
      markSetupChanged();
    } finally {
      resetEverythingButton.disabled = false;
    }
  });

  controlsRoot.appendChild(resetEverythingButton);

  const historyButton = document.createElement("button");

  historyButton.className = "history-control";
  historyButton.type = "button";
  historyButton.textContent = "History";
  historyButton.style.position = "absolute";
  historyButton.style.top = "70px";
  historyButton.style.left = "20px";
  historyButton.style.width = "220px";
  historyButton.style.height = "42px";
  historyButton.style.padding = "8px";
  historyButton.style.cursor = "pointer";
  historyButton.style.boxSizing = "border-box";

  controlsRoot.appendChild(historyButton);

  const rightSidePanels = [
    cubePanel,
    viewPanel,
    colorsPanel,
    labelsPanel,
    setupPanel.root,
  ];

  for (const panel of [cubePanel, colorsPanel, labelsPanel]) {
    panel.style.border = UI_PANEL_BORDER;
    panel.style.borderRadius = UI_PANEL_BORDER_RADIUS;
  }

  let rightPanelsCollapsed = false;
  const rightPanelsChevron = document.createElement("button");

  rightPanelsChevron.className = "right-panels-chevron";
  rightPanelsChevron.type = "button";
  rightPanelsChevron.style.position = "absolute";
  rightPanelsChevron.style.right = "2px";
  rightPanelsChevron.style.width = "18px";
  rightPanelsChevron.style.padding = "0";
  rightPanelsChevron.style.border = UI_PANEL_BORDER;
  rightPanelsChevron.style.cursor = "pointer";
  rightPanelsChevron.style.zIndex = "2";
  rightPanelsChevron.style.boxSizing = "border-box";
  stylePanelChevron(rightPanelsChevron, "right", { showShadow: false });
  controlsRoot.appendChild(rightPanelsChevron);

  syncRightPanelChevron = () => {
    if (window.innerWidth <= 900) {
      rightPanelsCollapsed = false;
      rightSidePanels.forEach((panel) => {
        panel.style.transform = "";
        panel.style.borderRadius = UI_PANEL_BORDER_RADIUS;
      });
      rightPanelsChevron.style.display = "none";
      return;
    }

    const bounds = rightSidePanels.map((panel) =>
      panel.getBoundingClientRect(),
    );
    const stackTop = Math.min(...bounds.map((rect) => rect.top));
    const stackBottom = Math.max(...bounds.map((rect) => rect.bottom));

    const direction = rightPanelsCollapsed ? "left" : "right";

    rightSidePanels.forEach((panel) => {
      panel.style.borderRadius = rightPanelsCollapsed
        ? UI_PANEL_BORDER_RADIUS
        : `${UI_PANEL_BORDER_RADIUS} 0 0 ${UI_PANEL_BORDER_RADIUS}`;
    });
    rightPanelsChevron.style.display = "flex";
    rightPanelsChevron.style.alignItems = "center";
    rightPanelsChevron.style.justifyContent = "center";
    rightPanelsChevron.style.top = `${stackTop + window.scrollY}px`;
    rightPanelsChevron.style.height = `${stackBottom - stackTop}px`;
    setPanelChevronShape(rightPanelsChevron, direction, !rightPanelsCollapsed);
    setPanelChevronIcon(rightPanelsChevron, direction);
    rightPanelsChevron.title = rightPanelsCollapsed
      ? "Expand Right Panels"
      : "Collapse Right Panels";
    rightPanelsChevron.setAttribute("aria-label", rightPanelsChevron.title);
    rightPanelsChevron.setAttribute(
      "aria-expanded",
      String(!rightPanelsCollapsed),
    );

    for (const panel of rightSidePanels) {
      panel.style.transition =
        "transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1)";
      panel.style.transform = rightPanelsCollapsed
        ? "translateX(calc(100% + 20px))"
        : "";
    }
  };

  rightPanelsChevron.addEventListener("click", () => {
    rightPanelsCollapsed = !rightPanelsCollapsed;
    syncRightPanelChevron();
    syncRotationBlockLayout();
  });

  for (const panel of rightSidePanels) {
    panel.addEventListener("transitionend", (event) => {
      if (event.propertyName === "transform") {
        syncRotationBlockLayout();
      }
    });
  }

  const rightPanelsResizeObserver = new ResizeObserver(syncRightPanelChevron);
  rightSidePanels.forEach((panel) => rightPanelsResizeObserver.observe(panel));
  window.addEventListener("resize", syncRightPanelChevron);
  syncRightPanelChevron();

  updateCubePanelPosition();
}
