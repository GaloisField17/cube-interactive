import { Color } from "three";
import invalidColorIcon from "../assets/cross-transparent.png";
import mixedColorIcon from "../assets/cross-transparent.png";
import { attachColorPicker } from "./colorPicker.js";
import { createActivityCommitter } from "./activityRecorder.js";

const FACE_SECTIONS = [
  ["F", "F - Front"],
  ["B", "B - Back"],
  ["R", "R - Right"],
  ["L", "L - Left"],
  ["U", "U - Up"],
  ["D", "D - Down"],
];

function isValidColorValue(value) {
  if (value === "") {
    return false;
  }

  const probe = document.createElement("span");

  probe.style.color = value;
  return probe.style.color !== "";
}

function setPreviewColor(preview, color) {
  preview.style.backgroundImage = "none";
  preview.style.backgroundColor = color;
}

function setMixedPreview(preview) {
  preview.style.backgroundColor = "transparent";
  preview.style.backgroundImage = `url(${mixedColorIcon})`;
  preview.style.backgroundSize = "contain";
  preview.style.backgroundRepeat = "no-repeat";
  preview.style.backgroundPosition = "center";
}

function setInvalidPreview(preview) {
  preview.style.backgroundColor = "transparent";
  preview.style.backgroundImage = `url(${invalidColorIcon})`;
  preview.style.backgroundSize = "contain";
  preview.style.backgroundRepeat = "no-repeat";
  preview.style.backgroundPosition = "center";
}

export function createColorsPanel({
  facelets,
  cubies,
  axisDefinitions,
  getFaceletData,
  getFaceletPositionName,
  getFaceletSection,
  getFaceletColor,
  setFaceletColor,
  sortFaceletsBySolvedPosition,
  getInnerColor,
  setInnerColor,
  faceletLabelController,
  axisSceneController,
  createResetButton,
  styleUiTitle,
  panelBackground,
  panelBorderRadius,
  panelBoxShadow,
  fontFamily,
  fontSize,
  onReset,
  onActivity,
  onExpand,
  onLayoutChange,
}) {
  const root = document.createElement("div");

  Object.assign(root.style, {
    position: "absolute",
    top: "20px",
    right: "20px",
    width: "280px",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "hidden",
    padding: "16px",
    background: panelBackground,
    borderRadius: panelBorderRadius,
    boxShadow: panelBoxShadow,
    fontFamily,
    fontSize,
    boxSizing: "border-box",
  });

  const header = document.createElement("div");

  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    userSelect: "none",
  });

  const titleRow = document.createElement("div");

  Object.assign(titleRow.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });

  const title = document.createElement("div");

  title.textContent = "Colors";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";

  const resetButton = createResetButton("Reset Colors", onReset);

  titleRow.append(resetButton, title);

  const collapseIcon = document.createElement("span");

  collapseIcon.textContent = "+";
  collapseIcon.style.fontSize = "20px";
  collapseIcon.style.lineHeight = "1";
  header.append(titleRow, collapseIcon);
  header.setAttribute("role", "button");
  header.setAttribute("aria-expanded", "false");
  header.tabIndex = 0;

  const content = document.createElement("div");

  content.id = "colors-panel-content";
  content.style.display = "none";
  content.style.marginTop = "12px";
  header.setAttribute("aria-controls", content.id);
  root.append(header, content);

  let expanded = false;

  function setExpanded(nextExpanded) {
    if (expanded === nextExpanded) {
      return;
    }

    expanded = nextExpanded;
    if (expanded) {
      onExpand();
    }
    content.style.display = expanded ? "block" : "none";
    root.style.overflowY = expanded ? "auto" : "hidden";
    collapseIcon.textContent = expanded ? "−" : "+";
    header.setAttribute("aria-expanded", String(expanded));
    onLayoutChange();
  }

  function toggleExpanded() {
    setExpanded(!expanded);
  }

  header.addEventListener("click", toggleExpanded);
  header.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleExpanded();
  });

  function createSection({
    title: sectionTitle,
    titleControls = [],
    contentId,
  }) {
    const section = document.createElement("div");
    const sectionHeader = document.createElement("div");
    const sectionTitleRow = document.createElement("div");
    const sectionTitleLabel = document.createElement("span");
    const sectionCollapseIcon = document.createElement("span");
    const sectionContent = document.createElement("div");
    let collapsed = false;

    Object.assign(sectionHeader.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "6px",
      cursor: "pointer",
      userSelect: "none",
      marginTop: "14px",
      marginBottom: "7px",
      fontWeight: "bold",
    });
    Object.assign(sectionTitleRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flex: "1",
      minWidth: "0",
    });
    sectionTitleLabel.textContent = sectionTitle;
    styleUiTitle(sectionTitleLabel, { container: sectionHeader });
    sectionCollapseIcon.textContent = "−";
    sectionCollapseIcon.style.fontSize = "20px";
    sectionCollapseIcon.style.lineHeight = "1";
    sectionCollapseIcon.style.flexShrink = "0";
    sectionContent.id = contentId;
    sectionContent.style.marginTop = "0";

    for (const control of titleControls) {
      for (const eventName of ["click", "pointerdown", "keydown"]) {
        control.addEventListener(eventName, (event) => {
          event.stopPropagation();
        });
      }
      sectionTitleRow.appendChild(control);
    }

    sectionTitleRow.prepend(sectionTitleLabel);
    sectionHeader.append(sectionTitleRow, sectionCollapseIcon);
    sectionHeader.setAttribute("role", "button");
    sectionHeader.setAttribute("aria-controls", contentId);
    sectionHeader.setAttribute("aria-expanded", "true");
    sectionHeader.tabIndex = 0;
    section.append(sectionHeader, sectionContent);

    function toggleSection() {
      collapsed = !collapsed;
      sectionContent.style.display = collapsed ? "none" : "block";
      sectionCollapseIcon.textContent = collapsed ? "+" : "−";
      sectionHeader.setAttribute("aria-expanded", String(!collapsed));
      onLayoutChange();
    }

    sectionHeader.addEventListener("click", toggleSection);
    sectionHeader.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleSection();
    });

    return { section, content: sectionContent };
  }

  function createColorInput({
    getColor,
    applyColor,
    getSnapshot,
    restoreSnapshot,
    getActivityValue = getSnapshot ?? getColor,
    activity,
    width = "70px",
    row = false,
  }) {
    const input = document.createElement("input");
    const preview = document.createElement("span");

    input.type = "text";
    input.style.width = width;
    input.style.padding = row ? "4px" : "3px";
    input.style.boxSizing = "border-box";
    if (row) {
      input.style.flex = "1";
      input.style.minWidth = "0";
    }

    const activityCommitter = activity
      ? createActivityCommitter(getActivityValue, (from, to) =>
          onActivity({ ...activity, from, to }),
        )
      : null;

    Object.assign(preview.style, {
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      border: "1px solid #999",
      flexShrink: "0",
    });

    function sync(
      resetActivityBaseline = false,
      exceptActivityCommitter = null,
    ) {
      const color = getColor();

      if (color === null || color === undefined) {
        input.value = "";
        input.placeholder = "Mixed";
        setMixedPreview(preview);
      } else {
        input.value = color;
        input.placeholder = "";
        setPreviewColor(preview, color);
      }

      if (
        resetActivityBaseline &&
        activityCommitter !== exceptActivityCommitter
      ) {
        activityCommitter?.reset();
      }
    }

    function update() {
      const value = input.value.trim();

      if (!isValidColorValue(value)) {
        if (value !== "") {
          setInvalidPreview(preview);
        }
        return;
      }

      applyColor(value, activityCommitter);
      sync();
    }

    function restoreColorSnapshot(snapshot, exceptActivityCommitter = null) {
      if (restoreSnapshot) {
        restoreSnapshot(snapshot, exceptActivityCommitter);
      } else {
        applyColor(snapshot, exceptActivityCommitter);
      }
      sync(true, exceptActivityCommitter);
    }

    input.addEventListener("input", update);
    input.addEventListener("change", () => {
      update();
    });
    attachColorPicker({
      preview,
      input,
      onColorChange: update,
      onColorCommit: () => activityCommitter?.commit(),
      getInitialColor: () => getColor() ?? "#111",
      undo: {
        getSnapshot: getSnapshot ?? getColor,
        restoreSnapshot: restoreColorSnapshot,
        activityCommitter,
      },
    });
    sync();

    return { input, preview, sync, activityCommitter };
  }

  function normalizeColor(value) {
    const color = new Color();

    color.set(value);
    return color.getHex();
  }

  function getMappedActivityValues(items, getId, getValue) {
    return Object.fromEntries(items.map((item) => [getId(item), getValue(item)]));
  }

  function getCubieActivityId(cubie) {
    return JSON.stringify(cubie.userData.originalPieceKey);
  }

  function getFaceletActivityId(facelet) {
    return getFaceletData(facelet).id;
  }

  function createGroupedColorInput({
    getValues,
    getActivityValues = getValues,
    applyColor,
    restoreValues,
    activity,
    width = "70px",
  }) {
    const values = () => getValues();
    const getColor = () => {
      const current = values();
      const first = current[0];

      return current.every(
        (value) => normalizeColor(value) === normalizeColor(first),
      )
        ? first
        : null;
    };

    return createColorInput({
      getColor,
      getActivityValue: getActivityValues,
      applyColor,
      width,
      activity,
      getSnapshot: values,
      restoreSnapshot: restoreValues,
    });
  }

  const faceletColorControls = new Map();
  const faceColorControls = new Map();
  const innerColorControls = new Map();
  const faceletLabelColorControls = new Map();
  const faceLabelColorControls = new Map();
  const axisLabelColorControls = new Map();
  const rotationArrowColorControls = new Map();

  function syncFaceColor(
    face,
    resetActivityBaseline = false,
    exceptActivityCommitter = null,
  ) {
    const control = faceColorControls.get(face);

    if (!control) {
      return;
    }

    const values = facelets
      .filter((facelet) => getFaceletSection(facelet) === face)
      .map(getFaceletColor);

    if (!values.length) {
      control.input.value = "";
      control.input.placeholder = "";
      setPreviewColor(control.preview, "transparent");
      return;
    }

    const first = values[0];

    if (values.every((value) => normalizeColor(value) === normalizeColor(first))) {
      control.input.value = first;
      control.input.placeholder = "";
      setPreviewColor(control.preview, first);
    } else {
      control.input.value = "";
      control.input.placeholder = "Mixed";
      setMixedPreview(control.preview);
    }

    if (
      resetActivityBaseline &&
      control.activityCommitter !== exceptActivityCommitter
    ) {
      control.activityCommitter?.reset();
    }
  }

  function syncOuterFacelets(
    resetActivityBaseline = false,
    exceptActivityCommitter = null,
  ) {
    const values = facelets.map(getFaceletColor);
    const first = values[0];

    if (values.length && values.every(
      (value) => normalizeColor(value) === normalizeColor(first),
    )) {
      outerColor.input.value = first;
      outerColor.input.placeholder = "";
      setPreviewColor(outerColor.preview, first);
    } else {
      outerColor.input.value = "";
      outerColor.input.placeholder = "Mixed";
      setMixedPreview(outerColor.preview);
    }

    if (
      resetActivityBaseline &&
      outerColor.activityCommitter !== exceptActivityCommitter
    ) {
      outerColor.activityCommitter?.reset();
    }
  }

  function syncFaceletColorControls(
    resetActivityBaseline = false,
    exceptActivityCommitter = null,
  ) {
    for (const facelet of facelets) {
      faceletColorControls
        .get(getFaceletData(facelet))
        ?.sync(resetActivityBaseline, exceptActivityCommitter);
    }
    for (const [face] of FACE_SECTIONS) {
      syncFaceColor(face, resetActivityBaseline, exceptActivityCommitter);
    }
    syncOuterFacelets(resetActivityBaseline, exceptActivityCommitter);
  }

  function createFaceletColorRow(facelet) {
    const row = document.createElement("div");

    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "5px",
    });

    const name = document.createElement("span");

    name.textContent = `${getFaceletPositionName(facelet)}:`;
    name.style.width = "38px";
    name.style.flexShrink = "0";
    name.style.fontFamily = "monospace";

    const control = createColorInput({
      getColor: () => getFaceletColor(facelet),
      getActivityValue: () => ({
        [getFaceletActivityId(facelet)]: getFaceletColor(facelet),
      }),
      activity: {
        parent: "Colors",
        focus: `Outer Facelet (${getFaceletPositionName(facelet)})`,
        filterFocus: "Outer Facelet",
      },
      applyColor: (color, activityCommitter) => {
        setFaceletColor(facelet, color);
        syncFaceletColorControls(true, activityCommitter);
      },
      row: true,
      width: "auto",
    });

    faceletColorControls.set(getFaceletData(facelet), control);
    row.append(name, control.input, control.preview);
    return row;
  }

  function createFaceColorInput(face) {
    const faceletsForFace = facelets.filter(
      (facelet) => getFaceletSection(facelet) === face,
    );
    const control = createGroupedColorInput({
      getValues: () => faceletsForFace.map(getFaceletColor),
      getActivityValues: () =>
        getMappedActivityValues(
          faceletsForFace,
          getFaceletActivityId,
          getFaceletColor,
        ),
      activity: {
        parent: "Colors",
        focus: `Outer Facelet (${face})`,
        filterFocus: "Outer Facelet",
      },
      applyColor: (color, activityCommitter) => {
        for (const facelet of faceletsForFace) {
          setFaceletColor(facelet, color);
        }
        syncFaceletColorControls(true, activityCommitter);
      },
      restoreValues: (snapshot, activityCommitter) => {
        snapshot.forEach((color, index) =>
          setFaceletColor(faceletsForFace[index], color),
        );
        syncFaceletColorControls(true, activityCommitter);
      },
    });

    faceColorControls.set(face, control);
    return control;
  }

  const outerFacelets = createGroupedColorInput({
    getValues: () => facelets.map(getFaceletColor),
    getActivityValues: () =>
      getMappedActivityValues(facelets, getFaceletActivityId, getFaceletColor),
    activity: {
      parent: "Colors",
      focus: "Outer Facelet (All)",
      filterFocus: "Outer Facelet",
    },
    applyColor: (color, activityCommitter) => {
      facelets.forEach((facelet) => setFaceletColor(facelet, color));
      syncFaceletColorControls(true, activityCommitter);
    },
    restoreValues: (snapshot, activityCommitter) => {
      snapshot.forEach((color, index) =>
        setFaceletColor(facelets[index], color),
      );
      syncFaceletColorControls(true, activityCommitter);
    },
  });
  const outerColor = outerFacelets;
  const outerSection = createSection({
    title: "Outer Facelets",
    titleControls: [outerFacelets.input, outerFacelets.preview],
    contentId: "outer-facelets-panel-content",
  });
  content.appendChild(outerSection.section);

  for (const [face, faceTitle] of FACE_SECTIONS) {
    const sectionFacelets = facelets
      .filter((facelet) => getFaceletSection(facelet) === face)
      .sort(sortFaceletsBySolvedPosition);
    const heading = document.createElement("div");

    Object.assign(heading.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginTop: "10px",
      marginBottom: "7px",
    });

    const headingText = document.createElement("span");

    headingText.textContent = faceTitle;
    styleUiTitle(headingText, { container: heading });
    const faceColor = createFaceColorInput(face);

    heading.append(headingText, faceColor.input, faceColor.preview);
    outerSection.content.appendChild(heading);
    for (const facelet of sectionFacelets) {
      outerSection.content.appendChild(createFaceletColorRow(facelet));
    }
  }

  const innerInput = createGroupedColorInput({
    getValues: () => cubies.map(getInnerColor),
    getActivityValues: () =>
      getMappedActivityValues(cubies, getCubieActivityId, getInnerColor),
    activity: {
      parent: "Colors",
      focus: "Inner Cubie (All)",
      filterFocus: "Inner Cubie",
    },
    applyColor: (color, activityCommitter) => {
      cubies.forEach((cubie) => setInnerColor(cubie, color));
      syncInnerColorControls(true, activityCommitter);
    },
    restoreValues: (snapshot, activityCommitter) => {
      snapshot.forEach((color, index) => setInnerColor(cubies[index], color));
      syncInnerColorControls(true, activityCommitter);
    },
  });
  const innerSection = createSection({
    title: "Inner",
    titleControls: [innerInput.input, innerInput.preview],
    contentId: "inner-panel-content",
  });
  content.appendChild(innerSection.section);

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

  function createInnerColorRow(cubie) {
    const row = document.createElement("div");

    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "5px",
    });

    const name = document.createElement("span");

    name.textContent = `${getCubiePositionName(cubie)}:`;
    name.style.width = "38px";
    name.style.flexShrink = "0";
    name.style.fontFamily = "monospace";
    const control = createColorInput({
      getColor: () => getInnerColor(cubie),
      getActivityValue: () => ({
        [getCubieActivityId(cubie)]: getInnerColor(cubie),
      }),
      activity: {
        parent: "Colors",
        focus: `Inner Cubie (${getCubiePositionName(cubie)})`,
        filterFocus: "Inner Cubie",
      },
      applyColor: (color, activityCommitter) => {
        setInnerColor(cubie, color);
        syncInnerColorControls(true, activityCommitter);
      },
      row: true,
      width: "auto",
    });

    innerColorControls.set(cubie, control);
    row.append(name, control.input, control.preview);
    return row;
  }

  const innerFaceOrder = { F: 0, B: 1, R: 2, L: 3, U: 4, D: 5 };
  const sortedCubies = [...cubies].sort((first, second) => {
    const firstName = getCubiePositionName(first);
    const secondName = getCubiePositionName(second);
    const firstOrder = innerFaceOrder[firstName[0]] ?? 6;
    const secondOrder = innerFaceOrder[secondName[0]] ?? 6;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }
    return (
      first.userData.x - second.userData.x ||
      first.userData.y - second.userData.y ||
      first.userData.z - second.userData.z
    );
  });

  for (const cubie of sortedCubies) {
    innerSection.content.appendChild(createInnerColorRow(cubie));
  }

  function syncInnerColorControls(
    resetActivityBaseline = false,
    exceptActivityCommitter = null,
  ) {
    innerColorControls.forEach((control) =>
      control.sync(resetActivityBaseline, exceptActivityCommitter),
    );
    innerInput.sync(resetActivityBaseline, exceptActivityCommitter);
  }

  const faceletLabelInput = createGroupedColorInput({
    getValues: () => facelets.map((facelet) => faceletLabelController.getColor(facelet)),
    getActivityValues: () =>
      getMappedActivityValues(
        facelets,
        getFaceletActivityId,
        (facelet) => faceletLabelController.getColor(facelet),
      ),
    activity: {
      parent: "Colors",
      focus: "Facelet Label (All)",
      filterFocus: "Facelet Label",
    },
    applyColor: (color, activityCommitter) => {
      facelets.forEach((facelet) => faceletLabelController.setColor(facelet, color));
      syncFaceletLabelControls(true, activityCommitter);
    },
    restoreValues: (snapshot, activityCommitter) => {
      snapshot.forEach((color, index) =>
        faceletLabelController.setColor(facelets[index], color),
      );
      syncFaceletLabelControls(true, activityCommitter);
    },
  });
  const faceletLabelSection = createSection({
    title: "Facelet Labels",
    titleControls: [faceletLabelInput.input, faceletLabelInput.preview],
    contentId: "facelet-labels-panel-content",
  });
  content.appendChild(faceletLabelSection.section);

  function syncFaceletLabelControls(
    resetActivityBaseline = false,
    exceptActivityCommitter = null,
  ) {
    for (const facelet of facelets) {
      faceletLabelColorControls
        .get(getFaceletData(facelet))
        ?.sync(resetActivityBaseline, exceptActivityCommitter);
    }
    for (const [face] of FACE_SECTIONS) {
      faceLabelColorControls
        .get(face)
        ?.sync(resetActivityBaseline, exceptActivityCommitter);
    }
    faceletLabelInput.sync(resetActivityBaseline, exceptActivityCommitter);
  }

  function createFaceletLabelColorRow(facelet, faceTitle) {
    const row = document.createElement("div");

    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "5px",
    });

    const name = document.createElement("span");

    name.textContent = `Label ${getFaceletPositionName(facelet)}:`;
    name.style.width = "95px";
    name.style.flexShrink = "0";
    name.style.fontFamily = "monospace";
    const control = createColorInput({
      getColor: () => faceletLabelController.getColor(facelet),
      getActivityValue: () => ({
        [getFaceletActivityId(facelet)]:
          faceletLabelController.getColor(facelet),
      }),
      activity: {
        parent: "Colors",
        focus: `Facelet Label (${getFaceletPositionName(facelet)})`,
        filterFocus: "Facelet Label",
      },
      applyColor: (color, activityCommitter) => {
        faceletLabelController.setColor(facelet, color);
        syncFaceletLabelControls(true, activityCommitter);
      },
      row: true,
      width: "auto",
    });

    faceletLabelColorControls.set(getFaceletData(facelet), control);
    row.append(name, control.input, control.preview);
    return row;
  }

  for (const [face, faceTitle] of FACE_SECTIONS) {
    const sectionFacelets = facelets
      .filter((facelet) => getFaceletSection(facelet) === face)
      .sort(sortFaceletsBySolvedPosition);
    const heading = document.createElement("div");

    Object.assign(heading.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontWeight: "bold",
      marginTop: "10px",
      marginBottom: "7px",
    });

    const headingText = document.createElement("span");

    headingText.textContent = faceTitle;
    styleUiTitle(headingText, { container: heading });
    const color = createGroupedColorInput({
      getValues: () =>
        sectionFacelets.map((facelet) => faceletLabelController.getColor(facelet)),
      getActivityValues: () =>
        getMappedActivityValues(
          sectionFacelets,
          getFaceletActivityId,
          (facelet) => faceletLabelController.getColor(facelet),
        ),
      activity: {
        parent: "Colors",
        focus: `Facelet Label (${face})`,
        filterFocus: "Facelet Label",
      },
      applyColor: (nextColor, activityCommitter) => {
        sectionFacelets.forEach((facelet) =>
          faceletLabelController.setColor(facelet, nextColor),
        );
        syncFaceletLabelControls(true, activityCommitter);
      },
      restoreValues: (snapshot, activityCommitter) => {
        snapshot.forEach((nextColor, index) =>
          faceletLabelController.setColor(sectionFacelets[index], nextColor),
        );
        syncFaceletLabelControls(true, activityCommitter);
      },
    });

    faceLabelColorControls.set(face, color);
    heading.append(headingText, color.input, color.preview);
    faceletLabelSection.content.appendChild(heading);
    for (const facelet of sectionFacelets) {
      faceletLabelSection.content.appendChild(
        createFaceletLabelColorRow(facelet, face),
      );
    }
  }

  function createUniformSceneColorControl(
    title,
    getValues,
    setColor,
    restore,
    activity,
    getActivityValues = getValues,
  ) {
    const control = createGroupedColorInput({
      getValues,
      getActivityValues,
      applyColor: (color, activityCommitter) => {
        setColor(color, activityCommitter);
        syncSceneColorControls(true, activityCommitter);
      },
      restoreValues: (snapshot, activityCommitter) => {
        restore(snapshot, activityCommitter);
        syncSceneColorControls(true, activityCommitter);
      },
      activity,
    });
    const row = document.createElement("div");

    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginTop: "10px",
      marginBottom: "7px",
    });
    const label = document.createElement("span");

    label.textContent = title;
    row.append(label, control.input, control.preview);
    return { row, control };
  }

  const axisLabelControls = new Map();
  const rotationArrowControls = new Map();
  const axisLabelAll = createUniformSceneColorControl(
    "All",
    () =>
      axisDefinitions.map((_, index) =>
        axisSceneController.getAxisLabelColor(index),
      ),
    (color) => {
      axisDefinitions.forEach((_, index) =>
        axisSceneController.setAxisLabelColor(index, color),
      );
    },
    (snapshot) => {
      snapshot.forEach((color, index) =>
        axisSceneController.setAxisLabelColor(index, color),
      );
    },
    {
      parent: "Colors",
      focus: "Axis Label (All)",
      filterFocus: "Axis Label",
    },
    () =>
      Object.fromEntries(
        axisDefinitions.map((definition, index) => [
          definition.label.face,
          axisSceneController.getAxisLabelColor(index),
        ]),
      ),
  );
  const axisLabelSection = createSection({
    title: "Axis Labels",
    titleControls: [axisLabelAll.control.input, axisLabelAll.control.preview],
    contentId: "axis-label-color-panel-content",
  });
  content.appendChild(axisLabelSection.section);

  const rotationArrowAll = createUniformSceneColorControl(
    "All",
    () =>
      axisDefinitions.map((_, index) =>
        axisSceneController.getRotationArrowColor(index),
      ),
    (color) => {
      axisDefinitions.forEach((_, index) =>
        axisSceneController.setRotationArrowColor(index, color),
      );
    },
    (snapshot) => {
      snapshot.forEach((color, index) =>
        axisSceneController.setRotationArrowColor(index, color),
      );
    },
    {
      parent: "Colors",
      focus: "Rotation Arrow (All)",
      filterFocus: "Rotation Arrow",
    },
    () =>
      Object.fromEntries(
        axisDefinitions.map((definition, index) => [
          definition.label.face,
          axisSceneController.getRotationArrowColor(index),
        ]),
      ),
  );
  const rotationArrowSection = createSection({
    title: "Arrows",
    titleControls: [
      rotationArrowAll.control.input,
      rotationArrowAll.control.preview,
    ],
    contentId: "rotation-arrow-color-panel-content",
  });
  content.appendChild(rotationArrowSection.section);

  for (const face of FACE_SECTIONS.map(([sectionFace]) => sectionFace)) {
    const index = axisDefinitions.findIndex(
      (axisDefinition) => axisDefinition.label.face === face,
    );

    if (index === -1) {
      continue;
    }

    const axisLabel = createUniformSceneColorControl(
      `Axis Label ${face}`,
      () => [axisSceneController.getAxisLabelColor(index)],
      (color) => axisSceneController.setAxisLabelColor(index, color),
      ([color]) => axisSceneController.setAxisLabelColor(index, color),
      {
        parent: "Colors",
        focus: `Axis Label (${face})`,
        filterFocus: "Axis Label",
      },
      () => ({ [face]: axisSceneController.getAxisLabelColor(index) }),
    );
    const rotationArrow = createUniformSceneColorControl(
      `Arrow ${face}`,
      () => [axisSceneController.getRotationArrowColor(index)],
      (color) => axisSceneController.setRotationArrowColor(index, color),
      ([color]) => axisSceneController.setRotationArrowColor(index, color),
      {
        parent: "Colors",
        focus: `Rotation Arrow (${face})`,
        filterFocus: "Rotation Arrow",
      },
      () => ({ [face]: axisSceneController.getRotationArrowColor(index) }),
    );

    axisLabelControls.set(index, axisLabel.control);
    rotationArrowControls.set(index, rotationArrow.control);
    axisLabelSection.content.appendChild(axisLabel.row);
    rotationArrowSection.content.appendChild(rotationArrow.row);
  }

  function syncSceneColorControls(
    resetActivityBaseline = false,
    exceptActivityCommitter = null,
  ) {
    axisLabelAll.control.sync(resetActivityBaseline, exceptActivityCommitter);
    rotationArrowAll.control.sync(resetActivityBaseline, exceptActivityCommitter);
    axisLabelControls.forEach((control) =>
      control.sync(resetActivityBaseline, exceptActivityCommitter),
    );
    rotationArrowControls.forEach((control) =>
      control.sync(resetActivityBaseline, exceptActivityCommitter),
    );
  }

  function syncCubeControls(resetActivityBaseline = false) {
    syncFaceletColorControls(resetActivityBaseline);
    syncInnerColorControls(resetActivityBaseline);
  }

  function syncAll(resetActivityBaseline = false) {
    syncCubeControls(resetActivityBaseline);
    syncFaceletLabelControls(resetActivityBaseline);
    syncSceneColorControls(resetActivityBaseline);
  }

  return {
    root,
    setExpanded,
    syncCubeControls,
    syncFaceletLabelControls,
    syncSceneColorControls,
    syncAll,
  };
}
