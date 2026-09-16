import { Color, MathUtils } from "three";
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
import { createSvgArchive } from "./svgExport.js";

export function createUI({
  scene,
  camera,
  controls,
  cubies,
  facelets,
  colors,
  defaultColors,
  defaultSize,
  defaultGap,
  durationState,
  rotateSlice,
  rotateMove,
  getRotationDefinition,
  resetCube,
  resetCubeOrientation,
  resetVisualRotations,
  updateCubeDimensions,
  size: initialSize,
  gap: initialGap,
  normalizeAngle,
}) {
  // ============================================================
  // Local cube settings
  // ============================================================

  let size = initialSize;
  let gap = initialGap;

  const controlsRoot = document.createElement("div");

  controlsRoot.className = "responsive-controls";
  document.body.appendChild(controlsRoot);

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
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    boxSizing: "border-box",
  });

  controlsRoot.appendChild(panel);

  // ============================================================
  // Helper
  // ============================================================

  function setStyles(element, styles) {
    Object.assign(element.style, styles);
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
    camera,
    cubies,
    getSize: () => size,
    getGap: () => gap,
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

  const resetButton = document.createElement("button");

  resetButton.className = "compact-icon-button";
  resetButton.type = "button";
  resetButton.title = "Reset rotation";
  resetButton.setAttribute("aria-label", "Reset rotation");
  resetButton.style.width = "22px";
  resetButton.style.height = "22px";
  resetButton.style.padding = "2px";
  resetButton.style.boxSizing = "border-box";
  resetButton.style.cursor = "pointer";

  const resetButtonImage = document.createElement("img");

  resetButtonImage.src = resetIcon;
  resetButtonImage.alt = "";
  resetButtonImage.style.width = "100%";
  resetButtonImage.style.height = "100%";
  resetButtonImage.style.display = "block";
  resetButtonImage.style.pointerEvents = "none";

  resetButton.appendChild(resetButtonImage);
  resetButton.addEventListener("click", (event) => {
    event.stopPropagation();
    resetRotationInterface();
  });
  rotationTitleRow.appendChild(resetButton);
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
  rotationToggleButton.title = "Collapse or expand rotation controls";
  rotationToggleButton.setAttribute(
    "aria-label",
    "Collapse or expand rotation controls",
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
  rotationText.setAttribute("aria-label", "Rotation sequence");

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
  copyRotationButton.title = "Copy rotations to clipboard";
  copyRotationButton.setAttribute("aria-label", "Copy rotations to clipboard");
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
  undoRotationButton.title = "Undo latest rotation";
  undoRotationButton.setAttribute("aria-label", "Undo latest rotation");
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
      queuedRotationActions = [];
      durationState.stopAfterCurrent = false;
      rotationStopRequested = false;
    }

    const rotationEntry = display ? appendRotationEntry(action.label) : null;
    const activeEntry = animationEntry ?? rotationEntry;

    if (record) {
      action.entry = rotationEntry;
      rotationActions.push(action);
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
        } else if (queuedRotationActions.length === 0) {
          rotationPlaybackState = "idle";
          setRotationStatus("idle");
        }

        setPlayPauseIcon(false);
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

    const actionsToPlay = queuedRotationActions;

    queuedRotationActions = [];
    rotationStopRequested = false;

    for (const action of actionsToPlay) {
      queueRotationAction(action, {
        record: false,
        display: false,
        animationEntry: action.entry,
      });
    }
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

  function stopRotationAndWait() {
    if (
      rotationPlaybackState === "idle" ||
      rotationPlaybackState === "stopped"
    ) {
      return Promise.resolve();
    }

    stopRotationAfterCurrent();

    if (
      rotationPlaybackState === "stopped" &&
      pendingRotationEntries.length === 0
    ) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      rotationStopWaiters.push(resolve);
    });
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
      value: 0,
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

  function getCustomMoveLabel(shortName, angle) {
    const normalized = normalizeAngle(angle);

    if (normalized === 90) return shortName;
    if (normalized === -90) return `${shortName}'`;
    if (normalized === 180 || normalized === -180) return `${shortName}2`;
    if (normalized !== 0) return `${shortName}(${normalized}°)`;

    return "";
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

  const rotateButton = document.createElement("button");

  let lastRotationEdit = "move";

  rotateButton.type = "button";
  rotateButton.textContent = "Rotate";

  rotateButton.style.display = "none";
  rotateButton.style.width = "100%";
  rotateButton.style.padding = "8px";
  rotateButton.style.cursor = "pointer";

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
      .slice(0, 1);
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
    const duration = Number.isFinite(raw)
      ? Math.max(Math.floor(raw * 10) / 10, 0)
      : 1;

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
  stopRotationButton.title = "Stop rotation";
  stopRotationButton.setAttribute("aria-label", "Stop rotation");
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
  toEndButton.title = "Go to end";
  toEndButton.setAttribute("aria-label", "Go to end");
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
    "Play or pause rotation",
  );
  playPauseButton.classList.add("rotation-control-play");

  playPauseButton.addEventListener("click", () => {
    if (rotationPlaybackState === "playing") {
      pauseRotationAnimation();
    } else {
      resumeQueuedRotations();
    }
  });

  const toStartButton = createRotationControlButton(toStartIcon, "Go to start");
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

  function executeMove(moveName) {
    const definition = getRotationDefinition(moveName);

    if (!definition) {
      console.warn(`Unknown move: ${moveName}`);
      return;
    }

    const inverseMoveName = getInverseMoveName(moveName);

    queueRotationAction({
      label: moveName,
      run: (duration) => rotateMove(moveName, duration),
      inverse: {
        label: inverseMoveName,
        run: (duration) => rotateMove(inverseMoveName, duration),
      },
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

        button.addEventListener("click", () => {
          executeMove(move);
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
  customControls.appendChild(moveControlRow);

  const moveSelect = document.createElement("select");

  moveSelect.style.flex = "1";
  moveSelect.style.minWidth = "0";
  moveSelect.style.padding = "6px";
  moveSelect.style.boxSizing = "border-box";

  const emptyMove = document.createElement("option");

  emptyMove.value = "";
  emptyMove.textContent = "Select move";
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

  customControls.appendChild(directionLabel);

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
  directionSlider.step = "1";
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

    if (raw === "" || raw === "-") {
      return;
    }

    if (!/^-?\d+$/.test(raw)) {
      directionValue.value = raw.replace(/[^\d-]/g, "");
      return;
    }

    const angle = normalizeAngle(raw);

    directionSlider.value = angle;
  });

  directionValue.addEventListener("blur", () => {
    lastRotationEdit = "move";

    const angle = normalizeAngle(directionValue.value);

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

  customControls.appendChild(directionContainer);

  const customSequenceLabel = createLabel("Custom Sequence");

  customSequenceLabel.style.display = "flex";
  customSequenceLabel.style.alignItems = "center";
  customSequenceLabel.style.justifyContent = "space-between";

  const customSequenceInfoButton = document.createElement("button");

  customSequenceInfoButton.className = "compact-icon-button";
  customSequenceInfoButton.type = "button";
  customSequenceInfoButton.title =
    "Enter moves separated by spaces, such as R U R' or F(33deg)";
  customSequenceInfoButton.setAttribute(
    "aria-label",
    "Enter moves separated by spaces, such as R U R' or F(33deg)",
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

  customControls.appendChild(customSequenceLabel);

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

  function isValidCustomSequence(value) {
    const sequence = value.trim();

    if (sequence === "") {
      return true;
    }

    return sequence.split(/\s+/).every((move) => {
      if (getRotationDefinition(move)) {
        return true;
      }

      const customMove = move.match(/^(.+)\(([+-]?\d+(?:\.\d+)?)deg\)$/);

      if (!customMove) {
        return false;
      }

      return Boolean(getRotationDefinition(customMove[1]));
    });
  }

  function parseCustomSequence(value) {
    return value
      .trim()
      .split(/\s+/)
      .map((move) => {
        if (getRotationDefinition(move)) {
          const inverse = getInverseMoveName(move);

          return {
            label: move,
            run: (duration) => rotateMove(move, duration),
            inverse: (duration) => rotateMove(inverse, duration),
            inverseLabel: inverse,
          };
        }

        const customMove = move.match(/^(.+)\(([+-]?\d+(?:\.\d+)?)deg\)$/);

        if (!customMove || !getRotationDefinition(customMove[1])) {
          return null;
        }

        const moveName = customMove[1];
        const angle = Number(customMove[2]);
        const rotationAngle = getCustomRotationAngle(moveName, angle);

        return {
          label: moveName,
          run: (duration) => rotateSlice(moveName, rotationAngle, duration),
          inverse: (duration) =>
            rotateSlice(moveName, -rotationAngle, duration),
          inverseLabel: getCustomMoveLabel(moveName, -angle),
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
        : "Use valid rotation moves separated by spaces, such as R U R' or F(33deg).",
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
        ? `Rotate ${moveNotation}`
        : `Rotate ${lastRotationEdit}`;

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
    rotateButton.disabled = isDisabled;
    rotateButton.textContent = isDisabled
      ? requiresMoveSelection
        ? "Select move or sequence"
        : "Invalid sequence"
      : rotationLabel;
    rotateButton.style.opacity = isDisabled ? "0.5" : "1";
    rotateButton.style.cursor = isDisabled ? "not-allowed" : "pointer";
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

  customControls.appendChild(customSequenceInputRow);
  customControls.appendChild(rotateButton);
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
    rotateButton.style.display = "none";
  });

  customRadio.addEventListener("change", () => {
    if (!customRadio.checked) {
      return;
    }

    moveType = "custom";

    fixedMoves.style.display = "none";
    customControls.style.display = "block";
    rotateButton.style.display = "block";
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
  colorsPanel.style.background = "rgba(255, 255, 255, 0.95)";
  colorsPanel.style.borderRadius = "8px";
  colorsPanel.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
  colorsPanel.style.fontFamily = "Arial, sans-serif";
  colorsPanel.style.fontSize = "14px";
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

  const colorsCollapseIcon = document.createElement("span");

  colorsCollapseIcon.textContent = "−";
  colorsCollapseIcon.style.fontSize = "20px";
  colorsCollapseIcon.style.lineHeight = "1";

  colorsHeader.appendChild(colorsTitle);
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
    updateCubePanelPosition();
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
  // Default colors button
  // ============================================================

  const defaultColorsButton = document.createElement("button");

  defaultColorsButton.type = "button";
  defaultColorsButton.textContent = "Default colors";

  defaultColorsButton.style.width = "100%";
  defaultColorsButton.style.padding = "8px";
  defaultColorsButton.style.marginBottom = "14px";
  defaultColorsButton.style.cursor = "pointer";

  colorsContent.appendChild(defaultColorsButton);

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
        columnPositive: "B",
        columnNegative: "F",
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
        rowPositive: "B",
        rowNegative: "F",
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

    input.value = facelet.sticker.color;

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

      facelet.sticker.color = value;

      const materialIndex = facelet.materialIndex;

      if (
        materialIndex !== undefined &&
        facelet.cubie.material[materialIndex]
      ) {
        facelet.cubie.material[materialIndex].color.set(value);
      }

      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = value;
      updateFaceColorControl(facelet.face);
    }

    input.addEventListener("input", updateColor);
    input.addEventListener("change", updateColor);

    colorInputs.set(facelet.sticker, {
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

    const sectionFacelets = facelets.filter((facelet) => facelet.face === face);
    const colors = sectionFacelets.map((facelet) => {
      const color = new Color();

      color.set(facelet.sticker.color);
      return color.getHex();
    });

    const firstColor = colors[0];
    const isUniform = colors.every((color) => color === firstColor);

    if (isUniform) {
      const firstFacelet = sectionFacelets[0];

      controls.input.value = firstFacelet ? firstFacelet.sticker.color : "";
      controls.input.placeholder = "";
      controls.preview.style.backgroundImage = "none";
      controls.preview.style.backgroundColor = firstFacelet
        ? firstFacelet.sticker.color
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

  function createFaceColorControl(face, sectionFacelets) {
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

      for (const facelet of sectionFacelets) {
        facelet.sticker.color = value;

        const faceletControls = colorInputs.get(facelet.sticker);

        if (faceletControls) {
          faceletControls.input.value = value;
          faceletControls.preview.style.backgroundImage = "none";
          faceletControls.preview.style.backgroundColor = value;
        }

        const materialIndex = facelet.materialIndex;

        if (
          materialIndex !== undefined &&
          facelet.cubie.material[materialIndex]
        ) {
          facelet.cubie.material[materialIndex].color.set(value);
        }
      }

      updateFaceColorControl(face);
    }

    input.addEventListener("input", applyColor);
    input.addEventListener("change", applyColor);

    return controls;
  }

  for (const [face, title] of faceletSections) {
    const sectionFacelets = facelets.filter((facelet) => facelet.face === face);

    const heading = document.createElement("div");

    heading.style.display = "flex";
    heading.style.alignItems = "center";
    heading.style.gap = "6px";
    heading.style.fontWeight = "bold";
    heading.style.marginTop = "10px";
    heading.style.marginBottom = "7px";

    const headingText = document.createElement("span");

    headingText.textContent = title;

    const faceControls = createFaceColorControl(face, sectionFacelets);

    heading.appendChild(headingText);
    heading.appendChild(faceControls.input);
    heading.appendChild(faceControls.preview);
    colorsContent.appendChild(heading);

    for (const facelet of sectionFacelets) {
      colorsContent.appendChild(createFaceletRow(facelet));
    }

    updateFaceColorControl(face);
  }

  // ============================================================
  // Inner cubie color editor
  // ============================================================

  const innerHeading = document.createElement("div");

  innerHeading.style.display = "flex";
  innerHeading.style.alignItems = "center";
  innerHeading.style.gap = "6px";
  innerHeading.style.fontWeight = "bold";
  innerHeading.style.marginTop = "14px";
  innerHeading.style.marginBottom = "7px";

  const innerTitle = document.createElement("span");

  innerTitle.textContent = "Inner";

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

  innerHeading.appendChild(innerTitle);
  innerHeading.appendChild(innerInput);
  innerHeading.appendChild(innerPreview);
  colorsContent.appendChild(innerHeading);

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
    cubie.userData.innerColor = value;

    for (const material of cubie.material) {
      material.color.set(value);
    }

    for (const facelet of facelets) {
      if (facelet.cubie !== cubie) {
        continue;
      }

      facelet.cubie.material[facelet.materialIndex].color.set(
        facelet.sticker.color,
      );
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
    input.value = cubie.userData.innerColor;
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

    colorsContent.appendChild(controls.row);

    return { cubie, ...controls };
  });

  function updateInnerHeading() {
    const colors = cubies.map((cubie) => {
      const color = new Color();

      color.set(cubie.userData.innerColor);
      return color.getHex();
    });
    const firstColor = colors[0];
    const isUniform = colors.every((color) => color === firstColor);

    if (isUniform) {
      innerInput.value = cubies[0]?.userData.innerColor ?? "";
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
      input.value = value;
      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = value;
    }

    updateInnerHeading();
  }

  innerInput.addEventListener("input", applyInnerColor);
  innerInput.addEventListener("change", applyInnerColor);
  updateInnerHeading();

  // ============================================================
  // Default colors
  // ============================================================

  defaultColorsButton.addEventListener("click", () => {
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

      facelet.sticker.color = color;

      const materialIndex = facelet.materialIndex;

      if (
        materialIndex !== undefined &&
        facelet.cubie.material[materialIndex]
      ) {
        facelet.cubie.material[materialIndex].color.set(color);
      }

      const controls = colorInputs.get(facelet.sticker);

      if (controls) {
        controls.input.value = color;
        controls.preview.style.backgroundColor = color;
      }

      updateFaceColorControl(facelet.face);
    }

    for (const { cubie, input, preview } of innerColorControls) {
      setCubieInnerColor(cubie, defaultColors.inner);
      input.value = defaultColors.inner;
      preview.style.backgroundImage = "none";
      preview.style.backgroundColor = defaultColors.inner;
    }

    updateInnerHeading();
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
  cubePanel.style.background = "rgba(255, 255, 255, 0.95)";
  cubePanel.style.borderRadius = "8px";
  cubePanel.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
  cubePanel.style.fontFamily = "Arial, sans-serif";
  cubePanel.style.fontSize = "14px";
  cubePanel.style.boxSizing = "border-box";

  controlsRoot.insertBefore(cubePanel, colorsPanel);

  function updateCubePanelPosition() {
    if (window.innerWidth <= 900) {
      return;
    }

    cubePanel.style.top = "20px";
    cubePanel.style.right = "20px";
    colorsPanel.style.top = `${cubePanel.offsetTop + cubePanel.offsetHeight + 10}px`;
    colorsPanel.style.right = "20px";
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

  const cubeCollapseIcon = document.createElement("span");

  cubeCollapseIcon.textContent = "−";
  cubeCollapseIcon.style.fontSize = "20px";
  cubeCollapseIcon.style.lineHeight = "1";

  cubeHeader.appendChild(cubeTitle);
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
  }

  function toggleCubePanel() {
    cubeCollapsed = !cubeCollapsed;

    if (!cubeCollapsed) {
      collapseOtherPanels("cube");
    }

    cubeContent.style.display = cubeCollapsed ? "none" : "block";
    cubeCollapseIcon.textContent = cubeCollapsed ? "+" : "−";
    cubeHeader.setAttribute("aria-expanded", String(!cubeCollapsed));
    updateCubePanelPosition();
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
  // Cube default button
  // ============================================================

  const cubeDefaultButton = document.createElement("button");

  cubeDefaultButton.type = "button";
  cubeDefaultButton.textContent = "Default";

  cubeDefaultButton.style.width = "100%";
  cubeDefaultButton.style.padding = "8px";
  cubeDefaultButton.style.marginBottom = "16px";
  cubeDefaultButton.style.cursor = "pointer";

  cubeContent.appendChild(cubeDefaultButton);

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
  customDimensionsHeader.style.fontWeight = "bold";

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
    heading.style.fontWeight = "bold";
    heading.style.marginTop = "10px";
    heading.style.marginBottom = "6px";

    const title = document.createElement("span");

    title.textContent = group;

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
    updateCubePanelPosition();
    updateCubeDimensions(size, gap, customDimensions);
  });

  // ============================================================
  // Cube default
  // ============================================================

  cubeDefaultButton.addEventListener("click", () => {
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
  });

  // ============================================================
  // Rotate button
  // ============================================================

  rotateButton.addEventListener("click", () => {
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
    rotateButton.style.display = "none";
  }

  function resetCubeInterface() {
    resetCube();
    cubeDefaultButton.click();
    defaultColorsButton.click();
    resetRotationInterface();

    globalGapRadio.checked = true;
    customGapRadio.checked = false;
    customDimensionsContent.style.display = "none";
    sizeControls.setting.style.display = "block";
    gapControls.setting.style.display = "block";
  }

  const resetCubeButton = document.createElement("button");

  resetCubeButton.type = "button";
  resetCubeButton.textContent = "RESET CUBE";
  resetCubeButton.style.position = "absolute";
  resetCubeButton.style.top = "20px";
  resetCubeButton.style.left = "20px";
  resetCubeButton.style.height = "42px";
  resetCubeButton.style.width = "220px";
  resetCubeButton.style.padding = "8px";
  resetCubeButton.style.cursor = "pointer";
  resetCubeButton.style.background = "#f8d7da";
  resetCubeButton.style.border = "1px solid #c94c59";
  resetCubeButton.style.color = "#842029";
  resetCubeButton.style.fontWeight = "bold";
  resetCubeButton.style.boxSizing = "border-box";
  addHoverEffect(resetCubeButton, "#f3c7cc");

  resetCubeButton.addEventListener("click", resetCubeInterface);

  controlsRoot.appendChild(resetCubeButton);

  const exportSvgButton = document.createElement("button");

  exportSvgButton.type = "button";
  exportSvgButton.textContent = "Export SVG";
  exportSvgButton.style.position = "fixed";
  exportSvgButton.style.bottom = "20px";
  exportSvgButton.style.left = "20px";
  exportSvgButton.style.width = "220px";
  exportSvgButton.style.padding = "8px";
  exportSvgButton.style.cursor = "pointer";

  exportSvgButton.addEventListener("click", async () => {
    try {
      await exportSvgArchive();
    } catch (error) {
      console.error("Unable to export SVG archive.", error);
    }
  });

  controlsRoot.appendChild(exportSvgButton);

  updateCubePanelPosition();
}
