import { syncButtonDisabledAppearance } from "./buttonDisabledAppearance.js";

function styleMenuButton(button) {
  button.type = "button";
  button.style.minWidth = "88px";
  button.style.padding = "8px 12px";
  button.style.border = "1px solid rgba(0, 0, 0, 0.18)";
  button.style.borderRadius = "4px";
  button.style.background = "#f8fafc";
  button.style.color = "#1f2937";
  button.style.cursor = "pointer";
  button.style.boxSizing = "border-box";
  button.style.transition = "background-color 120ms ease";
  button.addEventListener("mouseenter", () => {
    if (!button.disabled) {
      button.style.background = "#edf4ff";
    }
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "#f8fafc";
  });
}

function formatActivityTimestamp(timestamp) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

  return `${values.day} ${values.month} ${values.year} at ${values.hour}:${values.minute}:${values.second}`;
}

function renderActivityDescription(element, activity) {
  if (!activity.descriptionParts) {
    element.textContent = activity.description;
    return;
  }

  for (const part of activity.descriptionParts) {
    if (typeof part === "string") {
      element.appendChild(document.createTextNode(part));
      continue;
    }

    const code = document.createElement("code");

    code.textContent = part.code;
    code.style.fontFamily = "monospace";
    code.style.color = "#d7ba7d";
    code.style.background = "#3A3A3A";
    code.style.padding = "1px 4px";
    code.style.borderRadius = "3px";
    element.appendChild(code);
  }
}

export function createActivityLogWindow({
  activityLogState,
  onRevert,
  onJump,
}) {
  const overlay = document.createElement("div");
  const dialog = document.createElement("div");
  const header = document.createElement("div");
  const title = document.createElement("h2");
  const closeButton = document.createElement("button");
  const toolbar = document.createElement("div");
  const filterContainer = document.createElement("div");
  const filterButton = document.createElement("button");
  const filterMenu = document.createElement("div");
  const filterOptions = document.createElement("div");
  const revertButton = document.createElement("button");
  const jumpButton = document.createElement("button");
  const activityList = document.createElement("div");
  const emptyMessage = document.createElement("div");
  const status = document.createElement("div");
  let filterCheckboxes = [];

  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "1200";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0, 0, 0, 0.35)";
  overlay.style.padding = "20px";
  overlay.style.boxSizing = "border-box";

  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Activity Log");
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  dialog.style.width = "min(760px, 100%)";
  dialog.style.maxHeight = "calc(100vh - 40px)";
  dialog.style.padding = "18px";
  dialog.style.background = "white";
  dialog.style.border = "1px solid rgba(0, 0, 0, 0.14)";
  dialog.style.borderRadius = "8px";
  dialog.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
  dialog.style.fontFamily = "Arial, sans-serif";
  dialog.style.fontSize = "14px";
  dialog.style.boxSizing = "border-box";
  dialog.style.overflow = "hidden";

  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";

  title.textContent = "Activity Log";
  title.style.margin = "0";
  title.style.fontSize = "20px";
  title.style.fontWeight = "bold";

  closeButton.textContent = "Close";
  closeButton.setAttribute("aria-label", "Close Activity Log");
  styleMenuButton(closeButton);
  closeButton.style.minWidth = "auto";

  toolbar.style.display = "flex";
  toolbar.style.alignItems = "center";
  toolbar.style.gap = "8px";
  toolbar.style.position = "relative";
  toolbar.style.marginTop = "14px";
  toolbar.style.marginBottom = "12px";

  filterContainer.style.position = "relative";
  filterButton.textContent = "Filter";
  filterButton.setAttribute("aria-haspopup", "true");
  filterButton.setAttribute("aria-expanded", "false");
  styleMenuButton(filterButton);

  filterMenu.setAttribute("role", "group");
  filterMenu.setAttribute("aria-label", "Filter activities");
  filterMenu.style.position = "absolute";
  filterMenu.style.top = "calc(100% + 6px)";
  filterMenu.style.left = "0";
  filterMenu.style.zIndex = "1";
  filterMenu.style.display = "none";
  filterMenu.style.width = "min(320px, calc(100vw - 80px))";
  filterMenu.style.maxHeight = "min(360px, calc(100vh - 180px))";
  filterMenu.style.overflowY = "auto";
  filterMenu.style.padding = "6px";
  filterMenu.style.background = "white";
  filterMenu.style.border = "1px solid rgba(0, 0, 0, 0.18)";
  filterMenu.style.borderRadius = "4px";
  filterMenu.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.16)";
  filterMenu.style.boxSizing = "border-box";

  revertButton.textContent = "Revert";
  styleMenuButton(revertButton);
  jumpButton.textContent = "Jump";
  styleMenuButton(jumpButton);

  activityList.setAttribute("aria-label", "Activities");
  activityList.style.display = "flex";
  activityList.style.flexDirection = "column";
  activityList.style.gap = "6px";
  activityList.style.minHeight = "120px";
  activityList.style.maxHeight = "min(560px, calc(100vh - 190px))";
  activityList.style.overflowY = "auto";
  activityList.style.padding = "2px";

  emptyMessage.textContent = "No activities yet.";
  emptyMessage.style.padding = "24px 12px";
  emptyMessage.style.color = "#6b7280";
  emptyMessage.style.textAlign = "center";

  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.style.minHeight = "20px";
  status.style.marginTop = "8px";
  status.style.color = "#b42318";

  function renderFilterOptions() {
    filterOptions.replaceChildren();
    filterCheckboxes = [];
    const selectedKeys = new Set(
      activityLogState.getSelectedFilters().map(({ key }) => key),
    );

    for (const option of activityLogState.getFilterOptions()) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");

      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.gap = "8px";
      label.style.padding = "6px";
      label.style.cursor = "pointer";
      label.style.marginLeft = option.type === "focus" ? "18px" : "0";

      checkbox.type = "checkbox";
      checkbox.checked = selectedKeys.has(option.key);
      checkbox.setAttribute("aria-label", option.label);
      text.textContent = option.label;

      if (option.type === "parent") {
        text.style.fontWeight = "bold";
      }

      label.append(checkbox, text);
      filterOptions.appendChild(label);
      filterCheckboxes.push({ checkbox, option });
    }
  }

  function renderActivityList() {
    activityList.replaceChildren();
    const activities = activityLogState.getVisibleActivities();
    const selected = activityLogState.getSelectedActivity();

    emptyMessage.style.display = activities.length === 0 ? "block" : "none";
    emptyMessage.textContent =
      activityLogState.getActivities().length === 0
        ? "No activities yet."
        : "No activities match the selected filters.";

    for (const activity of activities) {
      const row = document.createElement("button");
      const rowContent = document.createElement("span");
      const rowTitle = document.createElement("span");
      const rowDescription = document.createElement("span");
      const timestamp = document.createElement("time");
      const isSelected = activity.id === selected?.id;

      row.type = "button";
      row.setAttribute("aria-pressed", String(isSelected));
      row.setAttribute("aria-label", `${activity.parent}: ${activity.focus}`);
      row.style.display = "flex";
      row.style.width = "100%";
      row.style.padding = "10px 12px";
      row.style.border = isSelected
        ? "1px solid #2563eb"
        : "1px solid rgba(0, 0, 0, 0.12)";
      row.style.borderRadius = "4px";
      row.style.background = isSelected ? "#eaf2ff" : "white";
      row.style.color = "#1f2937";
      row.style.textAlign = "left";
      row.style.cursor = "pointer";
      row.style.transition = "background-color 120ms ease";
      row.style.boxSizing = "border-box";

      rowContent.style.display = "grid";
      rowContent.style.gridTemplateColumns = "1fr auto";
      rowContent.style.gap = "4px 12px";
      rowContent.style.width = "100%";

      rowTitle.textContent = `${activity.parent}: ${activity.focus}`;
      rowTitle.style.fontWeight = "600";

      timestamp.dateTime = activity.timestamp;
      timestamp.textContent = formatActivityTimestamp(activity.timestamp);
      timestamp.style.color = "#6b7280";
      timestamp.style.fontSize = "12px";
      timestamp.style.textAlign = "right";

      renderActivityDescription(rowDescription, activity);
      rowDescription.style.gridColumn = "1 / -1";
      rowDescription.style.overflowWrap = "anywhere";

      rowContent.append(rowTitle, timestamp, rowDescription);
      row.appendChild(rowContent);
      row.addEventListener("mouseenter", () => {
        row.style.background = isSelected ? "#dbeafe" : "#f3f7fc";
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = isSelected ? "#eaf2ff" : "white";
      });
      row.addEventListener("click", () => {
        activityLogState.selectActivity(activity.id);
        refresh();
      });
      activityList.appendChild(row);
    }
  }

  function refresh() {
    const selected = activityLogState.getSelectedActivity();

    filterButton.disabled = !activityLogState.isFilterEnabled();
    revertButton.disabled =
      !selected || !activityLogState.canRevert(selected.id);
    jumpButton.disabled = !selected;
    syncButtonDisabledAppearance(filterButton);
    syncButtonDisabledAppearance(revertButton);
    syncButtonDisabledAppearance(jumpButton);
    renderFilterOptions();
    renderActivityList();
  }

  function close() {
    overlay.style.display = "none";
    filterMenu.style.display = "none";
    filterButton.setAttribute("aria-expanded", "false");
    activityLogState.clearSelection();
    status.textContent = "";
    refresh();
  }

  async function runAction(action, callback) {
    const selected = activityLogState.getSelectedActivity();

    if (!selected) {
      return;
    }

    activityLogState.clearSelection();
    status.textContent = "";
    revertButton.disabled = true;
    jumpButton.disabled = true;
    syncButtonDisabledAppearance(revertButton);
    syncButtonDisabledAppearance(jumpButton);

    try {
      await callback(selected);
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : `Unable to ${action.toLowerCase()} this activity.`;
      console.error(`Unable to ${action.toLowerCase()} activity.`, error);
    } finally {
      refresh();
    }
  }

  filterButton.addEventListener("click", () => {
    activityLogState.clearSelection();
    const showFilterMenu = filterMenu.style.display === "none";

    filterMenu.style.display = showFilterMenu ? "block" : "none";
    filterButton.setAttribute("aria-expanded", String(showFilterMenu));
    refresh();
  });
  filterOptions.addEventListener("change", () => {
    activityLogState.setFilters(
      filterCheckboxes
        .filter(({ checkbox }) => checkbox.checked)
        .map(({ option }) => ({
          parent: option.parent,
          focus: option.focus,
        })),
    );
    refresh();
  });
  revertButton.addEventListener("click", () => runAction("Revert", onRevert));
  jumpButton.addEventListener("click", () => runAction("Jump", onJump));
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  header.append(title, closeButton);
  filterMenu.appendChild(filterOptions);
  filterContainer.append(filterButton, filterMenu);
  toolbar.append(filterContainer, revertButton, jumpButton);
  dialog.append(header, toolbar, activityList, emptyMessage, status);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  refresh();

  return {
    close,
    open() {
      refresh();
      overlay.style.display = "flex";
    },
    refresh,
  };
}
