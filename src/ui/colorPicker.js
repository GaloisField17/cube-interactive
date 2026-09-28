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
  getInitialColor,
  undo,
}) {
  const picker = document.createElement("input");

  picker.type = "color";
  picker.style.display = "none";
  const undoButton = undo ? document.createElement("button") : null;
  let initialColor = "";
  let initialUndoState;
  let pickerStartedMixed = false;
  let pickerOpen = false;
  let pickerSelectionCommitted = false;
  let pickerCancellationRequested = false;

  function openPicker() {
    initialColor = input.value;
    pickerStartedMixed = Boolean(undo?.isAvailable());
    initialUndoState = pickerStartedMixed
      ? undo.getSnapshot()
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
  }

  function restoreCancelledColor() {
    if (!pickerOpen || pickerSelectionCommitted) {
      return;
    }

    pickerOpen = false;
    pickerCancellationRequested = true;
    if (pickerStartedMixed) {
      undo.restoreSnapshot(initialUndoState);
    } else {
      input.value = initialColor;
      onColorChange();
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
        undo.restoreSnapshot(initialUndoState);
      } else {
        input.value = initialColor;
        onColorChange();
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
      undo.restoreSnapshot(initialUndoState);
      undoButton.style.display = "none";
    });
    preview.style.position = "relative";
    preview.style.marginRight = "22px";
    preview.appendChild(undoButton);
  }

  preview.appendChild(picker);
}