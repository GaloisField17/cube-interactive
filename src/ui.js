import {
  Color,
  MathUtils,
  Vector3,
} from "three";
import arrowLimitDownIcon from "./assets/arrow-limit-down.svg";
import arrowLimitUpIcon from "./assets/arrow-limit-up.svg";
import chevronLeftIcon from "./assets/chevron-left.svg";
import chevronRightIcon from "./assets/chevron-right.svg";
import copyIcon from "./assets/copy.png";
import startStateIcon from "./assets/cube-state-0.svg";
import expandCubeIcon from "./assets/expand.svg";
import infoIcon from "./assets/info.png";
import nextRotationIcon from "./assets/next.svg";
import pauseIcon from "./assets/pause.svg";
import playIcon from "./assets/play.svg";
import previousRotationIcon from "./assets/previous.svg";
import resetIcon from "./assets/reset.png";
import shrinkCubeIcon from "./assets/shrink.svg";
import stopIcon from "./assets/stop.svg";
import toEndIcon from "./assets/toend.svg";
import toStartIcon from "./assets/tostart.svg";
import undoIcon from "./assets/undo.png";
import { default as copiedIcon } from "./assets/yes.png";
import {
  getCustomMoveLabel,
  getCustomRotationAngle,
  getRotationSequenceEditorState,
  normalizeWideMoveName,
  parseCustomMove,
  stripCustomMoveParentheses,
  tokenizeRotationSequence,
} from "./customRotation.js";
import { prefixWithLocalTimestamp } from "./exportFileName.js";
import { getFaceletLabel } from "./faceDefinitions.js";
import { createActivityDescription } from "./activityDescriptions.js";
import { createJsonExport } from "./jsonExport.js";
import { createActivityLogState } from "./activityLogState.js";
import { createActivityCommitter } from "./ui/activityRecorder.js";
import {
  getCubeViewportDisplayHeight,
  getCubeViewportDisplayHeightBounds,
} from "./responsiveLayout.js";
import { CUBE_BACKGROUND_COLOR } from "./sceneSetup.js";
import {
  createDefaultSetup,
  DEFAULT_FACELET_LABEL_COLOR,
} from "./setupDefaults.js";
import { createSvgArchive } from "./svgExport.js";
import { createAxisSceneController } from "./ui/axisSceneController.js";
import { createActivityLogWindow } from "./ui/activityLogWindow.js";
import { syncButtonDisabledAppearance } from "./ui/buttonDisabledAppearance.js";
import { createColorsPanel } from "./ui/colorsPanel.js";
import { createCubePanel } from "./ui/cubePanel.js";
import { createCustomMoveControls } from "./ui/customMoveControls.js";
import { createFaceletLabelController } from "./ui/faceletLabelController.js";
import { createFixedMoveControls } from "./ui/fixedMoveControls.js";
import { createLabelsPanel } from "./ui/labelsPanel.js";
import { openSetupImportDialog } from "./ui/setupImportDialog.js";
import { createSetupPanel } from "./ui/setupPanel.js";
import { createViewController } from "./ui/viewController.js";
import { createViewPanel } from "./ui/viewPanel.js";

const ROTATION_SEQUENCE_PLACEHOLDER = "e.g. R U R' U'";
const UI_FONT_FAMILY = "Arial, sans-serif";
const UI_FONT_SIZE = "14px";
const DEFAULT_ROTATION_TEXT_FONT_SIZE = 28;
const MIN_ROTATION_TEXT_FONT_SIZE = 20;
const ROTATION_TEXT_FONT_SIZE_STEP = 4;
const ROTATION_TEXT_MAX_ROWS = 2;
const MAX_NUMERIC_EDIT_VALUE = 100;
const COMPACT_ROTATION_TEXT_TOP_OFFSET = 168;
const DESKTOP_ROTATION_TEXT_TOP_OFFSET = 60;
const ROTATION_TIMELINE_HEIGHT = 16;
const ROTATION_TIMELINE_GAP = 4;
const ROTATION_TIMELINE_SLOT_HEIGHT =
  ROTATION_TIMELINE_HEIGHT + ROTATION_TIMELINE_GAP;
const ROTATION_TOOLBAR_FRAME_INSET = 7;
const RESIZE_CONTROL_SIZE = 20;
const RESIZE_CONTROL_GAP = 8;
const RESIZE_CUBE_COLLAPSE_ICON = shrinkCubeIcon;
const RESIZE_CUBE_EXPAND_ICON = expandCubeIcon;
const ROTATION_TEXT_COLLAPSE_ICON = arrowLimitUpIcon;
const ROTATION_TEXT_EXPAND_ICON = arrowLimitDownIcon;
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
  scene: sceneDependencies,
  viewport: viewportDependencies,
  cube: cubeDependencies,
  rotation: rotationDependencies,
}) {
  const {
    scene,
    renderer,
    camera,
    controls,
    resetCameraView,
    getDefaultCameraView,
  } = sceneDependencies;
  const { setCubeViewportCollapsed, setCubeViewportDisplayHeight } =
    viewportDependencies;
  const {
    cubies,
    facelets,
    colors,
    defaultColors,
    defaultSize,
    defaultGap,
    resetCube,
    updateCubeDimensions: updateCubeDimensionsFromCube,
    getCubeState,
    getDefaultCubeState,
    applyCubeState,
    size: initialSize,
    gap: initialGap,
  } = cubeDependencies;
  const {
    durationState,
    rotateSlice: rotateSliceFromCube,
    rotateMove: rotateMoveFromCube,
    getRotationDefinition,
    resetCubeOrientation: resetCubeOrientationFromCube,
    resetVisualRotations,
    normalizeAngle,
  } = rotationDependencies;

  // ============================================================
  // Local cube settings
  // ============================================================

  let size = initialSize;
  let gap = initialGap;
  let colorsPanel = null;
  let labelsPanel = null;
  let viewPanel = null;
  let viewPanelController = null;
  let setupPanel = null;
  let activityLogWindow = null;
  let isRestoringActivity = false;
  let syncRightPanelChevron = () => {};
  let updateFaceletLabelTransforms = () => {};
  let updateAxisHelperScale = () => {};
  const activityLogState = createActivityLogState();
  const viewController = createViewController({
    scene,
    camera,
    cubies,
    facelets,
    isValidColorValue,
  });

  function markSetupChanged() {
    viewController.refresh();
  }

  function recordActivity(activity) {
    if (isRestoringActivity) {
      return null;
    }

    const recordedActivity = activityLogState.addActivity(activity);

    activityLogWindow?.refresh();

    return recordedActivity;
  }

  function recordSettingActivity({
    parent,
    focus,
    filterFocus = focus,
    from,
    to,
  }) {
    if (JSON.stringify(from) === JSON.stringify(to)) {
      return null;
    }

    const { description, descriptionParts } = createActivityDescription(
      { parent, focus, from, to },
      { defaultCameraView: getDefaultCameraView() },
    );

    return recordActivity({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      kind: "change",
      parent,
      focus,
      filterFocus,
      description,
      descriptionParts,
      from,
      to,
      snapshot: getJsonExportSetup(),
    });
  }

  function recordSummaryActivity({
    kind,
    parent,
    focus,
    description,
    timestamp = new Date().toISOString(),
  }) {
    return recordActivity({
      id: crypto.randomUUID(),
      timestamp,
      kind,
      parent,
      focus,
      filterFocus: focus,
      description,
      snapshot: getJsonExportSetup(),
    });
  }

  function applyMappedActivityValues(values, getTarget, applyValue) {
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new TypeError("The activity does not contain a valid value map.");
    }

    for (const [id, value] of Object.entries(values)) {
      const item = getTarget(id);

      if (!item) {
        throw new Error(`The activity refers to an unavailable setting "${id}".`);
      }
      applyValue(item, value);
    }
  }

  function applyActivityValueToSetup(setup, activity, value) {
    if (activity.parent === "Rotation") {
      if (activity.focus === "Duration") {
        setup.rotations.durationSeconds = value;
        return;
      }
      if (["Insert", "Remove", "Edit"].includes(activity.focus)) {
        setup.rotations.moves = [...value];
        setup.rotations.text = value.join(" ");
        return;
      }
    }

    if (activity.parent === "Cube") {
      const property = activity.focus.startsWith("Size") ? "size" : "gap";

      if (typeof value === "number") {
        setup.cube[property] = value;
        for (const cubie of Object.values(setup.cube.cubies)) {
          cubie[property] = value;
        }
        return;
      }
      applyMappedActivityValues(
        value,
        (id) => setup.cube.cubies[id],
        (cubie, dimension) => {
          cubie[property] = dimension;
        },
      );
      return;
    }

    if (activity.parent === "Colors") {
      if (activity.focus.startsWith("Outer Facelet")) {
        applyMappedActivityValues(
          value,
          (id) =>
            Object.values(setup.cube.cubies)
              .find((cubie) => Object.hasOwn(cubie.facelets, id))
              ?.facelets[id],
          (facelet, color) => {
            facelet.color = color;
          },
        );
        return;
      }
      if (activity.focus.startsWith("Inner Cubie")) {
        applyMappedActivityValues(
          value,
          (id) => setup.cube.cubies[id],
          (cubie, color) => {
            cubie.innerColor = color;
          },
        );
        return;
      }

      const colorsTarget =
        activity.focus.startsWith("Facelet Label")
          ? setup.colors.faceletLabels
          : activity.focus.startsWith("Axis Label")
            ? setup.colors.axisLabels
            : activity.focus.startsWith("Rotation Arrow")
              ? setup.colors.rotationArrows
              : null;

      if (colorsTarget) {
        applyMappedActivityValues(
          value,
          (id) => (Object.hasOwn(colorsTarget, id) ? id : null),
          (id, color) => {
            colorsTarget[id] = color;
          },
        );
        return;
      }
    }

    if (activity.parent === "Camera") {
      setup.view.cameraPosition = { ...value.cameraPosition };
      setup.view.target = { ...value.target };
      return;
    }

    if (activity.parent === "View") {
      const settingByFocus = {
        "Ghost Sticker Visibility": "ghostStickersVisibility",
        "Peek Sticker Visibility": "peekStickersVisibility",
        "Peek Hide Color": "peekStickersHideWhenColor",
        "Peek Sticker Depth": "peekStickersDepth",
      };
      const setting = settingByFocus[activity.focus];

      if (setting) {
        setup.view[setting] = value;
        return;
      }
    }

    if (activity.parent === "Labels") {
      const simpleSettingByFocus = {
        "Facelet Labels": "facelets",
        "Facelet Label Visibility": "faceletVisibility",
        "Facelet Label Depth": "labelDepth",
        "Axis Labels": "axisLabels",
        "Axis Label Format": "axisLabelMode",
        "Axis Label Depth": "axisLabelDepth",
        "Axis Label Visibility": "axisLabelVisibility",
        "Axis Arrows": "axisArrows",
        "Axis Arrow Visibility": "axisArrowVisibility",
        "Axis Arrow Depth": "axisDepth",
        "Rotation Arrows": "rotationArrows",
        "Rotation Arrow Visibility": "rotationArrowVisibility",
        "Rotation Arrow Depth": "rotationArrowDepth",
        "Rotation Arrow Thickness": "rotationArrowThickness",
        "Rotation Arrow Radius": "rotationArrowRadius",
        "Rotation Arrow Direction": "rotationArrowDirection",
      };
      const setting = simpleSettingByFocus[activity.focus];

      if (setting) {
        setup.labels[setting] = value;
        return;
      }

      const axisLabelText = activity.focus.match(/^Axis Label Text \((.+)\)$/u);
      const faceVisibility = activity.focus.match(
        /^(Axis Label|Axis Arrow|Rotation Arrow) \((.+)\) Visibility$/u,
      );

      if (axisLabelText) {
        setup.labels.axisLabelsByFace[axisLabelText[1]].customText = value;
        return;
      }
      if (faceVisibility) {
        const [, type, face] = faceVisibility;
        const entryByType = {
          "Axis Label": setup.labels.axisLabelsByFace,
          "Axis Arrow": setup.labels.axisArrowsByFace,
          "Rotation Arrow": setup.labels.rotationArrowsByFace,
        };
        const entry = entryByType[type][face];

        if (!entry) {
          throw new Error(`The activity refers to an unavailable face "${face}".`);
        }
        entry.visible = value;
        return;
      }
    }

    if (activity.parent === "Jump") {
      throw new Error("Jump activities must restore their complete saved setup.");
    }

    throw new Error(
      `Revert is not supported for ${activity.parent}: ${activity.focus}.`,
    );
  }

  async function revertActivity(activity) {
    await stopRotationAndWait({ force: true });

    const previousSetup = getJsonExportSetup();
    const targetSetup =
      activity.parent === "Jump"
        ? structuredClone(activity.from)
        : structuredClone(previousSetup);
    const previousSuppressionState = isRestoringActivity;

    isRestoringActivity = true;
    try {
      if (activity.parent !== "Jump") {
        applyActivityValueToSetup(targetSetup, activity, activity.from);
      }
      applySetup(targetSetup);
      markSetupChanged();
    } finally {
      isRestoringActivity = previousSuppressionState;
    }

    const snapshot = getJsonExportSetup();
    const { description, descriptionParts } =
      activity.parent === "Jump"
        ? {
            description: "Restored the setup from before the selected Jump.",
            descriptionParts: undefined,
          }
        : createActivityDescription(
            activity,
            {
              reverting: true,
              defaultCameraView: getDefaultCameraView(),
            },
          );

    recordActivity({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      kind: "revert",
      parent: activity.parent,
      focus: activity.focus,
      filterFocus: activity.filterFocus,
      description,
      ...(descriptionParts ? { descriptionParts } : {}),
      from: activity.to,
      to: activity.from,
      snapshot,
    });
  }

  function recordControlActivity({ parent, focus, filterFocus, from, to }) {
    recordSettingActivity({
      parent,
      focus,
      filterFocus,
      from,
      to,
    });
  }

  function runResetActivity(parent, focus, action) {
    const previousSetup = getJsonExportSetup();

    action();

    if (JSON.stringify(previousSetup) !== JSON.stringify(getJsonExportSetup())) {
      recordSummaryActivity({
        kind: "reset",
        parent,
        focus,
        description: "Settings were reset using the individual reset button.",
      });
    }
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
  let cubeViewportResizeHandle = null;

  controlsRoot.className = "responsive-controls";
  document.body.appendChild(controlsRoot);
  document.addEventListener("input", markSetupChanged, true);
  document.addEventListener("change", markSetupChanged, true);
  controls.addEventListener("change", markSetupChanged);
  let cameraGestureStart = null;

  function getCameraGestureState() {
    return {
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
    };
  }

  function getCameraGestureMetrics(state) {
    const dx = state.cameraPosition.x - state.target.x;
    const dy = state.cameraPosition.y - state.target.y;
    const dz = state.cameraPosition.z - state.target.z;
    const distance = Math.hypot(dx, dy, dz);
    const defaultView = getDefaultCameraView();
    const defaultDistance = Math.hypot(
      defaultView.cameraPosition.x - defaultView.target.x,
      defaultView.cameraPosition.y - defaultView.target.y,
      defaultView.cameraPosition.z - defaultView.target.z,
    );

    return {
      distance,
      azimuth: (Math.atan2(dx, dz) * 180) / Math.PI,
      elevation: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI,
      zoomPercent: (defaultDistance / distance) * 100,
    };
  }

  function recordCameraGesture() {
    if (!cameraGestureStart) {
      return;
    }

    const from = cameraGestureStart;
    const to = getCameraGestureState();

    cameraGestureStart = null;

    if (JSON.stringify(from) === JSON.stringify(to)) {
      return;
    }

    const fromMetrics = getCameraGestureMetrics(from);
    const toMetrics = getCameraGestureMetrics(to);
    const targetDelta = new Vector3(
      to.target.x - from.target.x,
      to.target.y - from.target.y,
      to.target.z - from.target.z,
    );
    const movedTarget = targetDelta.length() > 1e-5;
    const changedZoom = Math.abs(
      fromMetrics.distance - toMetrics.distance,
    ) > 1e-5;
    const focus = movedTarget ? "Pan" : changedZoom ? "Zoom" : "Orbit";
    const { description, descriptionParts } = createActivityDescription(
      { parent: "Camera", focus, from, to },
      { defaultCameraView: getDefaultCameraView() },
    );

    recordActivity({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      kind: "change",
      parent: "Camera",
      focus,
      filterFocus: focus,
      description,
      descriptionParts,
      from,
      to,
      snapshot: getJsonExportSetup(),
    });
  }

  controls.addEventListener("start", () => {
    cameraGestureStart = getCameraGestureState();
  });
  controls.addEventListener("end", recordCameraGesture);

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
    .rotation-timeline {
      -webkit-appearance: none;
      appearance: none;
      border: 0;
      border-radius: 0;
      background: transparent;
      outline: none;
      cursor: pointer;
    }

    .rotation-timeline::-webkit-slider-runnable-track {
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(
        to right,
        #0f766e 0%,
        #0f766e var(--rotation-timeline-progress, 0%),
        #cbd5e1 var(--rotation-timeline-progress, 0%),
        #cbd5e1 100%
      );
    }

    .rotation-timeline::-moz-range-track {
      height: 3px;
      border-radius: 2px;
      background: #cbd5e1;
    }

    .rotation-timeline::-moz-range-progress {
      height: 3px;
      border-radius: 2px;
      background: #0f766e;
    }

    .rotation-timeline::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      margin-top: -4.5px;
      border: 0;
      background: #0f766e;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    }

    .rotation-timeline::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border: 0;
      border-radius: 0;
      background: #0f766e;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    }

    .rotation-timeline:focus-visible {
      outline: 2px solid #0f766e;
      outline-offset: 3px;
    }

    .rotation-timeline:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    html.rotation-toolbar-grab {
      cursor: grab;
    }

    html.rotation-toolbar-grab .cube-viewport canvas {
      cursor: grab !important;
    }

    html.rotation-toolbar-grabbing {
      cursor: grabbing;
    }

    html.rotation-toolbar-grabbing .cube-viewport canvas {
      cursor: grabbing !important;
    }

    html.cube-grab-active .cube-viewport canvas {
      cursor: grabbing !important;
    }

    .rotation-sequence.rotation-input-rejected {
      border-color: #E57373 !important;
      box-shadow: 0 0 0 2px rgba(229, 115, 115, 0.4) !important;
      background-color: rgba(229, 115, 115, 0.18) !important;
    }

    .rotation-sequence.rotation-input-rejected .rotation-entry {
      animation: none !important;
      background-color: rgba(229, 115, 115, 0.32) !important;
      color: #7f1d1d !important;
    }

    .rotation-text-info.rotation-text-info-pulsing {
      --rotation-text-info-pulse-color: rgba(229, 115, 115, 0.85);
      animation: rotation-text-info-rejection-pulse 600ms ease-in-out 2;
      border-radius: 4px;
    }

    .rotation-text-info.rotation-text-info-pulsing-orange {
      --rotation-text-info-pulse-color: rgba(255, 152, 0, 0.9);
    }

    @keyframes rotation-text-info-rejection-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(229, 115, 115, 0);
      }
      50% {
        box-shadow: 0 0 9px 4px var(--rotation-text-info-pulse-color);
      }
    }

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
    getFaceletLabels: () => faceletLabelController.getLabels(),
    getAxisGroup: () => axisGroup,
    getRotationArrowGroup: () => rotationArrowGroup,
    getAxisLabelText: (label) => {
      const axisDefinition = label.userData.axisDefinition;

      return axisDefinition
        ? labelsPanelController.getAxisLabelText(axisDefinition)
        : undefined;
    },
    getRotationArrowThickness: () =>
      labelsPanelController.getSetupState().rotationArrowThickness,
    getFaceletLabelsVisibility: () =>
      labelsPanelController.getSetupState().faceletVisibility,
    getAxisLabelsVisibility: () =>
      labelsPanelController.getSetupState().axisLabelVisibility,
    getAxisArrowsVisibility: () =>
      labelsPanelController.getSetupState().axisArrowVisibility,
    getRotationArrowsVisibility: () =>
      labelsPanelController.getSetupState().rotationArrowVisibility,
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
    resetRotationWithActivity(),
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
  rotationCursor.style.backgroundColor = CUBE_BACKGROUND_COLOR;
  rotationCursor.style.verticalAlign = "-0.12em";
  rotationCursor.style.animation = "none";

  rotationText.appendChild(rotationStartTarget);
  rotationText.appendChild(rotationCursor);

  document.body.appendChild(rotationText);

  const rotationTimeline = document.createElement("input");

  rotationTimeline.className = "rotation-timeline";
  rotationTimeline.type = "range";
  rotationTimeline.min = "0";
  rotationTimeline.max = "0";
  rotationTimeline.step = "any";
  rotationTimeline.value = "0";
  rotationTimeline.disabled = true;
  rotationTimeline.title = "Rotation Timeline";
  rotationTimeline.setAttribute("aria-label", "Rotation Timeline");
  rotationTimeline.style.position = "absolute";
  rotationTimeline.style.display = "block";
  rotationTimeline.style.height = `${ROTATION_TIMELINE_HEIGHT}px`;
  rotationTimeline.style.padding = "0";
  rotationTimeline.style.margin = "0";
  rotationTimeline.style.boxSizing = "border-box";
  rotationTimeline.style.zIndex = "20";
  rotationTimeline.style.touchAction = "pan-y";
  document.body.appendChild(rotationTimeline);

  const rotationTimelineTicks = document.createElement("div");

  rotationTimelineTicks.className = "rotation-timeline-ticks";
  rotationTimelineTicks.setAttribute("aria-hidden", "true");
  rotationTimelineTicks.style.position = "absolute";
  rotationTimelineTicks.style.display = "none";
  rotationTimelineTicks.style.height = "7px";
  rotationTimelineTicks.style.pointerEvents = "none";
  rotationTimelineTicks.style.zIndex = "21";
  rotationTimelineTicks.style.backgroundRepeat = "repeat-x";
  rotationTimelineTicks.style.backgroundPosition = "left center";
  document.body.appendChild(rotationTimelineTicks);

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
    const rowContentHeight = DEFAULT_ROTATION_TEXT_FONT_SIZE * 1.2 + 4;
    const maximumContentHeight =
      DEFAULT_ROTATION_TEXT_FONT_SIZE * 1.2 * ROTATION_TEXT_MAX_ROWS + 4;

    return {
      verticalPadding,
      rowContentHeight,
      maximumContentHeight,
      oneRowBoxHeight: Math.ceil(
        rowContentHeight + verticalPadding + verticalBorders,
      ),
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
      rotationTimeline,
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

    rotationText.style.whiteSpace = "normal";
    rotationText.style.overflowWrap = "normal";
    rotationText.style.overflowX = "hidden";
    rotationText.style.height = "auto";
    rotationText.style.minHeight = "0px";
    rotationText.style.maxHeight = "none";
    rotationText.style.overflowY = "hidden";

    const {
      verticalPadding,
      rowContentHeight,
      maximumContentHeight,
      oneRowBoxHeight,
      maximumBoxHeight,
    } = getRotationTextHeightLimits();

    rotationText.style.lineHeight = `${DEFAULT_ROTATION_TEXT_FONT_SIZE * 1.2}px`;
    rotationText.style.fontSize = `${DEFAULT_ROTATION_TEXT_FONT_SIZE}px`;

    if (rotationText.dataset.empty === "true") {
      rotationText.style.height = `${oneRowBoxHeight}px`;
      rotationText.style.minHeight = `${oneRowBoxHeight}px`;
      rotationText.style.maxHeight = `${oneRowBoxHeight}px`;
      rotationText.style.overflowY = "hidden";
      return;
    }

    const oneRowContentHeight = rotationText.scrollHeight - verticalPadding;
    const needsSecondRow = oneRowContentHeight > rowContentHeight;
    let needsVerticalScroll = false;

    if (needsSecondRow) {
      for (
        let fontSize = DEFAULT_ROTATION_TEXT_FONT_SIZE;
        fontSize >= MIN_ROTATION_TEXT_FONT_SIZE;
        fontSize -= ROTATION_TEXT_FONT_SIZE_STEP
      ) {
        rotationText.style.fontSize = `${fontSize}px`;
        rotationText.style.lineHeight = `${fontSize * 1.2}px`;

        if (
          rotationText.scrollHeight - verticalPadding <=
          maximumContentHeight
        ) {
          break;
        }

        if (fontSize === MIN_ROTATION_TEXT_FONT_SIZE) {
          needsVerticalScroll = true;
        }
      }
    }

    const boxHeight = needsSecondRow ? maximumBoxHeight : oneRowBoxHeight;

    rotationText.style.height = `${boxHeight}px`;
    rotationText.style.minHeight = `${boxHeight}px`;
    rotationText.style.maxHeight = `${boxHeight}px`;
    rotationText.style.overflowY = needsVerticalScroll ? "auto" : "hidden";
  }

  function syncRotationBlockLayout() {
    resizeRotationTextControl.button.style.display = "flex";
    const isRotationTextVisible = rotationText.style.display !== "none";
    rotationTextInfoControl.button.style.display = isRotationTextVisible
      ? "flex"
      : "none";
    const resizeRotationTextLabel = isRotationTextVisible
      ? "Collapse Rotation Text"
      : "Expand Rotation Text";

    resizeRotationTextControl.button.title = resizeRotationTextLabel;
    resizeRotationTextControl.button.setAttribute(
      "aria-label",
      resizeRotationTextLabel,
    );
    resizeRotationTextControl.image.src = isRotationTextVisible
      ? ROTATION_TEXT_COLLAPSE_ICON
      : ROTATION_TEXT_EXPAND_ICON;
    resizeRotationTextControl.button.setAttribute(
      "aria-pressed",
      String(isRotationTextVisible),
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
      rotationTimeline,
      rotationTimelineTicks,
      rotationText,
      startStateButton,
      copyRotationButton,
      undoRotationButton,
      ...navigationButtons,
      resizeCubeControl.button,
      resizeRotationTextControl.button,
      rotationTextInfoControl.button,
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
      ? rotationBlockTop + historyTopOffset + ROTATION_TIMELINE_SLOT_HEIGHT
      : rotationBlockTop +
        DESKTOP_ROTATION_TEXT_TOP_OFFSET +
        ROTATION_TIMELINE_SLOT_HEIGHT;
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
          ? Number.parseFloat(rotationTimeline.style.top) +
            rotationTimeline.getBoundingClientRect().height
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
      narrowDesktopToolbar
        ? rotationBlockTop + 112 + ROTATION_TIMELINE_SLOT_HEIGHT
        : rotationTextTop
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
    rotationTimeline.style.display = "block";
    rotationTimeline.style.left = `${rotationTextLeft}px`;
    rotationTimeline.style.top = `${
      Number.parseFloat(rotationText.style.top) - ROTATION_TIMELINE_SLOT_HEIGHT
    }px`;
    rotationTimeline.style.width = `${rotationTextWidth}px`;
    rotationTimelineTicks.style.display = rotationTimeline.disabled
      ? "none"
      : "block";
    rotationTimelineTicks.style.left = `${rotationTextLeft}px`;
    rotationTimelineTicks.style.top = `${
      Number.parseFloat(rotationTimeline.style.top) +
      (ROTATION_TIMELINE_HEIGHT - 7) / 2
    }px`;
    rotationTimelineTicks.style.width = `${rotationTextWidth}px`;
    const timelineStepWidth = Math.max(
      1,
      rotationTextWidth / Math.max(getRotationEntries().length, 1),
    );
    rotationTimelineTicks.style.backgroundImage = `repeating-linear-gradient(to right, rgba(71, 85, 105, 0.7) 0 1px, transparent 1px ${timelineStepWidth}px)`;

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
    const rotationTextElementTop = Number.parseFloat(rotationText.style.top);
    const rotationTextBottomControlTop =
      rotationTextElementTop +
      rotationText.getBoundingClientRect().height -
      RESIZE_CONTROL_SIZE;
    const resizeRotationTextTop =
      rotationText.style.display === "none"
        ? startStateTop + startStateHeight - RESIZE_CONTROL_SIZE
        : rotationTextBottomControlTop;

    resizeCubeControl.button.style.top = `${startStateTop}px`;
    resizeCubeControl.button.style.left = `${resizeControlLeft}px`;
    resizeRotationTextControl.button.style.top = `${resizeRotationTextTop}px`;
    resizeRotationTextControl.button.style.left = `${resizeControlLeft}px`;
    if (isRotationTextVisible) {
      rotationTextInfoControl.button.style.top = `${rotationTextElementTop}px`;
      rotationTextInfoControl.button.style.left = `${resizeControlLeft}px`;
    }

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

    if (cubeViewportResizeHandle) {
      cubeViewportResizeHandle.style.top = `${
        rotationToolbarFrame.getBoundingClientRect().top -
        cubeViewportResizeHandle.getBoundingClientRect().height / 2
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
  let cubeGrabPointerStart = null;
  let suppressToolbarClick = false;

  function finishCubeGrab(event) {
    if (
      event?.pointerId !== undefined &&
      cubeGrabPointerStart?.pointerId !== event.pointerId
    ) {
      return;
    }

    cubeGrabPointerStart = null;
    document.documentElement.classList.remove("cube-grab-active");
  }

  window.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.target !== renderer.domElement ||
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        !controls.enabled ||
        !controls.enableRotate
      ) {
        return;
      }

      cubeGrabPointerStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    true,
  );

  window.addEventListener(
    "pointermove",
    (event) => {
      if (cubeGrabPointerStart?.pointerId !== event.pointerId) {
        return;
      }

      if (
        Math.hypot(
          event.clientX - cubeGrabPointerStart.x,
          event.clientY - cubeGrabPointerStart.y,
        ) >= 4
      ) {
        document.documentElement.classList.add("cube-grab-active");
      }
    },
    true,
  );

  window.addEventListener("pointerup", finishCubeGrab, true);
  window.addEventListener("pointercancel", finishCubeGrab, true);
  window.addEventListener("blur", finishCubeGrab);

  function isRotationToolbarDragTarget(event) {
    if (
      window.innerWidth <= 900 ||
      (event.target instanceof Element &&
        (event.target.closest("button") ||
          event.target.closest(".rotation-sequence") ||
          event.target.closest(".rotation-timeline")))
    ) {
      return false;
    }

    const bounds = rotationToolbarFrame.getBoundingClientRect();

    return (
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    );
  }

  function updateRotationToolbarCursor(event) {
    const isDragging = Boolean(rotationToolbarDragStart?.moved);
    const isHovering = !isDragging && isRotationToolbarDragTarget(event);

    document.documentElement.classList.toggle(
      "rotation-toolbar-grab",
      isHovering,
    );
    document.documentElement.classList.toggle(
      "rotation-toolbar-grabbing",
      isDragging,
    );
  }

  window.addEventListener(
    "pointerdown",
    (event) => {
      if (!isRotationToolbarDragTarget(event)) {
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
      updateRotationToolbarCursor(event);
    },
    true,
  );

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!rotationToolbarDragStart) {
        updateRotationToolbarCursor(event);
        return;
      }

      if (rotationToolbarDragStart.pointerId !== event.pointerId) {
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

      updateRotationToolbarCursor(event);
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
    updateRotationToolbarCursor(event);
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
    rotationText.focus({ preventScroll: true });
    setRotationEditorCaret(getRotationEditorText().length);
    rotationText.scrollTop = rotationText.scrollHeight;
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
  let rotationEditorBaseline = null;
  let queuedRotationActions = [];
  let cursorRotationEntry = null;
  let rotationPlaybackState = "idle";
  let rotationTimelineProgressCallback = null;
  let rotationTimelineSeeking = false;
  let rotationTimelineScrubbing = false;
  let rotationTimelinePausedForScrub = false;
  let rotationTimelineSeekGeneration = 0;
  let rotationTimelineScrubFrame = null;
  let rotationTimelineScrubTargetPosition = null;
  let rotationTimelineScrubAppliedPosition = null;
  let rotationTimelineScrubInProgress = false;
  let rotationStopRequested = false;
  let stopRotationPromise = null;
  const rotationStopWaiters = [];

  function includesSequenceWithOneInsertion(shorter, longer) {
    if (longer.length !== shorter.length + 1) {
      return false;
    }

    let shorterIndex = 0;

    for (const item of longer) {
      if (item === shorter[shorterIndex]) {
        shorterIndex += 1;
      }
    }

    return shorterIndex === shorter.length;
  }

  function recordRotationSequenceChange(from, to) {
    if (JSON.stringify(from) === JSON.stringify(to)) {
      return;
    }

    const focus = includesSequenceWithOneInsertion(from, to)
      ? "Insert"
      : includesSequenceWithOneInsertion(to, from)
        ? "Remove"
        : "Edit";
    recordSettingActivity({
      parent: "Rotation",
      focus,
      filterFocus: focus,
      from,
      to,
    });
  }

  function setRotationTimelinePosition(
    position,
    entries = getRotationEntries(),
  ) {
    const safePosition = MathUtils.clamp(position, 0, entries.length);
    const progressPercent =
      entries.length === 0 ? 0 : (safePosition / entries.length) * 100;

    rotationTimeline.min = "0";
    rotationTimeline.max = String(entries.length);
    rotationTimeline.disabled = entries.length === 0;
    rotationTimeline.value = String(safePosition);
    rotationTimeline.style.setProperty(
      "--rotation-timeline-progress",
      `${progressPercent}%`,
    );
    rotationTimeline.setAttribute(
      "aria-valuetext",
      `${safePosition.toFixed(2)} of ${entries.length} rotations`,
    );
  }

  function syncRotationTimeline(entries = getRotationEntries(), cursor = null) {
    rotationTimeline.max = String(entries.length);
    rotationTimeline.disabled = entries.length === 0;

    if (
      rotationTimelineSeeking ||
      rotationTimelineScrubbing ||
      rotationTimelineProgressCallback
    ) {
      return;
    }

    const selectedEntry =
      cursor ?? pendingRotationEntries[0] ?? cursorRotationEntry;
    const selectedIndex = selectedEntry ? entries.indexOf(selectedEntry) : -1;

    setRotationTimelinePosition(Math.max(selectedIndex + 1, 0), entries);
  }

  function cancelScheduledRotationTimelineScrub() {
    if (rotationTimelineScrubFrame !== null) {
      cancelAnimationFrame(rotationTimelineScrubFrame);
      rotationTimelineScrubFrame = null;
    }
  }

  function scheduleRotationTimelineScrub() {
    rotationTimelineScrubTargetPosition = MathUtils.clamp(
      Number(rotationTimeline.value),
      0,
      getRotationEntries().length,
    );

    if (rotationTimelineScrubFrame !== null) {
      return;
    }

    rotationTimelineScrubFrame = requestAnimationFrame(() => {
      rotationTimelineScrubFrame = null;

      const targetPosition = rotationTimelineScrubTargetPosition;

      if (targetPosition === rotationTimelineScrubAppliedPosition) {
        return;
      }

      void scrubRotationTimelineToPosition(targetPosition);
    });
  }

  rotationTimeline.addEventListener("pointerdown", () => {
    rotationTimelineScrubbing = true;
    rotationTimelineScrubAppliedPosition = null;
  });

  rotationTimeline.addEventListener("input", () => {
    if (
      rotationPlaybackState === "playing" &&
      !rotationTimelinePausedForScrub
    ) {
      rotationTimelinePausedForScrub = true;
      pauseRotationAnimation();
    }

    setRotationTimelinePosition(Number(rotationTimeline.value));
    scheduleRotationTimelineScrub();
  });

  function getAdjacentRotationTimelineBoundary(
    position,
    direction,
    entries = getRotationEntries(),
  ) {
    const boundary =
      direction === "next" ? Math.floor(position) + 1 : Math.ceil(position) - 1;

    return MathUtils.clamp(boundary, 0, entries.length);
  }

  rotationTimeline.addEventListener("keydown", (event) => {
    const entries = getRotationEntries();
    const currentPosition = Number(rotationTimeline.value);
    let targetBoundary = null;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      targetBoundary = getAdjacentRotationTimelineBoundary(
        currentPosition,
        "next",
        entries,
      );
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      targetBoundary = getAdjacentRotationTimelineBoundary(
        currentPosition,
        "previous",
        entries,
      );
    } else if (event.key === "Home") {
      targetBoundary = 0;
    } else if (event.key === "End") {
      targetBoundary = entries.length;
    } else if (event.key === "PageUp") {
      targetBoundary =
        Math.ceil(currentPosition) +
        Math.max(1, Math.ceil(entries.length / 10));
    } else if (event.key === "PageDown") {
      targetBoundary =
        Math.floor(currentPosition) -
        Math.max(1, Math.ceil(entries.length / 10));
    }

    if (targetBoundary === null) {
      return;
    }

    event.preventDefault();
    void seekRotationTimeline(targetBoundary);
  });

  rotationTimeline.addEventListener("change", () => {
    cancelScheduledRotationTimelineScrub();
    const targetBoundary = Math.round(Number(rotationTimeline.value));

    rotationTimelineScrubbing = false;
    rotationTimelinePausedForScrub = false;
    rotationTimeline.step = "any";
    rotationTimelineScrubTargetPosition = targetBoundary;

    void scrubRotationTimelineToPosition(targetBoundary);
  });

  rotationTimeline.addEventListener("pointerup", () => {
    rotationTimelineScrubbing = false;
    rotationTimelinePausedForScrub = false;
    rotationTimeline.step = "any";
    rotationTimelineScrubTargetPosition = Math.round(
      Number(rotationTimeline.value),
    );
    void scrubRotationTimelineToPosition(rotationTimelineScrubTargetPosition);
  });

  rotationTimeline.addEventListener("pointercancel", () => {
    cancelScheduledRotationTimelineScrub();
    rotationTimelineScrubbing = false;
    rotationTimeline.step = "any";
    rotationTimelineScrubTargetPosition = Math.round(
      Number(rotationTimeline.value),
    );
    void scrubRotationTimelineToPosition(rotationTimelineScrubTargetPosition);

    if (rotationTimelinePausedForScrub) {
      rotationTimelinePausedForScrub = false;
      resumePausedRotation();
    } else {
      syncRotationTimeline();
    }
  });

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
    const canStepPausedRotation = isPaused && hasActiveRotation;
    const timelinePosition = Number(rotationTimeline.value);
    const previousStepBoundary = getAdjacentRotationTimelineBoundary(
      timelinePosition,
      "previous",
      entries,
    );
    const nextStepBoundary = getAdjacentRotationTimelineBoundary(
      timelinePosition,
      "next",
      entries,
    );
    const canEditSequence = !hasActiveRotation && !isAnimating && !isPaused;

    syncRotationTimeline(entries, currentCursor);
    rotationText.contentEditable = String(canEditSequence);

    copyRotationButton.disabled = !hasRotations;
    undoRotationButton.disabled = !hasRotations || hasActiveRotation;
    playPauseButton.style.display = "block";

    for (const entry of entries) {
      entry.setAttribute("aria-selected", String(entry === currentCursor));
    }

    toStartButton.disabled = !hasRotations || isAtStartPosition;
    previousRotationButton.disabled =
      !hasRotations ||
      isRebuilding ||
      (canStepPausedRotation
        ? previousStepBoundary >= timelinePosition
        : isAtStartPosition || isRotationAnimating);
    toEndButton.disabled =
      !hasRotations || (isStopped && isAtLastEntry && !hasActiveRotation);
    nextRotationButton.disabled =
      !hasRotations ||
      isRebuilding ||
      (canStepPausedRotation
        ? nextStepBoundary <= timelinePosition
        : !hasNextRotation || isRotationAnimating || hasActiveRotation);
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
      syncButtonDisabledAppearance(button);
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
      rotationText.appendChild(document.createTextNode("\u00a0"));
    }

    rotationText.appendChild(rotationCursor);
    rotationText.dataset.empty = String(state.tokens.length === 0);
  }

  function getNormalizedRotationEditorCaret(state, caretOffset) {
    let normalizedOffset = 0;

    for (const [index, token] of state.tokens.entries()) {
      if (caretOffset <= token.end) {
        return (
          normalizedOffset +
          MathUtils.clamp(caretOffset - token.start, 0, token.text.length)
        );
      }

      normalizedOffset += token.text.length;
      const nextToken = state.tokens[index + 1];

      if (nextToken) {
        if (caretOffset <= nextToken.start) {
          return normalizedOffset + 1;
        }

        normalizedOffset += 1;
      }
    }

    if (
      state.trailingWhitespace &&
      (!state.tokens.length || caretOffset > state.tokens.at(-1).end)
    ) {
      return normalizedOffset + 1;
    }

    return normalizedOffset;
  }

  function scrollRotationTextEntryIntoView(targetEntry) {
    if (rotationText.style.overflowY !== "auto") {
      return;
    }

    if (!targetEntry) {
      return;
    }

    const entryBounds = targetEntry.getBoundingClientRect();
    const textBounds = rotationText.getBoundingClientRect();
    const textStyles = getComputedStyle(rotationText);
    const visibleTop =
      textBounds.top + Number.parseFloat(textStyles.paddingTop);
    const visibleBottom =
      textBounds.bottom - Number.parseFloat(textStyles.paddingBottom);

    if (entryBounds.top < visibleTop) {
      rotationText.scrollTop += entryBounds.top - visibleTop;
    } else if (entryBounds.bottom > visibleBottom) {
      rotationText.scrollTop += entryBounds.bottom - visibleBottom;
    }
  }

  function scrollRotationEditorEntryIntoView(state, caretOffset, actions) {
    let actionIndex = 0;
    let targetEntry = null;

    for (const token of state.tokens) {
      if (token === state.draft) {
        continue;
      }

      const action = actions[actionIndex++];

      if (caretOffset <= token.end) {
        targetEntry = action?.entry;
        break;
      }
    }

    targetEntry ??= actions.at(-1)?.entry;

    if (!targetEntry) {
      return;
    }

    scrollRotationTextEntryIntoView(targetEntry);
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

  let invalidRotationInputTimeout = null;

  function pulseRotationTextInfoButton(color = "red") {
    const button = rotationTextInfoControl.button;

    button.classList.remove(
      "rotation-text-info-pulsing",
      "rotation-text-info-pulsing-orange",
    );
    if (color === "orange") {
      button.classList.add("rotation-text-info-pulsing-orange");
    }
    void button.offsetWidth;
    button.classList.add("rotation-text-info-pulsing");
  }

  function showInvalidRotationInput() {
    rotationText.classList.add("rotation-input-rejected");
    pulseRotationTextInfoButton();
    window.clearTimeout(invalidRotationInputTimeout);
    invalidRotationInputTimeout = window.setTimeout(() => {
      rotationText.classList.remove("rotation-input-rejected");
    }, 450);
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
      showInvalidRotationInput();

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
    setRotationEditorCaret(
      getNormalizedRotationEditorCaret(state, caretOffset),
    );
    syncRotationBlockLayout();

    if (document.activeElement === rotationText) {
      scrollRotationEditorEntryIntoView(state, caretOffset, nextActions);
    }

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
      { allowDraftOutsideCaret: true },
    );

    if (editorState?.draft) {
      pulseRotationTextInfoButton("orange");
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
    if (rotationEditorBaseline) {
      recordRotationSequenceChange(
        rotationEditorBaseline,
        rotationActions.map((action) => action.label),
      );
      rotationEditorBaseline = null;
    }

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

    if (!isEditorFocused || rotationTimelineScrubbing) {
      if (cursorEntry) {
        scrollRotationTextEntryIntoView(cursorEntry);
      } else if (rotationText.style.overflowY === "auto") {
        rotationText.scrollTop = 0;
      }
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
    if (canEditRotationSequence() && !rotationEditorBaseline) {
      rotationEditorBaseline = rotationActions.map((action) => action.label);
    }
    highlightActiveRotation();
  });

  rotationText.addEventListener("pointerdown", (event) => {
    const rotationTextBounds = rotationText.getBoundingClientRect();
    const isVerticalScrollbarPress =
      rotationText.scrollHeight > rotationText.clientHeight &&
      event.clientX >=
        rotationTextBounds.left +
          rotationText.clientLeft +
          rotationText.clientWidth;

    if (event.target !== rotationText || isVerticalScrollbarPress) {
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
    {
      record = true,
      display = true,
      animationEntry = null,
      onComplete,
      timelineStartBoundary = null,
      timelineEndBoundary = null,
    } = {},
  ) {
    const previousSequence = record
      ? rotationActions.map((rotationAction) => rotationAction.label)
      : null;

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
      recordRotationSequenceChange(
        previousSequence,
        rotationActions.map((rotationAction) => rotationAction.label),
      );
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

    const activeEntryIndex = getRotationEntries().indexOf(activeEntry);
    const timelineEnd =
      timelineEndBoundary ?? Math.max(activeEntryIndex + 1, 0);
    const timelineStart = timelineStartBoundary ?? timelineEnd - 1;
    const timelineProgressCallback = (progress) => {
      if (rotationTimelineProgressCallback !== timelineProgressCallback) {
        return;
      }

      setRotationTimelinePosition(
        timelineStart + (timelineEnd - timelineStart) * progress,
      );
    };

    rotationTimelineProgressCallback = timelineProgressCallback;
    durationState.onProgress = timelineProgressCallback;
    setRotationTimelinePosition(timelineStart);
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
      if (rotationTimelineProgressCallback === timelineProgressCallback) {
        rotationTimelineProgressCallback = null;
        if (durationState.onProgress === timelineProgressCallback) {
          durationState.onProgress = null;
        }
      }

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
        onProgress: null,
      };

      resetCube();
      updateFaceletLabelTransforms();

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

  async function seekRotationTimeline(
    boundary,
    { preserveSliderPosition = false } = {},
  ) {
    const generation = ++rotationTimelineSeekGeneration;
    const entries = getRotationEntries();
    const targetBoundary = MathUtils.clamp(
      Math.round(boundary),
      0,
      entries.length,
    );
    const wasAnimating =
      pendingRotationEntries.length > 0 ||
      rotationPlaybackState === "playing" ||
      rotationPlaybackState === "paused";

    rotationTimelineSeeking = true;
    rotationTimelineProgressCallback = null;
    durationState.onProgress = null;

    if (!preserveSliderPosition) {
      setRotationTimelinePosition(targetBoundary, entries);
    }

    if (pendingRotationEntries.length > 0) {
      queuedRotationActions = [];
      rotationStopRequested = true;
      await stopRotationAndWait({ force: true });

      if (generation !== rotationTimelineSeekGeneration) {
        return;
      }
    }

    queuedRotationActions = [];
    rotationStopRequested = false;
    durationState.stopAfterCurrent = false;
    durationState.paused = false;
    durationState.pauseStartedAt = null;
    cursorRotationEntry = entries[targetBoundary - 1] ?? null;

    if (wasAnimating) {
      rotationPlaybackState = "stopped";
      setRotationStatus("stopped");
      setPlayPauseIcon(false);
    }

    highlightActiveRotation();
    updateRotationMediaControlState();
    await rebuildCubeToCursor();

    if (generation !== rotationTimelineSeekGeneration) {
      return;
    }

    rotationTimelineSeeking = false;
    syncRotationTimeline();
  }

  async function previewRotationTimelinePosition(position) {
    resetVisualRotations();

    const entries = getRotationEntries();
    const previewBoundary = Math.floor(position);
    const fraction = position - previewBoundary;

    if (fraction <= 0 || previewBoundary >= entries.length) {
      return;
    }

    const actionLabel = rotationActions[previewBoundary]?.label;
    const normalizedMoveName = normalizeWideMoveName(actionLabel ?? "");
    const standardMove = getRotationDefinition(normalizedMoveName);
    let moveName = normalizedMoveName;
    let angle = standardMove?.angle;

    if (!standardMove) {
      const customMove = parseCustomMove(
        stripCustomMoveParentheses(actionLabel ?? ""),
      );

      if (!customMove) {
        return;
      }

      moveName = normalizeWideMoveName(customMove.moveName);

      if (!getRotationDefinition(moveName)) {
        return;
      }

      angle = getCustomRotationAngle(moveName, customMove.angle);
    }

    if (angle) {
      await rotateSliceFromCube(
        moveName,
        angle * fraction,
        NAVIGATION_DURATION,
        false,
      );
    }
  }

  async function scrubRotationTimelineToPosition(initialPosition) {
    if (rotationTimelineScrubInProgress) {
      return;
    }

    rotationTimelineScrubInProgress = true;
    let generation = ++rotationTimelineSeekGeneration;

    try {
      const isAnimating =
        pendingRotationEntries.length > 0 ||
        rotationPlaybackState === "playing" ||
        rotationPlaybackState === "paused" ||
        rotationTimelineSeeking ||
        rebuildInProgress;

      if (isAnimating) {
        const targetBoundary = Math.floor(
          rotationTimelineScrubTargetPosition ?? initialPosition,
        );

        await seekRotationTimeline(targetBoundary, {
          preserveSliderPosition: rotationTimelineScrubbing,
        });
        generation = rotationTimelineSeekGeneration;
      } else {
        rotationTimelineSeeking = true;
        rotationTimelineProgressCallback = null;
        durationState.onProgress = null;

        const scrubDuration = {
          ...durationState,
          value: NAVIGATION_DURATION,
          paused: false,
          pauseStartedAt: null,
          onProgress: null,
        };

        while (generation === rotationTimelineSeekGeneration) {
          const entries = getRotationEntries();
          const cursorIndex = cursorRotationEntry
            ? entries.indexOf(cursorRotationEntry)
            : -1;
          const currentBoundary = Math.max(cursorIndex + 1, 0);
          const requestedBoundary = MathUtils.clamp(
            Math.floor(rotationTimelineScrubTargetPosition ?? initialPosition),
            0,
            entries.length,
          );

          if (requestedBoundary === currentBoundary) {
            break;
          }

          const movingForward = requestedBoundary > currentBoundary;
          const actionIndex = movingForward
            ? currentBoundary
            : currentBoundary - 1;
          const recordedAction = rotationActions[actionIndex];
          const action = movingForward
            ? recordedAction
            : recordedAction?.inverse;

          if (!action?.run) {
            await seekRotationTimeline(requestedBoundary, {
              preserveSliderPosition: rotationTimelineScrubbing,
            });
            generation = rotationTimelineSeekGeneration;
            break;
          }

          resetVisualRotations();
          const completed = await action.run(scrubDuration);

          if (generation !== rotationTimelineSeekGeneration) {
            return;
          }

          if (completed === false) {
            await seekRotationTimeline(requestedBoundary, {
              preserveSliderPosition: rotationTimelineScrubbing,
            });
            generation = rotationTimelineSeekGeneration;
            break;
          }

          const nextBoundary = currentBoundary + (movingForward ? 1 : -1);

          cursorRotationEntry = entries[nextBoundary - 1] ?? null;
          queuedRotationActions = rotationActions.slice(nextBoundary);
          highlightActiveRotation();
          updateRotationMediaControlState();
        }
      }

      const targetPosition = MathUtils.clamp(
        rotationTimelineScrubTargetPosition ?? initialPosition,
        0,
        getRotationEntries().length,
      );

      if (rotationTimelineScrubbing) {
        await previewRotationTimelinePosition(targetPosition);
      } else {
        resetVisualRotations();
      }

      rotationTimelineScrubAppliedPosition = targetPosition;
    } finally {
      rotationTimelineScrubInProgress = false;

      if (generation === rotationTimelineSeekGeneration) {
        rotationTimelineSeeking = false;
        syncRotationTimeline();
      }

      if (
        rotationTimelineScrubbing &&
        rotationTimelineScrubTargetPosition !==
          rotationTimelineScrubAppliedPosition
      ) {
        scheduleRotationTimelineScrub();
      }
    }
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

    const previousSequence = rotationActions.map((action) => action.label);
    latestEntry.dataset.undoPending = "true";

    await queueRotationAction(latestAction.inverse, {
      record: false,
      display: false,
      animationEntry: latestEntry,
      timelineStartBoundary: entryIndex + 1,
      timelineEndBoundary: entryIndex,
    });

    rotationActions.pop();
    latestEntry.dataset.undoPending = "false";
    removeRotationEntry(latestEntry);
    cursorRotationEntry = previousEntry;
    recordRotationSequenceChange(
      previousSequence,
      rotationActions.map((action) => action.label),
    );

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

  const durationActivity = createActivityCommitter(
    () => durationState.value / 1000,
    (from, to) =>
      recordControlActivity({
        parent: "Rotation",
        focus: "Duration",
        filterFocus: "Duration",
        from,
        to,
      }),
  );

  durationSlider.addEventListener("input", () => {
    syncEditValueFromSlider(durationSlider, durationValue);
    updateDurationState();
  });
  durationSlider.addEventListener("change", () => durationActivity.commit());

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
  durationValue.addEventListener("change", () => durationActivity.commit());

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
    durationActivity.commit();
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
    "Collapse Cube",
    "rotation-resize-cube",
    RESIZE_CUBE_COLLAPSE_ICON,
  );
  resizeCubeControl.button.setAttribute("aria-pressed", "false");

  const cubeViewportPercentage = document.createElement("span");

  cubeViewportPercentage.setAttribute("aria-hidden", "true");
  Object.assign(cubeViewportPercentage.style, {
    position: "fixed",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "42px",
    height: "20px",
    padding: "0 5px",
    boxSizing: "border-box",
    borderRadius: "4px",
    background: "rgba(31, 41, 55, 0.88)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    fontVariantNumeric: "tabular-nums",
    lineHeight: "20px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: "30",
  });
  document.body.appendChild(cubeViewportPercentage);

  function getCubeViewportExpansionPercent(height) {
    const defaultHeight = getCubeViewportDisplayHeight(
      window.innerWidth,
      window.innerHeight,
    );

    return Math.round((height / defaultHeight) * 100);
  }

  function updateCubeViewportPercentage(height) {
    const buttonBounds = resizeCubeControl.button.getBoundingClientRect();

    cubeViewportPercentage.textContent = `${getCubeViewportExpansionPercent(
      height,
    )}%`;
    cubeViewportPercentage.style.display = "flex";

    const badgeBounds = cubeViewportPercentage.getBoundingClientRect();

    cubeViewportPercentage.style.left = `${Math.max(
      4,
      buttonBounds.left - badgeBounds.width - 8,
    )}px`;
    cubeViewportPercentage.style.top = `${
      buttonBounds.top + (buttonBounds.height - badgeBounds.height) / 2
    }px`;
  }

  function hideCubeViewportPercentage() {
    cubeViewportPercentage.style.display = "none";
  }

  function updateCubeResizeButton(isCollapsed) {
    const label = isCollapsed ? "Expand Cube" : "Collapse Cube";

    resizeCubeControl.button.title = label;
    resizeCubeControl.button.setAttribute("aria-label", label);
    resizeCubeControl.button.setAttribute("aria-pressed", String(isCollapsed));
    resizeCubeControl.image.src = isCollapsed
      ? RESIZE_CUBE_EXPAND_ICON
      : RESIZE_CUBE_COLLAPSE_ICON;
    setCubeViewportCollapsed(isCollapsed);
    syncRotationBlockLayout();
    updateCubeViewportResizeHandle(
      isCollapsed
        ? 0
        : getCubeViewportDisplayHeight(window.innerWidth, window.innerHeight),
    );
  }

  cubeViewportResizeHandle = document.createElement("div");

  cubeViewportResizeHandle.className = "cube-viewport-resize-handle";
  cubeViewportResizeHandle.setAttribute("role", "separator");
  cubeViewportResizeHandle.setAttribute("aria-label", "Resize cube view");
  cubeViewportResizeHandle.setAttribute("aria-orientation", "horizontal");
  cubeViewportResizeHandle.tabIndex = 0;
  document.body.appendChild(cubeViewportResizeHandle);

  function updateCubeViewportResizeHandle(height) {
    const bounds = getCubeViewportDisplayHeightBounds(window.innerHeight);
    const colorPercent = MathUtils.clamp(
      getCubeViewportExpansionPercent(height),
      0,
      100,
    );
    const colorChannel = Math.round(218 + 37 * (colorPercent / 100));

    cubeViewportResizeHandle.setAttribute(
      "aria-valuemin",
      String(Math.round(bounds.minimum)),
    );
    cubeViewportResizeHandle.setAttribute(
      "aria-valuemax",
      String(Math.round(bounds.maximum)),
    );
    cubeViewportResizeHandle.setAttribute(
      "aria-valuenow",
      String(Math.round(height)),
    );
    cubeViewportResizeHandle.style.top = `${
      rotationToolbarFrame.getBoundingClientRect().top -
      cubeViewportResizeHandle.getBoundingClientRect().height / 2
    }px`;
    document.documentElement.style.setProperty(
      "--cube-surround-background-color",
      `rgb(${colorChannel}, ${colorChannel}, ${colorChannel})`,
    );
  }

  function resizeCubeViewport(height) {
    if (height <= 0) {
      updateCubeResizeButton(true);

      if (activeResizePointer !== null) {
        updateCubeViewportPercentage(0);
      }

      return;
    }

    if (resizeCubeControl.button.getAttribute("aria-pressed") === "true") {
      updateCubeResizeButton(false);
    }

    const actualHeight = setCubeViewportDisplayHeight(height);

    updateCubeViewportResizeHandle(actualHeight);
    syncRotationBlockLayout();

    if (activeResizePointer !== null) {
      updateCubeViewportPercentage(actualHeight);
    }
  }

  let activeResizePointer = null;
  let resizeStartPointerY = 0;
  let resizeStartHeight = 0;

  cubeViewportResizeHandle.addEventListener("pointerdown", (event) => {
    if (window.innerWidth > 900) {
      return;
    }

    activeResizePointer = event.pointerId;
    resizeStartPointerY = event.clientY;
    resizeStartHeight = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--cube-viewport-height",
      ),
    );
    cubeViewportResizeHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
    updateCubeViewportPercentage(resizeStartHeight);
  });

  cubeViewportResizeHandle.addEventListener("pointermove", (event) => {
    if (event.pointerId === activeResizePointer) {
      resizeCubeViewport(
        resizeStartHeight + event.clientY - resizeStartPointerY,
      );
    }
  });

  function endCubeViewportResize(event) {
    if (event.pointerId === activeResizePointer) {
      activeResizePointer = null;
      hideCubeViewportPercentage();
    }
  }

  cubeViewportResizeHandle.addEventListener("pointerup", endCubeViewportResize);
  cubeViewportResizeHandle.addEventListener(
    "pointercancel",
    endCubeViewportResize,
  );
  cubeViewportResizeHandle.addEventListener("keydown", (event) => {
    const currentHeight = Number(
      cubeViewportResizeHandle.getAttribute("aria-valuenow"),
    );
    const bounds = getCubeViewportDisplayHeightBounds(window.innerHeight);
    let nextHeight = currentHeight;

    if (event.key === "ArrowUp") {
      nextHeight -= 24;
    } else if (event.key === "ArrowDown") {
      nextHeight += 24;
    } else if (event.key === "Home") {
      nextHeight = bounds.minimum;
    } else if (event.key === "End") {
      nextHeight = bounds.maximum;
    } else {
      return;
    }

    event.preventDefault();
    resizeCubeViewport(nextHeight);
  });

  updateCubeViewportResizeHandle(
    getCubeViewportDisplayHeight(window.innerWidth, window.innerHeight),
  );

  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      const isCollapsed =
        resizeCubeControl.button.getAttribute("aria-pressed") === "true";
      const currentHeight = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--cube-viewport-height",
        ),
      );
      const defaultHeight = getCubeViewportDisplayHeight(
        window.innerWidth,
        window.innerHeight,
      );
      const displayHeight = isCollapsed
        ? 0
        : Number.isFinite(currentHeight)
          ? currentHeight
          : defaultHeight;

      updateCubeViewportResizeHandle(displayHeight);
    });
  });

  resizeCubeControl.button.addEventListener("click", () => {
    const isCollapsed =
      resizeCubeControl.button.getAttribute("aria-pressed") !== "true";

    updateCubeResizeButton(isCollapsed);
  });

  const resizeRotationTextControl = createResizeControl(
    "Collapse Rotation Text",
    "rotation-resize-text",
    ROTATION_TEXT_COLLAPSE_ICON,
  );
  resizeRotationTextControl.button.setAttribute("aria-pressed", "false");
  resizeRotationTextControl.button.addEventListener("click", () => {
    rotationText.style.display =
      rotationText.style.display === "none" ? "block" : "none";
    syncRotationBlockLayout();
  });
  const rotationTextInfoControl = createResizeControl(
    "Rotation Text Info",
    "rotation-text-info",
    infoIcon,
  );
  rotationTextInfoControl.button.style.display = "none";
  rotationTextInfoControl.button.addEventListener("animationend", (event) => {
    if (event.animationName === "rotation-text-info-rejection-pulse") {
      rotationTextInfoControl.button.classList.remove(
        "rotation-text-info-pulsing",
        "rotation-text-info-pulsing-orange",
      );
    }
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

  async function playNextQueuedRotation(
    timelineStartBoundary = null,
    timelineEndBoundary = null,
  ) {
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
      timelineStartBoundary,
      timelineEndBoundary,
    });

    return true;
  }

  previousRotationButton.addEventListener("click", async () => {
    if (rebuildInProgress) {
      return;
    }

    if (
      rotationPlaybackState === "paused" &&
      pendingRotationEntries.length > 0
    ) {
      const targetBoundary = getAdjacentRotationTimelineBoundary(
        Number(rotationTimeline.value),
        "previous",
      );
      await seekRotationTimeline(targetBoundary);
      return;
    }

    if (pendingRotationEntries.length > 0) {
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

    await playNextQueuedRotation(cursorIndex + 1, cursorIndex);

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
    if (
      rotationPlaybackState === "paused" &&
      pendingRotationEntries.length > 0
    ) {
      const targetBoundary = getAdjacentRotationTimelineBoundary(
        Number(rotationTimeline.value),
        "next",
      );
      await seekRotationTimeline(targetBoundary);
      return;
    }

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

  function parseCustomSequence(value) {
    const state = tokenizeRotationSequence(value);

    if (!state) {
      return [];
    }

    return state.moves.map((enteredMove) => {
      const move = stripCustomMoveParentheses(enteredMove);
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
    return viewController.getSettings();
  }

  function resetViewState() {
    viewController.reset();
    viewPanelController.setSettings(getViewSettings());
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
      runResetActivity("View", "Settings", () => {
        resetViewState();
        markSetupChanged();
      });
    },
    onViewChange: (setting, value) => viewController.setSetting(setting, value),
    onActivity: recordControlActivity,
    onPeekColorPicked: viewController.refresh,
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
  // Colors and Labels panels

  const defaultFaceletLabelColor = DEFAULT_FACELET_LABEL_COLOR;
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
  const faceletLabelController = createFaceletLabelController({
    facelets,
    getSize: () => size,
    getGap: () => gap,
    getLabelText: getFaceletPositionName,
    initialDepth: DEFAULT_LABEL_DEPTH,
  });

  updateFaceletLabelTransforms = faceletLabelController.refreshAll;

  function setFaceletColor(facelet, value) {
    const faceletData = getFaceletData(facelet);

    faceletData.currentColor = value;
    faceletData.color = value;
    const currentFacelet = getCurrentFaceletRecord(facelet);
    const material = currentFacelet?.cubie.material[currentFacelet.materialIndex];

    if (material) {
      material.color.set(value);
    }
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
      const material = cubie.material[facelet.materialIndex];

      if (material) {
        material.color.set(getCurrentFaceletColor(facelet));
      }
    }
  }

  const axisSceneController = createAxisSceneController({
    scene,
    axisDefinitions,
    getAxisLabelText: (axisDefinition) => axisDefinition.label.face,
    initialSize: size,
    initialAxisDepth: DEFAULT_AXIS_DEPTH,
    initialAxisLabelDepth: DEFAULT_LABEL_DEPTH,
    initialRotationArrowDepth: DEFAULT_ROTATION_ARROW_DEPTH,
    initialRotationArrowThickness: DEFAULT_ROTATION_ARROW_THICKNESS,
    initialRotationArrowRadius: DEFAULT_ROTATION_ARROW_RADIUS,
    initialRotationArrowDirection: "clockwise",
  });
  const axisGroup = axisSceneController.getAxisGroup();
  const rotationArrowGroup = axisSceneController.getRotationArrowGroup();

  updateAxisHelperScale = axisSceneController.setScale;

  const colorsPanelController = createColorsPanel({
    facelets,
    cubies,
    axisDefinitions,
    getFaceletData,
    getFaceletPositionName,
    getFaceletSection,
    getFaceletColor: getCurrentFaceletColor,
    setFaceletColor,
    sortFaceletsBySolvedPosition,
    getInnerColor: getCurrentInnerColor,
    setInnerColor: setCubieInnerColor,
    faceletLabelController,
    axisSceneController,
    styleUiTitle,
    panelBackground: UI_PANEL_BACKGROUND,
    panelBorderRadius: UI_PANEL_BORDER_RADIUS,
    panelBoxShadow: UI_PANEL_BOX_SHADOW,
    fontFamily: UI_FONT_FAMILY,
    fontSize: UI_FONT_SIZE,
    onReset: resetColorsInterface,
    onActivity: recordControlActivity,
    createResetButton: (label, onClick) =>
      createResetButton(label, () =>
        runResetActivity("Colors", "Settings", onClick),
      ),
    onExpand: () => collapseOtherPanels("colors"),
    onLayoutChange: updateCubePanelPosition,
  });

  colorsPanel = colorsPanelController.root;
  controlsRoot.appendChild(colorsPanel);
  controlsRoot.insertBefore(viewPanel, colorsPanel);

  const labelsPanelController = createLabelsPanel({
    faceletLabelController,
    axisSceneController,
    axisDefinitions,
    defaultLabelDepth: DEFAULT_LABEL_DEPTH,
    defaultAxisDepth: DEFAULT_AXIS_DEPTH,
    defaultRotationArrowDepth: DEFAULT_ROTATION_ARROW_DEPTH,
    defaultRotationArrowThickness: DEFAULT_ROTATION_ARROW_THICKNESS,
    defaultRotationArrowRadius: DEFAULT_ROTATION_ARROW_RADIUS,
    panelBackground: UI_PANEL_BACKGROUND,
    panelBorder: UI_PANEL_BORDER,
    panelBorderRadius: UI_PANEL_BORDER_RADIUS,
    panelBoxShadow: UI_PANEL_BOX_SHADOW,
    fontFamily: UI_FONT_FAMILY,
    fontSize: UI_FONT_SIZE,
    styleUiTitle,
    onActivity: recordControlActivity,
    createResetButton: (label, onClick) =>
      createResetButton(label, () =>
        runResetActivity("Labels", "Settings", onClick),
      ),
    onExpand: () => collapseOtherPanels("labels"),
    onLayoutChange: updateCubePanelPosition,
  });

  labelsPanel = labelsPanelController.root;
  controlsRoot.appendChild(labelsPanel);

  function resetColorsInterface() {
    for (const facelet of facelets) {
      const color = defaultFaceColors[facelet.face];

      if (color) {
        setFaceletColor(facelet, color);
      }
      faceletLabelController.setColor(facelet, defaultFaceletLabelColor);
    }

    for (const cubie of cubies) {
      setCubieInnerColor(cubie, defaultColors.inner);
    }

    axisDefinitions.forEach((axisDefinition, index) => {
      axisSceneController.setAxisLabelColor(index, axisDefinition.color);
      axisSceneController.setRotationArrowColor(index, axisDefinition.color);
    });
    colorsPanelController.syncAll(true);
  }

  function getJsonExportSetup() {
    const faceletLabels = {};

    for (const facelet of facelets) {
      const faceletData = getFaceletData(facelet);

      faceletLabels[faceletData.id] = faceletLabelController.getColor(facelet);
    }

    const labels = labelsPanelController.getSetupState();
    const axisLabelColors = {};
    const rotationArrowColors = {};

    for (const [index, axisDefinition] of axisDefinitions.entries()) {
      const face = axisDefinition.label.face;

      axisLabelColors[face] = axisSceneController.getAxisLabelColor(index);
      rotationArrowColors[face] =
        axisSceneController.getRotationArrowColor(index);
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
        ...getViewSettings(),
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
      labels,
    };
  }

  function getDefaultJsonExportSetup() {
    return createDefaultSetup({
      getDefaultCubeState,
      getDefaultCameraView,
      faceletIds: facelets.map((facelet) => getFaceletData(facelet).id),
      axisFaces: axisDefinitions.map(
        (axisDefinition) => axisDefinition.label.face,
      ),
      defaultFaceletLabelColor,
      defaultFaceColors,
    });
  }

  function applyImportedColors(importedColors) {
    for (const facelet of facelets) {
      const faceletData = getFaceletData(facelet);
      const color = importedColors.faceletLabels[faceletData.id];

      faceletLabelController.setColor(facelet, color);
    }

    for (const [face, color] of Object.entries(importedColors.axisLabels)) {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      if (index !== -1) {
        axisSceneController.setAxisLabelColor(index, color);
      }
    }

    for (const [face, color] of Object.entries(importedColors.rotationArrows)) {
      const index = axisDefinitions.findIndex(
        (axisDefinition) => axisDefinition.label.face === face,
      );

      if (index !== -1) {
        axisSceneController.setRotationArrowColor(index, color);
      }
    }

    colorsPanelController.syncFaceletLabelControls(true);
    colorsPanelController.syncSceneColorControls(true);
  }

  function applyImportedLabels(importedLabels) {
    labelsPanelController.applySetup(importedLabels);
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
      const [action] = parseCustomSequence(move);

      if (!action) {
        throw new Error(`Unable to restore rotation "${move}".`);
      }

      const entry = appendRotationEntry(action.label);
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

  function applySetup(importedSetup) {
    const previousSuppressionState = isRestoringActivity;

    isRestoringActivity = true;

    try {
      applySetupValues(importedSetup);
    } finally {
      isRestoringActivity = previousSuppressionState;
    }
  }

  function applySetupValues(importedSetup) {
    resetEverythingInterface();

    viewController.setSettings({
      ghostStickersVisibility: importedSetup.view.ghostStickersVisibility,
      peekStickersVisibility: importedSetup.view.peekStickersVisibility,
      peekStickersDepth: importedSetup.view.peekStickersDepth,
      peekStickersHideWhenColor: importedSetup.view.peekStickersHideWhenColor,
    });
    viewPanelController.setSettings(getViewSettings());

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

    const importedDimensions = new Map(
      cubies.map((cubie) => {
        const id = JSON.stringify(cubie.userData.originalPieceKey);
        const importedCubie = importedSetup.cube.cubies?.[id];

        return [
          cubie,
          {
            size: importedCubie?.size ?? importedSetup.cube.size,
            gap: importedCubie?.gap ?? importedSetup.cube.gap,
          },
        ];
      }),
    );

    cubeDimensionPanel.applyDimensions(
      importedSetup.cube.size,
      importedSetup.cube.gap,
      importedDimensions,
    );
    applyCubeState(importedSetup.cube);
    colorsPanelController.syncCubeControls(true);
    applyImportedColors(importedSetup.colors);
    applyImportedLabels(importedSetup.labels);

    durationState.value = importedSetup.rotations.durationSeconds * 1000;
    durationValue.value = String(importedSetup.rotations.durationSeconds);
    durationSlider.value = String(
      Math.min(importedSetup.rotations.durationSeconds, 5),
    );
    durationActivity.reset();
    restoreImportedRotations(importedSetup.rotations);
  }

  async function jumpToActivity(activity) {
    await stopRotationAndWait({ force: true });

    const from = getJsonExportSetup();
    const previousSuppressionState = isRestoringActivity;

    isRestoringActivity = true;

    try {
      applySetup(activity.snapshot);
      markSetupChanged();
    } finally {
      isRestoringActivity = previousSuppressionState;
    }

    const to = getJsonExportSetup();

    const descriptionParts = [
      "Jumped to previous state: ",
      { code: activity.id, linkActivityId: activity.id },
    ];

    recordActivity({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      kind: "jump",
      parent: "Jump",
      focus: "Past State",
      filterFocus: "Past State",
      description: `Jumped to previous state: ${activity.id}`,
      descriptionParts,
      from,
      to,
      snapshot: to,
    });
  }

  function openImportDialog() {
    openSetupImportDialog({
      getDefaultSetup: getDefaultJsonExportSetup,
      onImport: (importedSetup) => {
        const previousSetup = getJsonExportSetup();

        applySetup(importedSetup);
        markSetupChanged();
        if (JSON.stringify(previousSetup) !== JSON.stringify(getJsonExportSetup())) {
          recordSummaryActivity({
            kind: "import",
            parent: "Import",
            focus: "Settings",
            description: "Imported settings.",
          });
        }
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

    if (activePanel !== "colors") {
      colorsPanelController.setExpanded(false);
    }

    if (activePanel !== "cube" && !cubeCollapsed) {
      cubeCollapsed = true;
      cubeContent.style.display = "none";
      cubeCollapseIcon.textContent = "+";
    }

    if (activePanel !== "labels") {
      labelsPanelController.setExpanded(false);
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
    onActivity: recordControlActivity,
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

  function resetRotationWithActivity() {
    resetRotationInterface();

    const timestamp = new Date().toISOString();

    for (const parent of ["Rotation", "Camera"]) {
      recordSummaryActivity({
        kind: "reset",
        parent,
        focus: "Settings",
        description: "Settings were reset using the individual reset button.",
        timestamp,
      });
    }
  }

  function resetRotationInterface() {
    resetCubeOrientation();
    resetCameraView();

    customMoveControls.reset();

    durationSlider.value = "1";
    durationValue.value = "1";
    updateDurationState();
    durationActivity.reset();

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
    labelsPanelController.reset();
    resetViewState();

    viewPanelController.setExpanded(false);

    rotationCollapsed = window.innerWidth <= 900;
    rotationContent.style.display = rotationCollapsed ? "none" : "block";
    updateRotationToggle();

    cubeDimensionPanel.useGlobalMode();

    labelsPanelController.setExpanded(false);
    colorsPanelController.setExpanded(false);

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

  const resetToDefaultsButton = document.createElement("button");

  resetToDefaultsButton.type = "button";
  resetToDefaultsButton.textContent = "RESET TO DEFAULTS";
  resetToDefaultsButton.style.position = "absolute";
  resetToDefaultsButton.style.top = "20px";
  resetToDefaultsButton.style.left = "20px";
  resetToDefaultsButton.style.height = "42px";
  resetToDefaultsButton.style.width = "220px";
  resetToDefaultsButton.style.padding = "8px";
  resetToDefaultsButton.style.cursor = "pointer";
  resetToDefaultsButton.style.background = "#f8d7da";
  resetToDefaultsButton.style.border = "1px solid #c94c59";
  resetToDefaultsButton.style.color = "#842029";
  resetToDefaultsButton.style.fontWeight = "bold";
  resetToDefaultsButton.style.boxSizing = "border-box";
  addHoverEffect(resetToDefaultsButton, "#f3c7cc");

  resetToDefaultsButton.addEventListener("click", async () => {
    resetToDefaultsButton.disabled = true;

    try {
      await stopRotationAndWait({ force: true });
      const previousSetup = getJsonExportSetup();

      applySetup(getDefaultJsonExportSetup());
      markSetupChanged();
      if (JSON.stringify(previousSetup) !== JSON.stringify(getJsonExportSetup())) {
        recordSummaryActivity({
          kind: "reset",
          parent: "Setup",
          focus: "Reset to Defaults",
          description: "All settings were reset to their defaults.",
        });
      }
    } finally {
      resetToDefaultsButton.disabled = false;
    }
  });

  controlsRoot.appendChild(resetToDefaultsButton);

  const activityLogButton = document.createElement("button");

  activityLogButton.className = "activity-log-control";
  activityLogButton.type = "button";
  activityLogButton.textContent = "Activity Log";
  activityLogButton.style.position = "absolute";
  activityLogButton.style.top = "70px";
  activityLogButton.style.left = "20px";
  activityLogButton.style.width = "220px";
  activityLogButton.style.height = "42px";
  activityLogButton.style.padding = "8px";
  activityLogButton.style.cursor = "pointer";
  activityLogButton.style.boxSizing = "border-box";

  activityLogWindow = createActivityLogWindow({
    activityLogState,
    onRevert: revertActivity,
    onJump: jumpToActivity,
  });
  activityLogButton.addEventListener("click", activityLogWindow.open);

  controlsRoot.appendChild(activityLogButton);

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
