const MOVE_BUTTON_WIDTH = "45px";
const MOVE_BUTTON_HEIGHT = "27px";

export function createFixedMoveControls({ onMoveSelected }) {
  const root = document.createElement("div");

  root.style.display = "none";
  root.style.marginTop = "4px";
  root.style.marginBottom = "8px";

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
          await onMoveSelected(move);
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

  const fixedMoveNames = [
    "Front:",
    "Back:",
    "Right:",
    "Left:",
    "Up:",
    "Down:",
    "Slice:",
  ];

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

    if (moveName === "Front:") {
      moveButtons = createTwoRowButtons(
        ["F", "F'", "F2"],
        ["Fw", "Fw'", "Fw2"],
      );
    } else if (moveName === "Back:") {
      moveButtons = createTwoRowButtons(
        ["B", "B'", "B2"],
        ["Bw", "Bw'", "Bw2"],
      );
    } else if (moveName === "Right:") {
      moveButtons = createTwoRowButtons(
        ["R", "R'", "R2"],
        ["Rw", "Rw'", "Rw2"],
      );
    } else if (moveName === "Left:") {
      moveButtons = createTwoRowButtons(
        ["L", "L'", "L2"],
        ["Lw", "Lw'", "Lw2"],
      );
    } else if (moveName === "Up:") {
      moveButtons = createTwoRowButtons(
        ["U", "U'", "U2"],
        ["Uw", "Uw'", "Uw2"],
      );
    } else if (moveName === "Down:") {
      moveButtons = createTwoRowButtons(
        ["D", "D'", "D2"],
        ["Dw", "Dw'", "Dw2"],
      );
    } else {
      moveButtons = createTwoRowButtons(
        ["M", "M'", "M2"],
        ["E", "E'", "E2"],
        ["S", "S'", "S2"],
      );
    }

    moveRow.appendChild(moveText);
    moveRow.appendChild(moveButtons);
    root.appendChild(moveRow);
  }

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
  root.appendChild(cubeRotationRow);

  return {
    root,
    setVisible(visible) {
      root.style.display = visible ? "block" : "none";
    },
  };
}
