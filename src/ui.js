import {
  ArrowHelper,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import pausedRotationImage from "./assets/3x3cubePaused.png";
import rotationAnimation from "./assets/3x3cubeSolveAnim.gif";
import stoppedRotationImage from "./assets/3x3cubeStopped.png";
import copyIcon from "./assets/copy.png";
import {
  default as invalidColorIcon,
  default as mixedColorIcon,
} from "./assets/cross-transparent.png";
import sequenceInvalidIcon from "./assets/cross.png";
import infoIcon from "./assets/info.png";
import pauseIcon from "./assets/pause.svg";
import playIcon from "./assets/play.svg";
import resetIcon from "./assets/reset.png";
import stopIcon from "./assets/stop.svg";
import toEndIcon from "./assets/toend.svg";
import toStartIcon from "./assets/tostart.svg";
import undoIcon from "./assets/undo.png";
import sequencePendingIcon from "./assets/yes-pending.png";
import {
  default as copiedIcon,
  default as sequenceValidIcon,
} from "./assets/yes.png";
import { getFaceletLabel } from "./faceDefinitions.js";
import { createJsonExport } from "./jsonExport.js";
import { createSvgArchive } from "./svgExport.js";

const FACE_ORDER = ["F", "B", "R", "L", "U", "D"];
const UI_FONT_FAMILY = "Arial, sans-serif";
const UI_FONT_SIZE = "14px";
const UI_PANEL_BACKGROUND = "rgba(255, 255, 255, 0.95)";
const UI_PANEL_BORDER_RADIUS = "8px";
const UI_PANEL_BOX_SHADOW = "0 2px 10px rgba(0, 0, 0, 0.2)";
const DEFAULT_LABEL_DEPTH = 0.25;
const DEFAULT_AXIS_DEPTH = 0;
const DEFAULT_ROTATION_ARROW_DEPTH = 0.72;
const DEFAULT_ROTATION_ARROW_THICKNESS = 0.01;
const DEFAULT_ROTATION_ARROW_RADIUS = 0.58;
const NAVIGATION_DURATION = 0;
const DEFAULT_APP_URL = "https://galoisfield17.github.io/cube-interactive/";
const ALWAYS_VISIBLE = "always-visible";
const HIDDEN_BEHIND_CUBE = "hidden-behind-cube";

export function createUI({
  scene,
  renderer,
  camera,
  controls,
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
  let setupPanel = null;
  let exportSvgButton = null;
  let exportUrlButton = null;
  let exportUrlCopying = false;
  let exportUrlDirty = true;
  let updateFaceletLabelTransforms = () => {};
  let updateAxisHelperScale = () => {};

  function markSetupChanged() {
    exportUrlDirty = true;

    if (exportUrlButton && !exportUrlCopying) {
      exportUrlButton.disabled = false;
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

  controlsRoot.className = "responsive-controls";
  document.body.appendChild(controlsRoot);
  document.addEventListener("input", markSetupChanged, true);
  document.addEventListener("change", markSetupChanged, true);
  controls.addEventListener("change", markSetupChanged);

  // ============================================================
  // Rotation panel
  // ============================================================

  const panel = document.createElement("div");

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
  });

  controlsRoot.appendChild(panel);

  // ============================================================
  // Helper
  // ============================================================

  function setStyles(element, styles) {
    Object.assign(element.style, styles);
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

  const rotationLeftColumn = document.createElement("div");

  setStyles(rotationLeftColumn, {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    width: "50%",
  });

  const rotationAnimationImage = document.createElement("img");

  rotationAnimationImage.src = rotationAnimation;
  rotationAnimationImage.alt = "";
  setStyles(rotationAnimationImage, {
    display: "none",
    width: "18px",
    height: "18px",
    objectFit: "cover",
    flexShrink: "0",
  });

  const rotationPausedImage = document.createElement("img");

  rotationPausedImage.src = pausedRotationImage;
  rotationPausedImage.alt = "";
  setStyles(rotationPausedImage, {
    display: "none",
    width: "18px",
    height: "18px",
    objectFit: "cover",
    flexShrink: "0",
  });

  const rotationStoppedImage = document.createElement("img");

  rotationStoppedImage.src = stoppedRotationImage;
  rotationStoppedImage.alt = "";
  setStyles(rotationStoppedImage, {
    display: "none",
    width: "18px",
    height: "18px",
    objectFit: "cover",
    flexShrink: "0",
  });

  const rotationHeader = document.createElement("div");

  setStyles(rotationHeader, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "12px",
    userSelect: "none",
  });

  const rotationTitleRow = document.createElement("div");

  setStyles(rotationTitleRow, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });

  const resetRotationButton = createResetButton("Reset Rotation", () =>
    resetRotationInterface(),
  );

  rotationTitleRow.appendChild(resetRotationButton);
  rotationTitleRow.appendChild(rotationTitle);
  rotationLeftColumn.appendChild(rotationTitleRow);
  rotationHeader.appendChild(rotationLeftColumn);
  rotationHeader.appendChild(rotationAnimationImage);
  rotationHeader.appendChild(rotationPausedImage);
  rotationHeader.appendChild(rotationStoppedImage);
  panel.appendChild(rotationHeader);

  const rotationContent = document.createElement("div");

  rotationContent.id = "rotation-panel-content";
  setStyles(rotationContent, { marginTop: "12px" });
  panel.appendChild(rotationContent);

  let rotationCollapsed = window.innerWidth <= 900;
  rotationContent.style.display = rotationCollapsed ? "none" : "block";

  const rotationToggleButton = document.createElement("button");

  rotationToggleButton.type = "button";
  rotationToggleButton.title = "Collapse Or Expand Rotation Controls";
  rotationToggleButton.setAttribute(
    "aria-label",
    "Collapse Or Expand Rotation Controls",
  );
  rotationToggleButton.setAttribute("aria-controls", rotationContent.id);
  rotationToggleButton.style.display = "flex";
  rotationToggleButton.style.alignItems = "center";
  rotationToggleButton.style.justifyContent = "center";
  rotationToggleButton.style.width = "100%";
  rotationToggleButton.style.height = "22px";
  rotationToggleButton.style.marginTop = "8px";
  rotationToggleButton.style.padding = "0";
  rotationToggleButton.style.border = "0";
  rotationToggleButton.style.background = "transparent";
  rotationToggleButton.style.cursor = "pointer";
  rotationToggleButton.style.boxSizing = "border-box";

  const rotationToggleIcon = document.createElement("span");

  rotationToggleIcon.style.width = "8px";
  rotationToggleIcon.style.height = "8px";
  rotationToggleIcon.style.borderRight = "2px solid currentColor";
  rotationToggleIcon.style.borderBottom = "2px solid currentColor";
  rotationToggleIcon.style.transition = "transform 120ms ease";

  rotationToggleButton.appendChild(rotationToggleIcon);
  panel.appendChild(rotationToggleButton);

  function updateRotationToggle() {
    rotationToggleIcon.style.transform = rotationCollapsed
      ? "rotate(45deg)"
      : "rotate(225deg)";
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
      image: rotationAnimation,
      display: "none",
      size: "18px",
    },
    playing: {
      label: "Rotating...",
      image: rotationAnimation,
      display: "block",
      size: "64px",
    },
    paused: {
      label: "Paused",
      image: pausedRotationImage,
      display: "block",
      size: "64px",
    },
    stopped: {
      label: "Stopped",
      image: stoppedRotationImage,
      display: "block",
      size: "64px",
    },
  };

  function setRotationStatus(state) {
    const status = rotationStatus[state] ?? rotationStatus.idle;

    rotationTitle.textContent = status.label;
    rotationAnimationImage.style.display =
      state === "playing" ? "block" : "none";
    rotationPausedImage.style.display = state === "paused" ? "block" : "none";
    rotationStoppedImage.style.display = state === "stopped" ? "block" : "none";

    for (const image of [
      rotationAnimationImage,
      rotationPausedImage,
      rotationStoppedImage,
    ]) {
      image.style.width = status.size;
      image.style.height = status.size;
    }
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

  rotationText.style.fontSize = "28px";
  rotationText.style.fontWeight = "bold";
  rotationText.style.display = "none";
  rotationText.style.width = "fit-content";
  rotationText.style.maxWidth = "none";
  rotationText.style.right = "560px";
  rotationText.style.whiteSpace = "normal";
  rotationText.style.overflowWrap = "break-word";
  rotationText.style.padding = "3px 6px";
  rotationText.style.background = "rgba(245, 245, 245, 0.96)";
  rotationText.style.border = "1px solid rgba(0, 0, 0, 0.2)";
  rotationText.style.borderRadius = "3px";
  rotationText.style.boxSizing = "border-box";
  rotationText.style.position = "absolute";
  rotationText.style.top = "20px";
  rotationText.style.left = "248px";
  rotationText.setAttribute("role", "listbox");
  rotationText.setAttribute("aria-label", "Rotation Sequence");

  const rotationStartTarget = document.createElement("span");

  rotationStartTarget.className = "rotation-start-target";
  rotationStartTarget.setAttribute("aria-hidden", "true");
  rotationStartTarget.style.display = "inline-block";
  rotationStartTarget.style.width = "8px";
  rotationStartTarget.style.height = "1em";
  rotationStartTarget.style.cursor = "text";

  const rotationCursor = document.createElement("span");

  rotationCursor.className = "rotation-cursor";
  rotationCursor.setAttribute("aria-hidden", "true");
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

  const copyRotationButton = document.createElement("button");

  copyRotationButton.className = "rotation-copy-control";
  copyRotationButton.type = "button";
  copyRotationButton.title = "Copy Rotations To Clipboard";
  copyRotationButton.setAttribute("aria-label", "Copy Rotations To Clipboard");
  copyRotationButton.style.display = "none";
  copyRotationButton.style.position = "absolute";
  copyRotationButton.style.top = "20px";
  copyRotationButton.style.left = "248px";
  copyRotationButton.style.width = "42px";
  copyRotationButton.style.height = "42px";
  copyRotationButton.style.minWidth = "42px";
  copyRotationButton.style.minHeight = "42px";
  copyRotationButton.style.maxWidth = "42px";
  copyRotationButton.style.maxHeight = "42px";
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
  undoRotationButton.style.display = "none";
  undoRotationButton.style.position = "absolute";
  undoRotationButton.style.top = "70px";
  undoRotationButton.style.left = "248px";
  undoRotationButton.style.width = "42px";
  undoRotationButton.style.height = "42px";
  undoRotationButton.style.minWidth = "42px";
  undoRotationButton.style.minHeight = "42px";
  undoRotationButton.style.maxWidth = "42px";
  undoRotationButton.style.maxHeight = "42px";
  undoRotationButton.style.padding = "0";
  undoRotationButton.style.background = "#f5f5f5";
  undoRotationButton.style.lineHeight = "1";
  undoRotationButton.style.boxSizing = "border-box";
  undoRotationButton.style.cursor = "pointer";
  addHoverEffect(undoRotationButton, "#edf4ff");

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
    rotationText.style.display = "block";
    copyRotationButton.style.display = "inline-flex";
    undoRotationButton.style.display = "inline-flex";
    copyRotationButton.style.alignItems = "center";
    copyRotationButton.style.justifyContent = "center";
    undoRotationButton.style.alignItems = "center";
    undoRotationButton.style.justifyContent = "center";
    rotationText.style.left = "298px";
  }

  function appendRotationEntry(moveText) {
    const entries = getRotationEntries();

    const entry = document.createElement("span");

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
    entry.addEventListener("click", () => {
      setCursorRotationEntry(entry);
    });

    if (entries.length === 0) {
      rotationText.insertBefore(entry, rotationCursor);
    } else {
      entries.at(-1).after(document.createTextNode(" "), entry);
    }

    return entry;
  }

  const rotationActions = [];
  const pendingRotationEntries = [];
  let queuedRotationActions = [];
  let cursorRotationEntry = null;
  let rotationPlaybackState = "idle";
  let rotationStopRequested = false;
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
    const hasRotations = entries.length > 0;
    const isAnimating = rotationPlaybackState === "playing";
    const isPaused = rotationPlaybackState === "paused";
    const isStopped =
      rotationPlaybackState === "idle" || rotationPlaybackState === "stopped";
    const isAtStartPosition = currentCursor === null;
    const isAtLastEntry = currentCursor === entries[entries.length - 1];
    const hasQueuedAnimations = pendingRotationEntries.length > 0;
    const hasPreparedAnimations = queuedRotationActions.length > 0;
    const isRebuilding = rebuildInProgress;

    for (const entry of entries) {
      entry.setAttribute("aria-selected", String(entry === currentCursor));
    }

    toStartButton.disabled = !hasRotations || isAtStartPosition;
    toEndButton.disabled =
      !hasRotations || (isStopped && isAtLastEntry && !hasQueuedAnimations);
    playPauseButton.disabled =
      !hasRotations ||
      isRebuilding ||
      (isStopped &&
        isAtLastEntry &&
        !hasQueuedAnimations &&
        !hasPreparedAnimations);
    stopRotationButton.disabled =
      !hasRotations || (!isAnimating && !isPaused) || !hasQueuedAnimations;

    for (const button of [
      toStartButton,
      playPauseButton,
      stopRotationButton,
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

    if (isCursorMode) {
      if (cursorEntry) {
        cursorEntry.after(rotationCursor);
      } else {
        rotationStartTarget.after(rotationCursor);
      }
      rotationCursor.style.display = "inline-block";
    } else {
      rotationCursor.style.display = "none";
    }

    for (const entry of getRotationEntries()) {
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
  });

  rotationText.addEventListener("pointerdown", (event) => {
    if (event.target !== rotationText) {
      return;
    }

    const entries = getRotationEntries();

    if (entries.length === 0) {
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

  async function stopRotationAndWait() {
    if (
      rotationPlaybackState === "idle" ||
      rotationPlaybackState === "stopped"
    ) {
      return;
    }

    const configuredDuration = durationState.value;

    durationState.value = NAVIGATION_DURATION;
    stopRotationAfterCurrent();

    if (
      rotationPlaybackState === "stopped" &&
      pendingRotationEntries.length === 0
    ) {
      durationState.value = configuredDuration;
      return;
    }

    await new Promise((resolve) => {
      rotationStopWaiters.push(resolve);
    });

    durationState.value = configuredDuration;
  }

  let rebuildGeneration = 0;
  let rebuildInProgress = false;

  async function rebuildCubeToCursor() {
    if (pendingRotationEntries.length > 0) {
      return;
    }

    const generation = ++rebuildGeneration;
    const entries = getRotationEntries();
    const cursorIndex = cursorRotationEntry
      ? entries.indexOf(cursorRotationEntry)
      : -1;
    const prefixLength = Math.max(cursorIndex + 1, 0);
    const rebuildDuration = {
      ...durationState,
      value: NAVIGATION_DURATION,
      paused: false,
      pauseStartedAt: null,
    };

    rebuildInProgress = true;
    updateRotationMediaControlState();
    resetCubeOrientation();

    try {
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

  function getCustomMoveLabel(
    shortName,
    angle,
    { preserveEnteredAngle = false } = {},
  ) {
    const normalized = preserveEnteredAngle
      ? Math.trunc(angle * 1000) / 1000
      : normalizeAngle(angle);

    if (normalized === 90) return shortName;
    if (normalized === -90) return `${shortName}'`;
    if (normalized === 180 || normalized === -180) return `${shortName}2`;
    if (normalized !== 0) return `${shortName}[${normalized}°]`;

    return "";
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

  function getCustomRotationAngle(moveName, angle) {
    const definition = getRotationDefinition(moveName);

    return definition ? Math.sign(definition.angle) * angle : angle;
  }

  copyRotationButton.addEventListener("click", async () => {
    const rotationTextValue = rotationText.textContent;

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

    if (getRotationEntries().length === 0) {
      rotationText.style.display = "none";
      copyRotationButton.style.display = "none";
      undoRotationButton.style.display = "none";
      rotationText.style.left = "248px";
    }

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

  const insertButton = document.createElement("button");

  let lastRotationEdit = "move";

  insertButton.type = "button";
  insertButton.textContent = "Insert";

  insertButton.style.display = "none";
  insertButton.style.width = "100%";
  insertButton.style.padding = "8px";
  insertButton.style.cursor = "pointer";

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
    const currentDuration = Number(durationValue.value);

    if (Number.isFinite(currentDuration) && currentDuration <= 5) {
      durationValue.value = durationSlider.value;
    }

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

    const duration = Number(normalized);

    durationSlider.value = String(Math.min(duration, 5));
    updateDurationState();
  });

  durationValue.addEventListener("blur", () => {
    const raw = Number(durationValue.value);
    const duration = Number.isFinite(raw) ? Math.max(raw, 0) : 1;

    durationValue.value = String(duration);
    durationSlider.value = String(Math.min(duration, 5));
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
  stopRotationButton.style.width = "48px";
  stopRotationButton.style.height = "48px";
  stopRotationButton.style.minWidth = "48px";
  stopRotationButton.style.minHeight = "48px";
  stopRotationButton.style.maxWidth = "48px";
  stopRotationButton.style.maxHeight = "48px";
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
    await stopRotationAndWait();
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

  toEndButton.addEventListener("click", async () => {
    await stopRotationAndWait();

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

  toStartButton.addEventListener("click", async () => {
    await stopRotationAndWait();
    setCursorRotationEntry(null);
  });

  function updateStopRotationButtonPosition() {
    const buttonSize = parseFloat(stopRotationButton.style.width);
    const buttonGap = 4;
    const left = 20;
    const top = 70;

    toStartButton.style.left = `${left}px`;
    toStartButton.style.top = `${top}px`;
    playPauseButton.style.left = `${left + buttonSize + buttonGap}px`;
    playPauseButton.style.top = `${top}px`;
    stopRotationButton.style.left = `${left + (buttonSize + buttonGap) * 2}px`;
    stopRotationButton.style.top = `${top}px`;
    toEndButton.style.left = `${left + (buttonSize + buttonGap) * 3}px`;
    toEndButton.style.top = `${top}px`;
  }

  function setRotationControlVisibility() {
    toStartButton.style.display = "block";
    playPauseButton.style.display = "block";
    stopRotationButton.style.display = "block";
    toEndButton.style.display = "block";
  }

  window.addEventListener("resize", updateStopRotationButtonPosition);
  updateStopRotationButtonPosition();
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

  const fixedMoves = document.createElement("div");

  fixedMoves.style.display = "none";
  fixedMoves.style.marginTop = "4px";
  fixedMoves.style.marginBottom = "8px";

  const fixedMoveNames = [
    "Front:",
    "Back:",
    "Right:",
    "Left:",
    "Up:",
    "Down:",
    "Slice:",
  ];

  const MOVE_BUTTON_WIDTH = "45px";
  const MOVE_BUTTON_HEIGHT = "27px";

  function createMoveButton(text) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = text;

    button.style.width = MOVE_BUTTON_WIDTH;
    button.style.height = MOVE_BUTTON_HEIGHT;
    button.style.padding = "2px";
    button.style.cursor = "pointer";
    button.style.fontSize = "11px";
    button.style.boxSizing = "border-box";
    button.style.whiteSpace = "nowrap";
    button.style.flexShrink = "0";

    return button;
  }

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

  // ============================================================
  // Two-row move buttons
  // ============================================================

  function createTwoRowButtons(topMoves, bottomMoves, thirdMoves = null) {
    const container = document.createElement("div");

    container.style.flex = "1";
    container.style.minWidth = "0";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.gap = "4px";

    function createButtonRow(moves) {
      const row = document.createElement("div");

      row.style.width = "100%";
      row.style.display = "flex";
      row.style.justifyContent = "center";
      row.style.gap = "4px";

      for (const move of moves) {
        const button = createMoveButton(move);

        button.addEventListener("click", async () => {
          await executeMove(move);
        });

        row.appendChild(button);
      }

      return row;
    }

    container.appendChild(createButtonRow(topMoves));
    container.appendChild(createButtonRow(bottomMoves));

    if (thirdMoves) {
      container.appendChild(createButtonRow(thirdMoves));
    }

    return container;
  }

  // ============================================================
  // Create fixed move rows
  // ============================================================

  for (const moveName of fixedMoveNames) {
    const moveRow = document.createElement("div");

    moveRow.style.display = "flex";
    moveRow.style.alignItems = "flex-start";
    moveRow.style.marginBottom = "7px";

    const moveText = document.createElement("span");

    moveText.textContent = moveName;
    moveText.style.display = "inline-block";
    moveText.style.width = "48px";
    moveText.style.flexShrink = "0";
    moveText.style.fontWeight = "bold";
    moveText.style.lineHeight = MOVE_BUTTON_HEIGHT;
    moveText.style.textAlign = "left";

    let moveButtons;

    // ----------------------------------------------------------
    // Front
    // ----------------------------------------------------------

    if (moveName === "Front:") {
      moveButtons = createTwoRowButtons(
        ["F", "F'", "F2"],
        ["Fw", "Fw'", "Fw2"],
      );
    }

    // ----------------------------------------------------------
    // Back
    // ----------------------------------------------------------
    else if (moveName === "Back:") {
      moveButtons = createTwoRowButtons(
        ["B", "B'", "B2"],
        ["Bw", "Bw'", "Bw2"],
      );
    }

    // ----------------------------------------------------------
    // Right
    // ----------------------------------------------------------
    else if (moveName === "Right:") {
      moveButtons = createTwoRowButtons(
        ["R", "R'", "R2"],
        ["Rw", "Rw'", "Rw2"],
      );
    }

    // ----------------------------------------------------------
    // Left
    // ----------------------------------------------------------
    else if (moveName === "Left:") {
      moveButtons = createTwoRowButtons(
        ["L", "L'", "L2"],
        ["Lw", "Lw'", "Lw2"],
      );
    }

    // ----------------------------------------------------------
    // Up
    // ----------------------------------------------------------
    else if (moveName === "Up:") {
      moveButtons = createTwoRowButtons(
        ["U", "U'", "U2"],
        ["Uw", "Uw'", "Uw2"],
      );
    }

    // ----------------------------------------------------------
    // Down
    // ----------------------------------------------------------
    else if (moveName === "Down:") {
      moveButtons = createTwoRowButtons(
        ["D", "D'", "D2"],
        ["Dw", "Dw'", "Dw2"],
      );
    }

    // ----------------------------------------------------------
    // Slice
    // ----------------------------------------------------------
    else {
      moveButtons = createTwoRowButtons(
        ["M", "M'", "M2"],
        ["E", "E'", "E2"],
        ["S", "S'", "S2"],
      );
    }

    moveRow.appendChild(moveText);
    moveRow.appendChild(moveButtons);

    fixedMoves.appendChild(moveRow);
  }

  // ============================================================
  // Cube rotation controls
  // ============================================================

  const cubeRotationRow = document.createElement("div");

  cubeRotationRow.style.display = "flex";
  cubeRotationRow.style.alignItems = "flex-start";
  cubeRotationRow.style.marginBottom = "8px";

  const cubeRotationText = document.createElement("span");

  cubeRotationText.textContent = "Cube:";

  cubeRotationText.style.display = "inline-block";
  cubeRotationText.style.width = "48px";
  cubeRotationText.style.flexShrink = "0";
  cubeRotationText.style.fontWeight = "bold";
  cubeRotationText.style.lineHeight = MOVE_BUTTON_HEIGHT;
  cubeRotationText.style.textAlign = "left";

  const cubeRotationButtons = createTwoRowButtons(
    ["x", "x'", "x2"],
    ["y", "y'", "y2"],
    ["z", "z'", "z2"],
  );

  cubeRotationRow.appendChild(cubeRotationText);
  cubeRotationRow.appendChild(cubeRotationButtons);

  fixedMoves.appendChild(cubeRotationRow);

  rotationContent.appendChild(fixedMoves);

  // ============================================================
  // Custom move controls
  // ============================================================

  const customControls = document.createElement("div");

  customControls.style.display = "none";

  rotationContent.appendChild(customControls);

  // ============================================================
  // Move selector
  // ============================================================

  const moveLabel = createLabel("Move:");

  moveLabel.style.marginBottom = "0";
  moveLabel.style.flexShrink = "0";

  const moveControlRow = document.createElement("div");

  moveControlRow.style.display = "flex";
  moveControlRow.style.alignItems = "center";
  moveControlRow.style.gap = "8px";
  moveControlRow.style.marginBottom = "14px";

  moveControlRow.appendChild(moveLabel);

  const moveSelect = document.createElement("select");

  moveSelect.style.flex = "1";
  moveSelect.style.minWidth = "0";
  moveSelect.style.padding = "6px";
  moveSelect.style.boxSizing = "border-box";

  const emptyMove = document.createElement("option");

  emptyMove.value = "";
  emptyMove.textContent = "Select Move";
  emptyMove.disabled = true;
  emptyMove.selected = true;

  moveSelect.appendChild(emptyMove);

  const moves = [
    ["F", "F - Front"],
    ["Fw", "Fw - Front wide"],

    ["B", "B - Back"],
    ["Bw", "Bw - Back wide"],

    ["R", "R - Right"],
    ["Rw", "Rw - Right wide"],

    ["L", "L - Left"],
    ["Lw", "Lw - Left wide"],

    ["U", "U - Up"],
    ["Uw", "Uw - Up wide"],

    ["D", "D - Down"],
    ["Dw", "Dw - Down wide"],

    ["S", "S - Standing"],
    ["M", "M - Middle"],
    ["E", "E - Equator"],

    ["x", "x - Cube rotation ↑"],
    ["y", "y - Cube rotation ←"],
    ["z", "z - Cube rotation ↘"],
  ];

  for (const [value, text] of moves) {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = text;

    moveSelect.appendChild(option);
  }

  moveControlRow.appendChild(moveSelect);

  // ============================================================
  // Direction
  // ============================================================

  const directionLabel = createLabel("Rotation Angle (degrees)");

  const directionContainer = document.createElement("div");

  directionContainer.style.display = "flex";
  directionContainer.style.alignItems = "center";
  directionContainer.style.gap = "6px";
  directionContainer.style.marginBottom = "16px";
  directionContainer.style.width = "100%";
  directionContainer.style.boxSizing = "border-box";

  const directionSlider = document.createElement("input");

  directionSlider.type = "range";
  directionSlider.min = "-360";
  directionSlider.max = "360";
  directionSlider.step = "0.1";
  directionSlider.value = "90";

  directionSlider.style.flex = "1";
  directionSlider.style.minWidth = "0";

  const directionValue = document.createElement("input");

  directionValue.type = "text";
  directionValue.value = "90";

  directionValue.style.width = "40px";
  directionValue.style.minWidth = "40px";
  directionValue.style.maxWidth = "40px";
  directionValue.style.flexShrink = "0";
  directionValue.style.boxSizing = "border-box";
  directionValue.style.textAlign = "center";
  directionValue.style.padding = "3px";

  const degreeSymbol = document.createElement("span");

  degreeSymbol.textContent = "°";

  function getDirection() {
    return normalizeAngle(directionValue.value);
  }

  directionSlider.addEventListener("input", () => {
    directionValue.value = directionSlider.value;
  });

  directionValue.addEventListener("input", () => {
    const raw = directionValue.value;

    lastRotationEdit = "move";
    updateRotateButtonState();

    if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
      return;
    }

    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
      directionValue.value = raw
        .replace(/[^\d.-]/g, "")
        .replace(/(?!^)-/g, "")
        .replace(/(\..*)\./g, "$1");
      return;
    }

    const decimalIndex = raw.indexOf(".");
    const sign = raw.startsWith("-") ? "-" : "";
    const unsignedRaw = sign ? raw.slice(1) : raw;
    const unsignedDecimalIndex = unsignedRaw.indexOf(".");
    const integerPart = (
      unsignedDecimalIndex === -1
        ? unsignedRaw
        : unsignedRaw.slice(0, unsignedDecimalIndex)
    ).replace(/[^\d]/g, "");
    const fractionalPart = (
      unsignedDecimalIndex === -1
        ? ""
        : unsignedRaw.slice(unsignedDecimalIndex + 1)
    ).slice(0, 3);
    const normalized = `${sign}${integerPart}${decimalIndex === -1 ? "" : `.${fractionalPart}`}`;

    if (normalized !== raw) {
      directionValue.value = normalized;
    }

    const angle = normalizeAngle(normalized);

    directionSlider.value = angle;
  });

  directionValue.addEventListener("blur", () => {
    lastRotationEdit = "move";

    const raw = directionValue.value;
    const decimalIndex = raw.indexOf(".");
    const sign = raw.startsWith("-") ? "-" : "";
    const unsignedRaw = sign ? raw.slice(1) : raw;
    const unsignedDecimalIndex = unsignedRaw.indexOf(".");
    const integerPart = (
      unsignedDecimalIndex === -1
        ? unsignedRaw
        : unsignedRaw.slice(0, unsignedDecimalIndex)
    ).replace(/[^\d]/g, "");
    const fractionalPart = (
      unsignedDecimalIndex === -1
        ? ""
        : unsignedRaw.slice(unsignedDecimalIndex + 1)
    ).slice(0, 3);
    const normalized = `${sign}${integerPart}${decimalIndex === -1 ? "" : `.${fractionalPart}`}`;
    const angle = normalizeAngle(normalized);

    directionValue.value = angle;
    directionSlider.value = angle;
    updateRotateButtonState();
  });

  directionValue.addEventListener("click", () => {
    lastRotationEdit = "move";
    updateRotateButtonState();
  });
  directionValue.addEventListener("focus", () => {
    lastRotationEdit = "move";
    updateRotateButtonState();
  });

  directionContainer.appendChild(directionSlider);
  directionContainer.appendChild(directionValue);
  directionContainer.appendChild(degreeSymbol);

  const customSequenceLabel = createLabel("Custom Sequence");

  customSequenceLabel.style.display = "flex";
  customSequenceLabel.style.alignItems = "center";
  customSequenceLabel.style.justifyContent = "space-between";

  const customSequenceInfoButton = document.createElement("button");

  customSequenceInfoButton.className = "compact-icon-button";
  customSequenceInfoButton.type = "button";
  customSequenceInfoButton.title =
    "Enter moves separated by spaces, such as R U R' or F[33°]";
  customSequenceInfoButton.setAttribute(
    "aria-label",
    "Enter moves separated by spaces, such as R U R' or F[33°]",
  );
  customSequenceInfoButton.style.width = "22px";
  customSequenceInfoButton.style.height = "22px";
  customSequenceInfoButton.style.padding = "2px";
  customSequenceInfoButton.style.boxSizing = "border-box";
  customSequenceInfoButton.style.cursor = "pointer";

  const customSequenceInfoImage = document.createElement("img");

  customSequenceInfoImage.src = infoIcon;
  customSequenceInfoImage.alt = "";
  customSequenceInfoImage.style.width = "100%";
  customSequenceInfoImage.style.height = "100%";
  customSequenceInfoImage.style.display = "block";
  customSequenceInfoImage.style.pointerEvents = "none";

  customSequenceInfoButton.appendChild(customSequenceInfoImage);
  customSequenceLabel.appendChild(customSequenceInfoButton);

  const customSequenceInput = document.createElement("input");

  customSequenceInput.type = "text";
  customSequenceInput.placeholder = "e.g. R U R' U'";
  customSequenceInput.style.flex = "1";
  customSequenceInput.style.minWidth = "0";
  customSequenceInput.style.padding = "6px";
  customSequenceInput.style.boxSizing = "border-box";

  const customSequenceStatusImage = document.createElement("img");

  customSequenceStatusImage.alt = "";
  customSequenceStatusImage.style.display = "none";
  customSequenceStatusImage.style.width = "18px";
  customSequenceStatusImage.style.height = "18px";
  customSequenceStatusImage.style.objectFit = "contain";
  customSequenceStatusImage.style.flexShrink = "0";

  const customSequenceInputRow = document.createElement("div");

  customSequenceInputRow.style.display = "flex";
  customSequenceInputRow.style.alignItems = "center";
  customSequenceInputRow.style.gap = "6px";
  customSequenceInputRow.style.width = "100%";
  customSequenceInputRow.style.marginBottom = "14px";
  customSequenceInputRow.style.boxSizing = "border-box";
  customSequenceInputRow.appendChild(customSequenceInput);
  customSequenceInputRow.appendChild(customSequenceStatusImage);

  const lowercaseWideMoveNames = {
    u: "Uw",
    d: "Dw",
    r: "Rw",
    l: "Lw",
    f: "Fw",
    b: "Bw",
  };

  function normalizeCustomMoveName(moveName) {
    const match = moveName.match(/^([udrlfb])(['2]?)$/);

    if (!match) {
      return moveName;
    }

    return `${lowercaseWideMoveNames[match[1]]}${match[2]}`;
  }

  function parseCustomMove(value) {
    const match = value.match(
      /^(.+?)(?:\(([+-]?\d+(?:\.\d+)?)(?:degrees?|degs?|°)\)|\[([+-]?\d+(?:\.\d+)?)(?:degrees?|degs?|°)\])$/,
    );

    if (!match) {
      return null;
    }

    return {
      moveName: match[1],
      angle: Number(match[2] ?? match[3]),
    };
  }

  function isValidCustomSequence(value) {
    const sequence = value.trim();

    if (sequence === "") {
      return true;
    }

    return sequence.split(/\s+/).every((move) => {
      const normalizedMove = normalizeCustomMoveName(move);

      if (getRotationDefinition(normalizedMove)) {
        return true;
      }

      const customMove = parseCustomMove(move);

      if (!customMove) {
        return false;
      }

      return Boolean(
        getRotationDefinition(normalizeCustomMoveName(customMove.moveName)),
      );
    });
  }

  function parseCustomSequence(value) {
    return value
      .trim()
      .split(/\s+/)
      .map((move) => {
        const normalizedMove = normalizeCustomMoveName(move);

        if (getRotationDefinition(normalizedMove)) {
          const inverse = getInverseMoveName(normalizedMove);

          return {
            label: normalizedMove,
            run: (duration) => rotateMove(normalizedMove, duration),
            inverse: (duration) => rotateMove(inverse, duration),
            inverseLabel: inverse,
          };
        }

        const customMove = parseCustomMove(move);

        const moveName = customMove
          ? normalizeCustomMoveName(customMove.moveName)
          : null;

        if (!customMove || !getRotationDefinition(moveName)) {
          return null;
        }

        const angle = customMove.angle;
        const displayedAngle = Math.trunc(normalizeAngle(angle) * 1000) / 1000;
        const rotationAngle = getCustomRotationAngle(moveName, displayedAngle);

        return {
          label: getCustomMoveLabel(moveName, displayedAngle, {
            preserveEnteredAngle: true,
          }),
          run: (duration) => rotateSlice(moveName, rotationAngle, duration),
          inverse: (duration) =>
            rotateSlice(moveName, -rotationAngle, duration),
          inverseLabel: getCustomMoveLabel(moveName, -displayedAngle, {
            preserveEnteredAngle: true,
          }),
        };
      });
  }

  function validateCustomSequence({ updateLastRotationEdit = true } = {}) {
    const isValid = isValidCustomSequence(customSequenceInput.value);
    const hasSequence = customSequenceInput.value.trim() !== "";

    if (updateLastRotationEdit && hasSequence && isValid) {
      lastRotationEdit = "sequence";
    }

    customSequenceInput.setCustomValidity(
      isValid
        ? ""
        : "Use valid rotation moves separated by spaces, such as R U R' or F[33°].",
    );
    customSequenceInput.setAttribute("aria-invalid", String(!isValid));
    customSequenceInput.style.borderColor = isValid ? "" : "#c00";
    updateRotateButtonState();

    return isValid;
  }

  function updateRotateButtonState() {
    const sequence = customSequenceInput.value.trim();
    const hasMove = Boolean(moveSelect.value);
    const hasSequence = sequence !== "";
    const hasValidSequence = hasSequence && isValidCustomSequence(sequence);
    const requiresMoveSelection = lastRotationEdit === "move" && !hasMove;
    const isDisabled = requiresMoveSelection || (!hasMove && !hasValidSequence);
    const selectedOption = moveSelect.options[moveSelect.selectedIndex];
    const moveName = selectedOption?.value;
    const moveNotation = moveName
      ? getCustomMoveLabel(moveName, getDirection())
      : "";
    const rotationLabel =
      lastRotationEdit === "move" && moveNotation
        ? `Insert ${moveNotation}`
        : `Insert ${lastRotationEdit}`;

    customSequenceStatusImage.style.display = hasSequence ? "block" : "none";
    customSequenceStatusImage.src = !hasValidSequence
      ? sequenceInvalidIcon
      : lastRotationEdit === "move"
        ? sequencePendingIcon
        : sequenceValidIcon;
    customSequenceStatusImage.alt = !hasValidSequence
      ? "Invalid sequence"
      : lastRotationEdit === "move"
        ? "Valid sequence pending"
        : "Valid sequence";
    insertButton.disabled = isDisabled;
    insertButton.textContent = isDisabled
      ? requiresMoveSelection
        ? "Select move or sequence"
        : "Invalid sequence"
      : rotationLabel;
    insertButton.style.opacity = isDisabled ? "0.5" : "1";
    insertButton.style.cursor = isDisabled ? "not-allowed" : "pointer";
  }

  customSequenceInput.addEventListener("input", validateCustomSequence);
  customSequenceInput.addEventListener("click", () => {
    lastRotationEdit = "sequence";
    updateRotateButtonState();
  });
  customSequenceInput.addEventListener("focus", () => {
    lastRotationEdit = "sequence";
    updateRotateButtonState();
  });
  moveSelect.addEventListener("change", () => {
    lastRotationEdit = "move";
    updateRotateButtonState();
  });

  customControls.appendChild(customSequenceLabel);
  customControls.appendChild(customSequenceInputRow);
  customControls.appendChild(moveControlRow);
  customControls.appendChild(directionLabel);
  customControls.appendChild(directionContainer);
  customControls.appendChild(insertButton);
  updateRotateButtonState();

  // ============================================================
  // Move type behavior
  // ============================================================

  fixedRadio.addEventListener("change", () => {
    if (!fixedRadio.checked) {
      return;
    }

    moveType = "fixed";

    resetVisualRotations();

    fixedMoves.style.display = "block";
    customControls.style.display = "none";
    insertButton.style.display = "none";
  });

  customRadio.addEventListener("change", () => {
    if (!customRadio.checked) {
      return;
    }

    moveType = "custom";

    fixedMoves.style.display = "none";
    customControls.style.display = "block";
    insertButton.style.display = "block";
  });

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

  function getColorPickerValue(value) {
    const color = new Color();

    try {
      color.set(value);
      return `#${color.getHexString()}`;
    } catch {
      return "#000000";
    }
  }

  function addColorPicker(
    preview,
    input,
    applyColor,
    getInitialColor,
    getPickerState = null,
    restorePickerState = null,
  ) {
    const picker = document.createElement("input");

    picker.type = "color";
    picker.style.display = "none";
    const hasRelatedEntries = Boolean(getPickerState && restorePickerState);
    const getSavedPickerState = getPickerState ?? (() => input.value);
    const restoreSavedPickerState =
      restorePickerState ??
      ((state) => {
        input.value = state;
        applyColor();
      });
    const undoButton = hasRelatedEntries
      ? document.createElement("button")
      : null;
    let initialColor = "";
    let initialPickerState;
    let pickerStartedMixed = false;
    let pickerOpen = false;
    let pickerSelectionCommitted = false;
    let pickerCancellationRequested = false;

    function openPicker() {
      initialColor = input.value;
      pickerStartedMixed = input.placeholder === "Mixed";
      initialPickerState = pickerStartedMixed
        ? getSavedPickerState()
        : input.value;
      const pickerColor = input.value || getInitialColor?.() || "#000000";

      picker.value = getColorPickerValue(pickerColor);
      pickerOpen = true;
      pickerSelectionCommitted = false;
      pickerCancellationRequested = false;
      if (undoButton && pickerStartedMixed) {
        undoButton.style.display = "block";
      }
      picker.click();
    }

    function previewPickedColor() {
      input.value = picker.value;
      applyColor();
    }

    function commitPickedColor() {
      if (pickerCancellationRequested) {
        return;
      }

      pickerSelectionCommitted = true;
      pickerOpen = false;
      input.value = picker.value;
      applyColor();
    }

    function restoreCancelledColor() {
      if (!pickerOpen || pickerSelectionCommitted) {
        return;
      }

      pickerOpen = false;
      pickerCancellationRequested = true;
      if (pickerStartedMixed) {
        restoreSavedPickerState(initialPickerState);
      } else {
        input.value = initialColor;
        applyColor();
      }
      if (undoButton) {
        undoButton.style.display = "none";
      }
    }

    function handlePickerCancel() {
      pickerOpen = false;
      pickerSelectionCommitted = false;
      pickerCancellationRequested = true;
      window.setTimeout(() => {
        if (pickerStartedMixed) {
          restoreSavedPickerState(initialPickerState);
        } else {
          input.value = initialColor;
          applyColor();
        }
        if (undoButton) {
          undoButton.style.display = "none";
        }
      }, 0);
    }

    preview.style.cursor = "pointer";
    preview.setAttribute("role", "button");
    preview.setAttribute("aria-label", "Choose Color");
    preview.tabIndex = 0;
    preview.title = "Choose Color";
    preview.addEventListener("click", openPicker);
    preview.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openPicker();
    });
    picker.addEventListener("input", previewPickedColor);
    picker.addEventListener("change", commitPickedColor);
    picker.addEventListener("cancel", handlePickerCancel);
    picker.addEventListener("blur", () => {
      window.setTimeout(restoreCancelledColor, 0);
    });
    if (undoButton) {
      undoButton.type = "button";
      undoButton.title = "Undo Color Change";
      undoButton.setAttribute("aria-label", "Undo Color Change");
      undoButton.style.display = "none";
      undoButton.style.position = "absolute";
      undoButton.style.left = "22px";
      undoButton.style.top = "0";
      undoButton.style.width = "18px";
      undoButton.style.height = "18px";
      undoButton.style.padding = "2px";
      undoButton.style.boxSizing = "border-box";
      undoButton.style.cursor = "pointer";

      const undoImage = document.createElement("img");

      undoImage.src = undoIcon;
      undoImage.alt = "";
      undoImage.style.display = "block";
      undoImage.style.width = "100%";
      undoImage.style.height = "100%";
      undoImage.style.pointerEvents = "none";

      undoButton.appendChild(undoImage);
      undoButton.addEventListener("click", (event) => {
        event.stopPropagation();
        pickerOpen = false;
        pickerSelectionCommitted = false;
        pickerCancellationRequested = true;
        restoreSavedPickerState(initialPickerState);
        undoButton.style.display = "none";
      });
      preview.style.position = "relative";
      preview.style.marginRight = "22px";
      preview.appendChild(undoButton);
    }
    preview.appendChild(picker);
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
    addColorPicker(preview, input, updateColor);

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
    addColorPicker(
      preview,
      input,
      applyColor,
      () =>
        getCurrentFaceletColor(
          facelets.find((facelet) => getFaceletSection(facelet) === face),
        ),
      () =>
        getFaceletColorSnapshot(
          (facelet) => getFaceletSection(facelet) === face,
        ),
      restoreFaceletColorSnapshot,
    );

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
  addColorPicker(
    outerFaceletsPreview,
    outerFaceletsInput,
    applyOuterFaceletsColor,
    () => (facelets[0] ? getCurrentFaceletColor(facelets[0]) : "#000000"),
    () => getFaceletColorSnapshot(),
    restoreFaceletColorSnapshot,
  );

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
    addColorPicker(preview, input, updateInnerColor);

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
  addColorPicker(
    innerPreview,
    innerInput,
    applyInnerColor,
    undefined,
    () => cubies.map((cubie) => [cubie, getCurrentInnerColor(cubie)]),
    (snapshot) => {
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
  );
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
    addColorPicker(preview, input, applyColor);

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
  addColorPicker(
    faceletLabelPreview,
    faceletLabelInput,
    applyAllFaceletLabelColor,
    () => defaultFaceletLabelColor,
    () => facelets.map((facelet) => [facelet, getFaceletLabelColor(facelet)]),
    (snapshot) => {
      for (const [facelet, color] of snapshot) {
        updateFaceletLabelColor(facelet, color);
        updateFaceletLabelColorControl(facelet);
      }

      for (const [face] of faceletSections) {
        updateFaceletLabelFaceControl(face);
      }

      updateFaceletLabelHeading();
    },
  );

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
    addColorPicker(
      preview,
      input,
      applyFaceletLabelFaceColor,
      () => getFaceletLabelColor(sectionFacelets[0]),
      () =>
        sectionFacelets.map((facelet) => [
          facelet,
          getFaceletLabelColor(facelet),
        ]),
      (snapshot) => {
        for (const [facelet, color] of snapshot) {
          updateFaceletLabelColor(facelet, color);
          updateFaceletLabelColorControl(facelet);
        }

        updateFaceletLabelFaceControl(face);
        updateFaceletLabelHeading();
      },
    );

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

  const resetLabelsButton = createResetButton("Reset Labels", () => {
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
  });

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
    addColorPicker(preview, input, apply, () => getColor() ?? "#111");

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
    addColorPicker(
      preview,
      input,
      handleInput,
      () => getColor() ?? "#111",
      getPickerState,
      restorePickerState,
    );

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

  function mergeImportedValues(defaults, imported) {
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

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
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
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < minimum
    ) {
      throw new Error(`${path} must be a valid number.`);
    }
  }

  function validateImportedDocument(document) {
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
            throw new Error(
              `setup.colors.${key} values must be color strings.`,
            );
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
      for (const [key, entry] of Object.entries(
        labels.axisLabelsByFace ?? {},
      )) {
        validateKeys(
          entry,
          ["visible", "customText"],
          `setup.labels.axisLabelsByFace.${key}`,
        );
        if (
          typeof entry.visible !== "boolean" ||
          (entry.customText !== undefined &&
            typeof entry.customText !== "string")
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

    return mergeImportedValues(getDefaultJsonExportSetup(), document.setup);
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
    const definition = getRotationDefinition(label);

    if (definition) {
      const inverse = getInverseMoveName(label);

      return {
        label,
        run: (duration) => rotateMove(label, duration),
        inverse: {
          label: inverse,
          run: (duration) => rotateMove(inverse, duration),
        },
      };
    }

    const customMatch = label.match(/^([A-Za-z]+)\[(-?\d+(?:\.\d+)?)°\]$/u);

    if (!customMatch || !getRotationDefinition(customMatch[1])) {
      return {
        label,
        run: () => Promise.resolve(true),
        inverse: { label, run: () => Promise.resolve(true) },
      };
    }

    const moveName = customMatch[1];
    const angle = Number(customMatch[2]);
    const signedAngle = getCustomRotationAngle(moveName, angle);

    return {
      label,
      run: (duration) => rotateSlice(moveName, signedAngle, duration),
      inverse: {
        label: getCustomMoveLabel(moveName, -angle, {
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

    size = importedSetup.cube.size;
    gap = importedSetup.cube.gap;
    setNumericControl(sizeControls, size);
    setNumericControl(gapControls, gap);
    globalGapRadio.checked = true;
    customGapRadio.checked = false;
    updateCubeDimensions(size, gap);
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
    const overlay = document.createElement("div");
    const dialog = document.createElement("div");
    const title = document.createElement("div");
    const instructions = document.createElement("div");
    const fileInput = document.createElement("input");
    const textArea = document.createElement("textarea");
    const status = document.createElement("div");
    const buttonRow = document.createElement("div");
    const cancelButton = document.createElement("button");
    const importButton = document.createElement("button");

    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "1000";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "rgba(0, 0, 0, 0.35)";
    overlay.style.padding = "20px";
    overlay.style.boxSizing = "border-box";

    dialog.style.width = "min(560px, 100%)";
    dialog.style.padding = "18px";
    dialog.style.background = "white";
    dialog.style.borderRadius = UI_PANEL_BORDER_RADIUS;
    dialog.style.boxShadow = UI_PANEL_BOX_SHADOW;
    dialog.style.fontFamily = UI_FONT_FAMILY;
    dialog.style.boxSizing = "border-box";

    title.textContent = "Import JSON";
    title.style.fontSize = "18px";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "10px";

    instructions.textContent =
      "Paste a setup JSON document or choose a JSON file.";
    instructions.style.marginBottom = "10px";

    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.display = "block";
    fileInput.style.marginBottom = "10px";

    textArea.rows = 12;
    textArea.placeholder = "Paste exported JSON here";
    textArea.style.width = "100%";
    textArea.style.resize = "vertical";
    textArea.style.boxSizing = "border-box";
    textArea.style.fontFamily = "monospace";
    textArea.style.fontSize = "12px";

    status.style.minHeight = "20px";
    status.style.marginTop = "8px";
    status.style.color = "#b42318";

    buttonRow.style.display = "flex";
    buttonRow.style.justifyContent = "flex-end";
    buttonRow.style.gap = "8px";
    buttonRow.style.marginTop = "12px";

    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    importButton.type = "button";
    importButton.textContent = "Import";

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];

      if (!file) {
        return;
      }

      try {
        textArea.value = await file.text();
        status.textContent = "";
      } catch {
        status.textContent = "Unable to read that file.";
      }
    });

    cancelButton.addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });
    importButton.addEventListener("click", () => {
      try {
        const document = JSON.parse(textArea.value);
        const importedSetup = validateImportedDocument(document);

        applyImportedSetup(importedSetup);
        markSetupChanged();
        overlay.remove();
      } catch (error) {
        status.textContent =
          error instanceof Error
            ? error.message
            : "Unable to import this setup.";
      }
    });

    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(importButton);
    dialog.appendChild(title);
    dialog.appendChild(instructions);
    dialog.appendChild(fileInput);
    dialog.appendChild(textArea);
    dialog.appendChild(status);
    dialog.appendChild(buttonRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    textArea.focus();
  }

  function downloadJsonExport() {
    const exportData = createCurrentJsonExport();
    const blob = new Blob([`${JSON.stringify(exportData, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cube-setup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function createCurrentJsonExport() {
    return createJsonExport(getJsonExportSetup(), getDefaultJsonExportSetup());
  }

  function encodeUrlSafeBase64(bytes) {
    let binary = "";

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/u, "");
  }

  async function compressJsonExport(exportData) {
    const compressionStream = new CompressionStream("gzip");
    const writer = compressionStream.writable.getWriter();
    const json = JSON.stringify(exportData);

    await writer.write(new TextEncoder().encode(json));
    await writer.close();

    return new Uint8Array(
      await new Response(compressionStream.readable).arrayBuffer(),
    );
  }

  let exportUrlFeedbackTimeout = null;

  async function copyUrlExport(button) {
    if (exportUrlCopying) {
      return;
    }

    const originalText = "Export URL";
    const feedbackLabel = button.querySelector(".export-url-label");
    const feedbackImage = button.querySelector(".export-url-feedback");
    let clipboardTimeout;

    exportUrlCopying = true;

    try {
      const compressed = await compressJsonExport(createCurrentJsonExport());
      const encodedData = encodeUrlSafeBase64(compressed);
      const appUrl = new URL(DEFAULT_APP_URL);

      appUrl.search = "";
      appUrl.searchParams.set("setup", encodedData);
      await Promise.race([
        navigator.clipboard.writeText(appUrl.toString()),
        new Promise((_, reject) => {
          clipboardTimeout = setTimeout(
            () => reject(new Error("Clipboard write timed out")),
            3000,
          );
        }),
      ]);
      exportUrlDirty = false;
      feedbackLabel.textContent = "Copied!";
      feedbackImage.src = sequenceValidIcon;
      feedbackImage.alt = "Export URL copied";
    } catch {
      feedbackLabel.textContent = "Copy failed";
      feedbackImage.src = sequenceInvalidIcon;
      feedbackImage.alt = "Export URL copy failed";
    } finally {
      clearTimeout(clipboardTimeout);
      feedbackImage.style.display = "block";
      exportUrlCopying = false;
      button.disabled = false;
      button.disabled = !exportUrlDirty;
      clearTimeout(exportUrlFeedbackTimeout);
      exportUrlFeedbackTimeout = setTimeout(() => {
        feedbackLabel.textContent = originalText;
        feedbackImage.style.display = "none";
      }, 1800);
    }
  }

  // ============================================================
  // Setup panel
  // ============================================================

  setupPanel = document.createElement("div");

  setupPanel.style.position = "absolute";
  setupPanel.style.top = "20px";
  setupPanel.style.right = "20px";
  setupPanel.style.width = "280px";
  setupPanel.style.padding = "16px";
  setupPanel.style.background = UI_PANEL_BACKGROUND;
  setupPanel.style.borderRadius = UI_PANEL_BORDER_RADIUS;
  setupPanel.style.boxShadow = UI_PANEL_BOX_SHADOW;
  setupPanel.style.fontFamily = UI_FONT_FAMILY;
  setupPanel.style.fontSize = UI_FONT_SIZE;
  setupPanel.style.boxSizing = "border-box";

  const setupHeader = document.createElement("div");

  setupHeader.style.display = "flex";
  setupHeader.style.alignItems = "center";
  setupHeader.style.justifyContent = "space-between";
  setupHeader.style.cursor = "pointer";
  setupHeader.style.userSelect = "none";

  const setupTitle = document.createElement("span");

  setupTitle.textContent = "Setup";
  setupTitle.style.fontSize = "18px";
  setupTitle.style.fontWeight = "bold";

  const setupCollapseIcon = document.createElement("span");

  setupCollapseIcon.textContent = "+";
  setupCollapseIcon.style.fontSize = "20px";
  setupCollapseIcon.style.lineHeight = "1";

  const setupContent = document.createElement("div");

  setupContent.id = "setup-panel-content";
  setupContent.style.display = "none";
  setupContent.style.marginTop = "12px";

  const setupButtonRow = document.createElement("div");

  setupButtonRow.style.display = "flex";
  setupButtonRow.style.gap = "8px";

  for (const text of ["Export JSON", "Export URL", "Import JSON"]) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = text;
    button.style.flex = "1";
    button.style.padding = "6px";
    if (text === "Export JSON") {
      button.addEventListener("click", downloadJsonExport);
    } else if (text === "Export URL") {
      exportUrlButton = button;
      button.style.position = "relative";

      const feedbackLabel = document.createElement("span");

      feedbackLabel.className = "export-url-label";
      feedbackLabel.textContent = text;
      button.textContent = "";
      button.appendChild(feedbackLabel);

      const feedbackImage = document.createElement("img");

      feedbackImage.className = "export-url-feedback";
      feedbackImage.alt = "";
      feedbackImage.style.display = "none";
      feedbackImage.style.position = "absolute";
      feedbackImage.style.right = "2px";
      feedbackImage.style.bottom = "2px";
      feedbackImage.style.width = "16px";
      feedbackImage.style.height = "16px";
      feedbackImage.style.pointerEvents = "none";
      button.appendChild(feedbackImage);
      button.addEventListener("click", () => copyUrlExport(button));
    } else {
      button.addEventListener("click", openImportDialog);
    }
    setupButtonRow.appendChild(button);
  }

  setupContent.appendChild(setupButtonRow);

  let setupCollapsed = true;

  setupHeader.appendChild(setupTitle);
  setupHeader.appendChild(setupCollapseIcon);
  setupPanel.appendChild(setupHeader);
  setupPanel.appendChild(setupContent);
  setupHeader.setAttribute("role", "button");
  setupHeader.setAttribute("aria-controls", setupContent.id);
  setupHeader.setAttribute("aria-expanded", "false");
  setupHeader.tabIndex = 0;

  function toggleSetupPanel() {
    setupCollapsed = !setupCollapsed;

    if (!setupCollapsed) {
      collapseOtherPanels("setup");
    }

    setupContent.style.display = setupCollapsed ? "none" : "block";
    setupCollapseIcon.textContent = setupCollapsed ? "+" : "−";
    setupHeader.setAttribute("aria-expanded", String(!setupCollapsed));
    scheduleCubePanelPositionUpdate();
  }

  setupHeader.addEventListener("click", toggleSetupPanel);
  setupHeader.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleSetupPanel();
  });

  controlsRoot.appendChild(setupPanel);

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
    rotationArrowDirectionControl.style.display =
      showRotationArrowsCheckbox.checked ? "block" : "none";
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
    rotationArrowDepth = Number(rotationArrowDepthSlider.value);
    rotationArrowDepthValue.value = String(rotationArrowDepth);
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

    rotationArrowDepth = value;
    rotationArrowDepthSlider.value = String(Math.min(Math.max(value, 0), 2));
    updateRotationArrowDepth();
  });

  rotationArrowDepthValue.addEventListener("blur", () => {
    const value = Number(rotationArrowDepthValue.value);

    rotationArrowDepth = Number.isFinite(value)
      ? value
      : DEFAULT_ROTATION_ARROW_DEPTH;
    rotationArrowDepthValue.value = String(rotationArrowDepth);
    rotationArrowDepthSlider.value = String(
      Math.min(Math.max(rotationArrowDepth, 0), 2),
    );
    updateRotationArrowDepth();
  });

  rotationArrowThicknessSlider.addEventListener("input", () => {
    rotationArrowThickness = Number(rotationArrowThicknessSlider.value);
    rotationArrowThicknessValue.value = String(rotationArrowThickness);
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

    rotationArrowThickness = value;
    rotationArrowThicknessSlider.value = String(
      Math.min(Math.max(value, 0.001), 0.1),
    );
    updateRotationArrowThickness();
  });

  rotationArrowThicknessValue.addEventListener("blur", () => {
    const value = Number(rotationArrowThicknessValue.value);

    rotationArrowThickness = Number.isFinite(value)
      ? Math.min(Math.max(value, 0.001), 0.1)
      : DEFAULT_ROTATION_ARROW_THICKNESS;
    rotationArrowThicknessValue.value = String(rotationArrowThickness);
    rotationArrowThicknessSlider.value = String(rotationArrowThickness);
    updateRotationArrowThickness();
  });

  rotationArrowRadiusSlider.addEventListener("input", () => {
    rotationArrowRadius = Number(rotationArrowRadiusSlider.value);
    rotationArrowRadiusValue.value = String(rotationArrowRadius);
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

    rotationArrowRadius = value;
    rotationArrowRadiusSlider.value = String(Math.min(value, 2));
    updateRotationArrowRadius();
  });

  rotationArrowRadiusValue.addEventListener("blur", () => {
    const value = Number(rotationArrowRadiusValue.value);

    rotationArrowRadius = Number.isFinite(value)
      ? Math.max(value, 0.1)
      : DEFAULT_ROTATION_ARROW_RADIUS;
    rotationArrowRadiusValue.value = String(rotationArrowRadius);
    rotationArrowRadiusSlider.value = String(Math.min(rotationArrowRadius, 2));
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
    axisDepth = Number(axisDepthSlider.value);
    axisDepthValue.value = String(axisDepth);
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

    axisDepth = value;
    axisDepthSlider.value = String(Math.min(value, 1));
    updateAxisDepth();
  });

  axisDepthValue.addEventListener("blur", () => {
    const value = Number(axisDepthValue.value);

    axisDepth = Number.isFinite(value) ? Math.max(value, 0) : 0;
    axisDepthValue.value = String(axisDepth);
    axisDepthSlider.value = String(Math.min(axisDepth, 1));
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
    axisLabelDepth = Number(axisLabelDepthSlider.value);
    axisLabelDepthValue.value = String(axisLabelDepth);
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

    axisLabelDepth = value;
    axisLabelDepthSlider.value = String(Math.min(value, 1));
    updateAxisLabelDepth();
  });

  axisLabelDepthValue.addEventListener("blur", () => {
    const value = Number(axisLabelDepthValue.value);

    if (!Number.isFinite(value) || value <= 0) {
      axisLabelDepth = DEFAULT_LABEL_DEPTH;
      axisLabelDepthValue.value = String(axisLabelDepth);
      axisLabelDepthSlider.value = String(axisLabelDepth);
    } else {
      axisLabelDepth = value;
      axisLabelDepthValue.value = String(value);
      axisLabelDepthSlider.value = String(Math.min(value, 1));
    }

    updateAxisLabelDepth();
  });

  labelDepthSlider.addEventListener("input", () => {
    labelDepth = Number(labelDepthSlider.value);
    labelDepthValue.value = String(labelDepth);
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

    labelDepth = value;
    labelDepthSlider.value = String(Math.min(value, 1));
    refreshFaceletLabels();
  });

  labelDepthValue.addEventListener("blur", () => {
    const value = Number(labelDepthValue.value);

    if (!Number.isFinite(value) || value <= 0) {
      labelDepth = DEFAULT_LABEL_DEPTH;
      labelDepthValue.value = String(labelDepth);
      labelDepthSlider.value = String(labelDepth);
    } else {
      labelDepth = value;
      labelDepthValue.value = String(value);
      labelDepthSlider.value = String(Math.min(value, 1));
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
      colorsPanel.style.top = "";
      colorsPanel.style.right = "";

      if (labelsPanel) {
        labelsPanel.style.top = "";
        labelsPanel.style.right = "";
      }

      if (setupPanel) {
        setupPanel.style.top = "";
        setupPanel.style.right = "";
      }

      if (exportSvgButton) {
        exportSvgButton.style.top = "";
        exportSvgButton.style.right = "";
      }

      return;
    }

    cubePanel.style.top = "20px";
    cubePanel.style.right = "20px";
    colorsPanel.style.top = `${cubePanel.offsetTop + cubePanel.offsetHeight + 10}px`;
    colorsPanel.style.right = "20px";

    if (labelsPanel) {
      labelsPanel.style.top = `${
        colorsPanel.offsetTop + colorsPanel.offsetHeight + 10
      }px`;
    }

    if (setupPanel) {
      setupPanel.style.top = `${
        (labelsPanel ?? colorsPanel).offsetTop +
        (labelsPanel ?? colorsPanel).offsetHeight +
        10
      }px`;
      setupPanel.style.right = "20px";
    }

    if (exportSvgButton) {
      exportSvgButton.style.top = `${
        (setupPanel ?? labelsPanel ?? colorsPanel).offsetTop +
        (setupPanel ?? labelsPanel ?? colorsPanel).offsetHeight +
        10
      }px`;
    }
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
    resetCubeInterface();
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

    if (activePanel !== "setup" && !setupCollapsed) {
      setupCollapsed = true;
      setupContent.style.display = "none";
      setupCollapseIcon.textContent = "+";
      setupHeader.setAttribute("aria-expanded", "false");
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

  window.addEventListener("resize", updateCubePanelPosition);

  // ============================================================
  // Cube gap mode
  // ============================================================

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
  cubeContent.appendChild(cubeGapModeContainer);

  // ============================================================
  // Cube setting helper
  // ============================================================

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
    cubeContent.appendChild(setting);

    return {
      slider,
      value,
      setting,
    };
  }

  const sizeControls = createCubeSetting("Size", 0, 2, 0.01, defaultSize);

  const gapControls = createCubeSetting("Gap", 0, 1, 0.001, defaultGap);

  // ============================================================
  // Size controls
  // ============================================================

  sizeControls.slider.addEventListener("input", () => {
    size = Number(sizeControls.slider.value);

    sizeControls.value.value = size;

    updateCubeDimensions(size, gap);
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

    const clamped = MathUtils.clamp(value, 0, 2);

    size = clamped;

    sizeControls.slider.value = clamped;

    updateCubeDimensions(size, gap);
  });

  sizeControls.value.addEventListener("blur", () => {
    const raw = Number(sizeControls.value.value);

    const value = MathUtils.clamp(raw, 0, 2);

    size = Number.isFinite(value) ? value : defaultSize;

    sizeControls.value.value = size;
    sizeControls.slider.value = size;

    updateCubeDimensions(size, gap);
  });

  // ============================================================
  // Gap controls
  // ============================================================

  gapControls.slider.addEventListener("input", () => {
    gap = Number(gapControls.slider.value);

    gapControls.value.value = gap;

    updateCubeDimensions(size, gap);
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

    const clamped = MathUtils.clamp(value, 0, 1);

    gap = clamped;

    gapControls.slider.value = clamped;

    updateCubeDimensions(size, gap);
  });

  gapControls.value.addEventListener("blur", () => {
    const raw = Number(gapControls.value.value);

    const value = MathUtils.clamp(raw, 0, 1);

    gap = Number.isFinite(value) ? value : defaultGap;

    gapControls.value.value = gap;
    gapControls.slider.value = gap;

    updateCubeDimensions(size, gap);
  });

  const customDimensions = new Map(
    cubies.map((cubie) => [cubie, { size, gap }]),
  );
  const customDimensionInputs = new Map();
  const customGroupInputs = new Map();

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
  customDimensionsHeader.style.background = UI_PANEL_BACKGROUND;
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

      const clamped = MathUtils.clamp(value, min, max);

      for (const cubie of sortedDimensionCubies) {
        if (getCubieGroup(cubie) !== group) {
          continue;
        }

        customDimensions.get(cubie)[property] = clamped;
        customDimensionInputs.get(cubie)[property].value = String(clamped);
      }

      input.value = String(clamped);
      updateCubeDimensions(size, gap, customDimensions);
      updateGroupHeading(group);
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
      size: createGroupInput(group, "size", 0, 2),
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

      const clamped = MathUtils.clamp(value, min, max);
      const dimensions = customDimensions.get(cubie);

      dimensions[property] = clamped;
      input.value = String(clamped);
      updateCubeDimensions(size, gap, customDimensions);
      updateGroupHeading(getCubieGroup(cubie));
    }

    input.addEventListener("input", updateValue);
    input.addEventListener("change", updateValue);
    input.addEventListener("blur", () => {
      const value = Number(input.value);

      if (!Number.isFinite(value)) {
        input.value = String(customDimensions.get(cubie)[property]);
        return;
      }

      input.value = String(MathUtils.clamp(value, min, max));
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
    row.appendChild(createDimensionInput(cubie, "size", 0, 2));
    row.appendChild(createDimensionInput(cubie, "gap", 0, 1));
    customDimensionsContent.appendChild(row);
  }

  cubeContent.appendChild(customDimensionsContent);

  globalGapRadio.addEventListener("change", () => {
    if (!globalGapRadio.checked) {
      return;
    }

    customDimensionsContent.style.display = "none";
    sizeControls.setting.style.display = "block";
    gapControls.setting.style.display = "block";
    updateCubeDimensions(size, gap);
    scheduleCubePanelPositionUpdate();
  });

  customGapRadio.addEventListener("change", () => {
    if (!customGapRadio.checked) {
      return;
    }

    customDimensionsContent.style.display = "block";
    sizeControls.setting.style.display = "none";
    gapControls.setting.style.display = "none";
    cubeCollapsed = false;
    cubeContent.style.display = "block";
    cubeCollapseIcon.textContent = "−";
    updateCubeDimensions(size, gap, customDimensions);
    scheduleCubePanelPositionUpdate();
  });

  // ============================================================
  // Cube default
  // ============================================================

  function resetCubeInterface() {
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

    updateCubeDimensions(size, gap);
  }

  // ============================================================
  // Rotate button
  // ============================================================

  async function insertRotation() {
    if (!moveType) {
      return;
    }

    if (!validateCustomSequence({ updateLastRotationEdit: false })) {
      customSequenceInput.reportValidity();
      return;
    }

    if (lastRotationEdit === "sequence") {
      const sequence = parseCustomSequence(customSequenceInput.value);

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

    if (moveType === "custom" && !moveSelect.value) {
      return;
    }

    const move = moveSelect.value;

    const angle = getDirection();

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

    const selectedOption = moveSelect.options[moveSelect.selectedIndex];

    if (selectedOption) {
      const shortName = selectedOption.textContent.split(" - ")[0].trim();

      const moveText = getCustomMoveLabel(shortName, angle);
      const rotationAngle = getCustomRotationAngle(move, angle);

      if (moveText) {
        queueRotationAction({
          label: moveText,
          run: (duration) => rotateSlice(move, rotationAngle, duration),
          inverse: {
            label: getCustomMoveLabel(shortName, -angle),
            run: (duration) => rotateSlice(move, -rotationAngle, duration),
          },
        });
      }
    }
  }

  insertButton.addEventListener("click", () => {
    scheduleRotationInsertion(insertRotation);
  });

  // ============================================================
  // Reset
  // ============================================================

  function resetRotationInterface() {
    resetCubeOrientation();

    camera.position.set(5, 5, 7);

    controls.target.set(0, 0, 0);

    controls.update();

    moveSelect.value = "";
    lastRotationEdit = "move";
    customSequenceInput.value = "";
    validateCustomSequence();

    directionSlider.value = "90";
    directionValue.value = "90";

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
    rotationText.style.display = "none";
    copyRotationButton.style.display = "none";
    undoRotationButton.style.display = "none";
    copyIconImage.src = copyIcon;
    rotationText.style.left = "248px";

    fixedRadio.checked = false;
    customRadio.checked = false;

    moveType = null;

    fixedMoves.style.display = "none";
    customControls.style.display = "none";
    insertButton.style.display = "none";
  }

  function resetEverythingInterface() {
    resetCube();
    resetCubeInterface();
    resetColorsInterface();
    resetRotationInterface();

    rotationCollapsed = window.innerWidth <= 900;
    rotationContent.style.display = rotationCollapsed ? "none" : "block";
    updateRotationToggle();

    showFaceletLabelsCheckbox.checked = false;
    showAxisLabelsCheckbox.checked = false;
    showAxisArrowsCheckbox.checked = false;
    axisGroup.visible = false;
    axisLabelVisibilityControl.style.display = "none";
    setAllAxisLabelVisibility(false);
    axisArrowVisibilityControl.style.display = "none";
    setAllAxisArrowVisibility(false);
    showRotationArrowsCheckbox.checked = false;
    rotationArrowGroup.visible = false;
    rotationArrowVisibilityControl.style.display = "none";
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
    axisDepthControl.style.display = "none";
    axisDepth = 0;
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

    globalGapRadio.checked = true;
    customGapRadio.checked = false;
    customDimensionsContent.style.display = "none";
    sizeControls.setting.style.display = "block";
    gapControls.setting.style.display = "block";

    colorsCollapsed = true;
    colorsContent.style.display = "none";
    colorsPanel.style.overflowY = "hidden";
    colorsCollapseIcon.textContent = "+";
    colorsHeader.setAttribute("aria-expanded", "false");

    cubeCollapsed = true;
    cubeContent.style.display = "none";
    cubeCollapseIcon.textContent = "+";
    cubeHeader.setAttribute("aria-expanded", "false");

    setupCollapsed = true;
    setupContent.style.display = "none";
    setupCollapseIcon.textContent = "+";
    setupHeader.setAttribute("aria-expanded", "false");
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

  resetEverythingButton.addEventListener("click", () => {
    resetEverythingInterface();
    markSetupChanged();
  });

  controlsRoot.appendChild(resetEverythingButton);

  exportSvgButton = document.createElement("button");

  exportSvgButton.type = "button";
  exportSvgButton.textContent = "Export SVG";
  exportSvgButton.style.position = "absolute";
  exportSvgButton.style.top = "20px";
  exportSvgButton.style.right = "20px";
  exportSvgButton.style.width = "280px";
  exportSvgButton.style.padding = "8px";
  exportSvgButton.style.cursor = "pointer";

  exportSvgButton.addEventListener("click", async () => {
    try {
      await exportSvgArchive();
    } catch (error) {
      console.error("Unable to export SVG archive.", error);
    }
  });

  controlsRoot.insertBefore(exportSvgButton, resetEverythingButton);

  updateCubePanelPosition();
}
