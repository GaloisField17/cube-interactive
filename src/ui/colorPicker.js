import undoIcon from "../assets/undo.png";
import { getNamedColorOrHex } from "../colorNames.js";
import { Color } from "three";

function getColorPickerValue(value) {
  const color = new Color();

  try {
    color.set(value);
    return `#${color.getHexString()}`;
  } catch {
    return "#000000";
  }
}

export function attachColorPicker({
  preview,
  input,
  onColorChange,
  onColorCommit,
  getInitialColor,
  undo,
}) {
  const picker = document.createElement("input");

  picker.type = "color";
  picker.style.display = "none";
  const undoButton = undo ? document.createElement("button") : null;
  let initialColor = "";
  let initialUndoState;
  let editUndoState;
  let committedUndoState;
  let pickerOpen = false;
  let pickerSelectionCommitted = false;
  let pickerCancellationRequested = false;

  function setUndoAvailable(available) {
    undoButton.style.display = available ? "block" : "none";
    preview.style.marginRight = available ? "22px" : "0";
  }

  function cloneUndoState(value) {
    return structuredClone(value);
  }

  function areUndoStatesEqual(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
  }

  function captureEditUndoState() {
    if (undo) {
      editUndoState = cloneUndoState(undo.getSnapshot());
    }
  }

  function restoreUndoState(snapshot, activityCommitter = null) {
    if (undo?.restoreSnapshot) {
      undo.restoreSnapshot(snapshot, activityCommitter);
      return;
    }

    if (undo) {
      input.value = snapshot;
      onColorChange();
    }
  }

  function commitColorChange() {
    if (undo) {
      const nextUndoState = undo.getSnapshot();
      const previousUndoState = editUndoState ?? nextUndoState;

      if (!areUndoStatesEqual(previousUndoState, nextUndoState)) {
        committedUndoState = cloneUndoState(previousUndoState);
        setUndoAvailable(true);
      }
      editUndoState = null;
    }

    onColorCommit?.();
  }

  function openPicker() {
    initialColor = input.value;
    captureEditUndoState();
    initialUndoState = undo
      ? cloneUndoState(editUndoState)
      : input.value;
    const pickerColor = input.value || getInitialColor?.() || "#000000";

    picker.value = getColorPickerValue(pickerColor);
    pickerOpen = true;
    pickerSelectionCommitted = false;
    pickerCancellationRequested = false;
    picker.click();
  }

  function previewPickedColor() {
    input.value = getNamedColorOrHex(picker.value);
    onColorChange();
  }

  function commitPickedColor() {
    if (pickerCancellationRequested) {
      return;
    }

    pickerSelectionCommitted = true;
    pickerOpen = false;
    input.value = getNamedColorOrHex(picker.value);
    onColorChange();
    commitColorChange();
  }

  function restoreCancelledColor() {
    if (!pickerOpen || pickerSelectionCommitted) {
      return;
    }

    pickerOpen = false;
    pickerCancellationRequested = true;
    if (undo) {
      restoreUndoState(initialUndoState);
    } else {
      input.value = initialColor;
      onColorChange();
    }
    editUndoState = null;
  }

  function handlePickerCancel() {
    pickerOpen = false;
    pickerSelectionCommitted = false;
    pickerCancellationRequested = true;
    window.setTimeout(() => {
      if (undo) {
        restoreUndoState(initialUndoState);
      } else {
        input.value = initialColor;
        onColorChange();
      }
      editUndoState = null;
    }, 0);
  }

  if (undo) {
    input.addEventListener("focus", captureEditUndoState);
    input.addEventListener("change", commitColorChange);
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
      restoreUndoState(committedUndoState, undo.activityCommitter);
      onColorCommit?.();
      committedUndoState = null;
      editUndoState = null;
      setUndoAvailable(false);
    });
    preview.style.position = "relative";
    preview.style.marginRight = "0";
    preview.appendChild(undoButton);
  }

  preview.appendChild(picker);
}
