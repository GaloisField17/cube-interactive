export function createSetupPanel({
  panelBackground,
  panelBorder,
  panelBorderRadius,
  panelBoxShadow,
  fontFamily,
  fontSize,
  onExportJson,
  onImportJson,
  onExportSvg,
  onExpand,
  onLayoutChange,
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
  header.style.cursor = "pointer";
  header.style.userSelect = "none";

  const title = document.createElement("span");

  title.textContent = "Export / Import";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";

  const collapseIcon = document.createElement("span");

  collapseIcon.textContent = "+";
  collapseIcon.style.fontSize = "20px";
  collapseIcon.style.lineHeight = "1";

  const content = document.createElement("div");

  content.id = "setup-panel-content";
  content.style.display = "none";
  content.style.marginTop = "12px";

  const buttonRow = document.createElement("div");

  buttonRow.style.display = "flex";
  buttonRow.style.gap = "8px";

  for (const [text, onClick] of [
    ["Export JSON", onExportJson],
    ["Import JSON", onImportJson],
  ]) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = text;
    button.style.flex = "1";
    button.style.padding = "6px";
    button.addEventListener("click", onClick);
    buttonRow.appendChild(button);
  }

  content.appendChild(buttonRow);

  const exportSvgButton = document.createElement("button");

  exportSvgButton.type = "button";
  exportSvgButton.textContent = "Export SVG";
  exportSvgButton.style.width = "100%";
  exportSvgButton.style.marginTop = "8px";
  exportSvgButton.style.padding = "8px";
  exportSvgButton.style.cursor = "pointer";
  exportSvgButton.style.boxSizing = "border-box";
  exportSvgButton.addEventListener("click", async () => {
    try {
      await onExportSvg();
    } catch (error) {
      console.error("Unable to export SVG archive.", error);
    }
  });
  content.appendChild(exportSvgButton);

  header.appendChild(title);
  header.appendChild(collapseIcon);
  root.appendChild(header);
  root.appendChild(content);
  header.setAttribute("role", "button");
  header.setAttribute("aria-controls", content.id);
  header.setAttribute("aria-expanded", "false");
  header.tabIndex = 0;

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

  return { root, setExpanded };
}
