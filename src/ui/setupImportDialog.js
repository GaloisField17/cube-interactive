import {
  mergeImportedValues,
  validateImportedDocument,
} from "../setupDocument.js";

export function openSetupImportDialog({
  getDefaultSetup,
  onImport,
  dialogStyle,
}) {
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
  dialog.style.borderRadius = dialogStyle.borderRadius;
  dialog.style.boxShadow = dialogStyle.boxShadow;
  dialog.style.fontFamily = dialogStyle.fontFamily;
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
      const validatedSetup = validateImportedDocument(document);
      const importedSetup = mergeImportedValues(
        getDefaultSetup(),
        validatedSetup,
      );

      onImport(importedSetup);
      overlay.remove();
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Unable to import this setup.";
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
