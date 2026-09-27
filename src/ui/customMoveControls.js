import infoIcon from "../assets/info.png";
import sequenceInvalidIcon from "../assets/cross.png";
import sequencePendingIcon from "../assets/yes-pending.png";
import {
  default as sequenceValidIcon,
} from "../assets/yes.png";
import { normalizeAngle } from "../cubeMath.js";
import {
  getCustomMoveLabel,
  normalizeWideMoveName,
  parseCustomMove,
  stripCustomMoveParentheses,
} from "../customRotation.js";
import { ROTATIONS } from "../rotationDefinitions.js";

function getCustomSequenceMoves(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(stripCustomMoveParentheses);
}

function isValidCustomSequence(value) {
  const sequence = value.trim();

  if (sequence === "") {
    return true;
  }

  return getCustomSequenceMoves(sequence).every((move) => {
    const normalizedMove = normalizeWideMoveName(move);

    if (ROTATIONS[normalizedMove]) {
      return true;
    }

    const customMove = parseCustomMove(move);

    if (!customMove) {
      return false;
    }

    return Boolean(ROTATIONS[normalizeWideMoveName(customMove.moveName)]);
  });
}

export function createCustomMoveControls({
  createLabel,
  sequencePlaceholder,
  scheduleSubmission,
  onInsertRequest,
}) {
  let lastRotationEdit = "move";
  const root = document.createElement("div");

  root.style.display = "none";

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
  customSequenceInput.placeholder = sequencePlaceholder;
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

  const insertButton = document.createElement("button");

  insertButton.type = "button";
  insertButton.textContent = "Insert";
  insertButton.style.display = "none";
  insertButton.style.width = "100%";
  insertButton.style.padding = "8px";
  insertButton.style.cursor = "pointer";

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

  function createInsertRequest() {
    if (!validateCustomSequence({ updateLastRotationEdit: false })) {
      customSequenceInput.reportValidity();
      return null;
    }

    if (lastRotationEdit === "sequence") {
      return {
        type: "sequence",
        value: customSequenceInput.value,
      };
    }

    const selectedOption = moveSelect.options[moveSelect.selectedIndex];

    return {
      type: "move",
      moveName: moveSelect.value,
      shortName: selectedOption?.textContent.split(" - ")[0].trim(),
      angle: getDirection(),
    };
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

  root.appendChild(customSequenceLabel);
  root.appendChild(customSequenceInputRow);
  root.appendChild(moveControlRow);
  root.appendChild(directionLabel);
  root.appendChild(directionContainer);
  root.appendChild(insertButton);
  updateRotateButtonState();

  insertButton.addEventListener("click", () => {
    scheduleSubmission(() => {
      const request = createInsertRequest();

      if (request) {
        return onInsertRequest(request);
      }
    });
  });

  function reset() {
    moveSelect.value = "";
    lastRotationEdit = "move";
    customSequenceInput.value = "";
    validateCustomSequence();
    directionSlider.value = "90";
    directionValue.value = "90";
  }

  function setVisible(visible) {
    root.style.display = visible ? "block" : "none";
    insertButton.style.display = visible ? "block" : "none";
  }

  return { root, reset, setVisible };
}