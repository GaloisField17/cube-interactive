import assert from "node:assert/strict";
import test from "node:test";
import { getNamedColorOrHex } from "../src/colorNames.js";
import {
  DEFAULT_COLORS,
  DEFAULT_GAP,
  DEFAULT_SIZE,
} from "../src/cubeConfig.js";
import {
  cloneVector,
  getFaceFromNormal,
  normalizeAngle,
  rotateVector,
} from "../src/cubeMath.js";
import {
  getCustomMoveLabel,
  getCustomRotationAngle,
  getRotationSequenceEditorState,
  normalizeWideMoveName,
  tokenizeRotationSequence,
} from "../src/customRotation.js";
import {
  formatLocalTimestamp,
  prefixWithLocalTimestamp,
} from "../src/exportFileName.js";
import {
  createFaceDefinitions,
  createSticker,
  getFaceletLabel,
  getSolvedPieceFaces,
  getSolvedPieceKey,
  getSolvedStickerName,
  MATERIAL_INDEX_BY_FACE,
} from "../src/faceDefinitions.js";
import { createJsonExport } from "../src/jsonExport.js";
import {
  getCubeViewportDisplayHeight,
  getCubeViewportDisplayHeightBounds,
  getCubeViewportHeight,
} from "../src/responsiveLayout.js";
import { ROTATIONS } from "../src/rotationDefinitions.js";

test("JSON export keeps intentional falsy changes and UTC seconds", () => {
  const exported = createJsonExport(
    {
      enabled: false,
      depth: 0,
      label: "",
      unchanged: "default",
    },
    {
      enabled: true,
      depth: 1,
      label: "default",
      unchanged: "default",
    },
    new Date("2026-09-23T12:34:56.789Z"),
  );

  assert.deepEqual(exported.setup, {
    enabled: false,
    depth: 0,
    label: "",
  });
  assert.equal(exported.version, 1);
  assert.equal(exported.exportedAt, "2026-09-23T12:34:56Z");
});

test("JSON export prunes unchanged nested state", () => {
  const exported = createJsonExport(
    {
      cube: {
        cubies: {
          solved: { position: { x: 0, y: 0, z: 0 }, color: "white" },
          moved: { position: { x: 1, y: 0, z: 0 }, color: "blue" },
        },
      },
    },
    {
      cube: {
        cubies: {
          solved: { position: { x: 0, y: 0, z: 0 }, color: "white" },
          moved: { position: { x: 0, y: 0, z: 0 }, color: "blue" },
        },
      },
    },
  );

  assert.deepEqual(exported.setup, {
    cube: { cubies: { moved: { position: { x: 1 } } } },
  });
});

test("export filenames use the local YYYYMMDDTHHMMSS prefix", () => {
  const date = new Date(2026, 8, 7, 4, 5, 6);

  assert.equal(formatLocalTimestamp(date), "20260907T040506");
  assert.equal(
    prefixWithLocalTimestamp("cube-setup.json", date),
    "20260907T040506-cube-setup.json",
  );
});

test("named picker colors use the first CSS name and preserve unnamed hex", () => {
  assert.equal(getNamedColorOrHex("#000000"), "black");
  assert.equal(getNamedColorOrHex("#808080"), "grey");
  assert.equal(getNamedColorOrHex("#00FFFF"), "cyan");
  assert.equal(getNamedColorOrHex("#123456"), "#123456");
});

test("cloneVector returns an independent vector", () => {
  const original = { x: 1, y: -2, z: 3 };
  const clone = cloneVector(original);

  assert.deepEqual(clone, original);
  assert.notStrictEqual(clone, original);
});

test("normalizeAngle wraps values beyond one full turn", () => {
  assert.equal(normalizeAngle(450), 90);
  assert.equal(normalizeAngle(-450), -90);
  assert.equal(normalizeAngle("invalid"), 0);
});

test("getFaceFromNormal maps axis normals to cube faces", () => {
  assert.equal(getFaceFromNormal({ x: 1, y: 0, z: 0 }), "R");
  assert.equal(getFaceFromNormal({ x: 0, y: -1, z: 0 }), "D");
  assert.equal(getFaceFromNormal({ x: 0, y: 0, z: -1 }), "B");
  assert.equal(getFaceFromNormal({ x: 0, y: 0, z: 0 }), null);
});

test("rotateVector applies exact quarter turns", () => {
  const vector = { x: 1, y: 2, z: 3 };

  test("responsive cube viewport reserves space for mobile controls", () => {
    assert.equal(getCubeViewportHeight(320, 568), 295.36);
    assert.equal(getCubeViewportHeight(390, 844), 438.88);
    assert.equal(getCubeViewportHeight(768, 1024), 634.88);
    assert.equal(getCubeViewportHeight(1440, 900), 900);
    assert.equal(getCubeViewportHeight(320, 500), 280);

    assert.equal(getCubeViewportDisplayHeight(320, 568), 232.15296);
    assert.equal(getCubeViewportDisplayHeight(390, 844), 344.95968);
    assert.ok(
      Math.abs(getCubeViewportDisplayHeight(768, 1024) - 499.01568) < 1e-9,
    );
    assert.equal(getCubeViewportDisplayHeight(1440, 900), 900);
  });

  assert.deepEqual(rotateVector(vector, "x", 90), { x: 1, y: -3, z: 2 });
  assert.deepEqual(rotateVector(vector, "y", -90), { x: -3, y: 2, z: 1 });
  assert.deepEqual(rotateVector(vector, "z", 180), { x: -1, y: -2, z: 3 });
  assert.deepEqual(rotateVector(vector, "x", 360), vector);
});

test("cube viewport resize bounds leave room for controls", () => {
  assert.deepEqual(getCubeViewportDisplayHeightBounds(844), {
    minimum: 0,
    maximum: 717.4,
  });
  assert.deepEqual(getCubeViewportDisplayHeightBounds(80), {
    minimum: 0,
    maximum: 68,
  });
});

test("each generated move has inverse and half-turn variants", () => {
  for (const moveName of ["R", "L", "U", "D", "F", "B", "Rw", "x", "y", "z"]) {
    const move = ROTATIONS[moveName];
    const inverse = ROTATIONS[`${moveName}'`];
    const halfTurn = ROTATIONS[`${moveName}2`];

    assert.ok(move, `${moveName} should be defined`);
    assert.ok(inverse, `${moveName}' should be defined`);
    assert.ok(halfTurn, `${moveName}2 should be defined`);
    assert.equal(inverse.angle, -move.angle);
    assert.equal(halfTurn.angle, 180);
    assert.deepEqual(inverse.layers, move.layers);
    assert.equal(inverse.axis, move.axis);
    assert.equal(Object.isFrozen(move), true);
    assert.equal(Object.isFrozen(move.layers), true);
  }
});

test("custom move labels and signed angles stay tied to the entered partial turn", () => {
  assert.equal(getCustomMoveLabel("F", 55), "F[55°]");
  assert.equal(getCustomMoveLabel("F", -55), "F[-55°]");
  assert.equal(getCustomRotationAngle("F", 55), -55);
  assert.equal(getCustomRotationAngle("F", -55), 55);
  assert.equal(getCustomRotationAngle("R", 33), -33);
});

test("lowercase face moves normalize to wide moves for execution", () => {
  assert.equal(normalizeWideMoveName("f"), "Fw");
  assert.equal(normalizeWideMoveName("d'"), "Dw'");
  assert.equal(normalizeWideMoveName("r2"), "Rw2");
  assert.equal(normalizeWideMoveName("L"), "L");
});

test("rotation editor accepts complete moves and a valid draft token", () => {
  assert.deepEqual(getRotationSequenceEditorState("R U'", 4), {
    moves: ["R", "U'"],
    draft: null,
    tokens: [
      { text: "R", start: 0, end: 1 },
      { text: "U'", start: 2, end: 4 },
    ],
    trailingWhitespace: false,
  });
  assert.deepEqual(getRotationSequenceEditorState("R F[33 U", 6), {
    moves: ["R", "U"],
    draft: { text: "F[33", start: 2, end: 6 },
    tokens: [
      { text: "R", start: 0, end: 1 },
      { text: "F[33", start: 2, end: 6 },
      { text: "U", start: 7, end: 8 },
    ],
    trailingWhitespace: false,
  });
  assert.equal(getRotationSequenceEditorState("R Q", 3), null);
  assert.equal(getRotationSequenceEditorState("r[33", 4)?.draft?.text, "r[33");
  assert.deepEqual(getRotationSequenceEditorState("(R U)", 5)?.moves, [
    "(R",
    "U)",
  ]);
});

test("rotation sequence tokenizer splits adjacent moves and collapses whitespace", () => {
  const state = tokenizeRotationSequence("RUR'   RwU R2U' F[33°]B");

  assert.deepEqual(state.moves, [
    "R",
    "U",
    "R'",
    "Rw",
    "U",
    "R2",
    "U'",
    "F[33°]",
    "B",
  ]);
  assert.deepEqual(tokenizeRotationSequence("R   U")?.moves, ["R", "U"]);
  assert.equal(tokenizeRotationSequence("R w"), null);
  assert.equal(tokenizeRotationSequence("R Q"), null);
  assert.deepEqual(tokenizeRotationSequence("F(33degrees)U")?.moves, [
    "F(33degrees)",
    "U",
  ]);
});

test("rotation editor allows an incomplete custom move after adjacent moves", () => {
  const state = getRotationSequenceEditorState("RF[33 U", 5);

  assert.deepEqual(state?.moves, ["R", "U"]);
  assert.deepEqual(state?.draft, { text: "F[33", start: 1, end: 5 });
});

test("rotation editor accepts custom-angle wide moves and keeps their draft", () => {
  const complete = getRotationSequenceEditorState("Rw[50deg]", 9);
  const draft = getRotationSequenceEditorState("Rw[50deg", 8);

  assert.deepEqual(complete?.moves, ["Rw[50deg]"]);
  assert.equal(complete?.draft, null);
  assert.deepEqual(draft?.moves, []);
  assert.deepEqual(draft?.draft, { text: "Rw[50deg", start: 0, end: 8 });
});

test("rotation editor detects an incomplete middle move when leaving the field", () => {
  const value = "U u[de R L";
  const editorState = getRotationSequenceEditorState(value, value.length);
  const blurState = getRotationSequenceEditorState(value, value.length, {
    allowDraftOutsideCaret: true,
  });

  assert.equal(editorState, null);
  assert.deepEqual(blurState?.moves, ["U", "R", "L"]);
  assert.deepEqual(blurState?.draft, { text: "u[de", start: 2, end: 6 });
});

test("face definitions preserve colors, normals, and material indices", () => {
  const faceDefinitions = createFaceDefinitions(DEFAULT_COLORS);
  const sticker = createSticker("F", faceDefinitions);

  assert.equal(DEFAULT_SIZE, 1);
  assert.equal(DEFAULT_GAP, 0.035);
  assert.equal(Object.isFrozen(DEFAULT_COLORS), true);
  assert.equal(faceDefinitions.F.color, DEFAULT_COLORS.front);
  assert.deepEqual(faceDefinitions.F.normal, { x: 0, y: 0, z: 1 });
  assert.equal(sticker.color, DEFAULT_COLORS.front);
  assert.deepEqual(sticker.normal, faceDefinitions.F.normal);
  assert.equal(Object.isFrozen(faceDefinitions), true);
  assert.equal(Object.isFrozen(faceDefinitions.F), true);
  assert.equal(Object.isFrozen(faceDefinitions.F.normal), true);
  assert.notStrictEqual(sticker.normal, faceDefinitions.F.normal);
  assert.equal(MATERIAL_INDEX_BY_FACE.F, 4);
  assert.deepEqual(sticker.userData, { peekVisible: false });
});

test("solved-state piece keys stay fixed to the original piece identity", () => {
  assert.deepEqual(getSolvedPieceKey({ x: 0, y: 0, z: 0 }), {
    x: 0,
    y: 0,
    z: 0,
  });
  assert.deepEqual(getSolvedPieceKey({ x: 0, y: 0, z: 1 }), {
    x: 1,
    y: 0,
    z: 0,
  });
  assert.deepEqual(getSolvedPieceKey({ x: 1, y: 0, z: 0 }), {
    x: 0,
    y: 1,
    z: 0,
  });
  assert.deepEqual(getSolvedPieceKey({ x: 0, y: 1, z: 0 }), {
    x: 0,
    y: 0,
    z: 1,
  });
  assert.deepEqual(getSolvedPieceKey({ x: 1, y: 1, z: 1 }), {
    x: 1,
    y: 1,
    z: 1,
  });
});

test("solved-state piece faces identify cubie ownership", () => {
  assert.deepEqual(getSolvedPieceFaces({ x: 0, y: 0, z: 0 }), []);
  assert.deepEqual(getSolvedPieceFaces({ x: 0, y: 1, z: 0 }), ["U"]);
  assert.deepEqual(getSolvedPieceFaces({ x: 1, y: 0, z: 1 }), ["F", "R"]);
  assert.deepEqual(getSolvedPieceFaces({ x: -1, y: 1, z: -1 }), [
    "U",
    "B",
    "L",
  ]);
});

test("facelet labels start with their face and append owned cubie faces", () => {
  assert.equal(getFaceletLabel("F", ["U", "F", "R"]), "FUR");
  assert.equal(getFaceletLabel("U", ["U"]), "U");
  assert.equal(getFaceletLabel("B", ["U", "B", "L"]), "BUL");
});

test("solved-state sticker names use face-relative notation", () => {
  assert.equal(getSolvedStickerName("F", { x: -1, y: -1, z: 1 }), "FDL");
  assert.equal(getSolvedStickerName("F", { x: 0, y: -1, z: 1 }), "FD");
  assert.equal(getSolvedStickerName("F", { x: 1, y: -1, z: 1 }), "FDR");
  assert.equal(getSolvedStickerName("F", { x: -1, y: 0, z: 1 }), "FL");
  assert.equal(getSolvedStickerName("F", { x: 0, y: 0, z: 1 }), "F");
  assert.equal(getSolvedStickerName("F", { x: 1, y: 0, z: 1 }), "FR");
  assert.equal(getSolvedStickerName("F", { x: -1, y: 1, z: 1 }), "FUL");
  assert.equal(getSolvedStickerName("F", { x: 0, y: 1, z: 1 }), "FU");
  assert.equal(getSolvedStickerName("F", { x: 1, y: 1, z: 1 }), "FUR");
  assert.equal(getSolvedStickerName("B", { x: -1, y: 1, z: -1 }), "BUL");
  assert.equal(getSolvedStickerName("R", { x: 1, y: 1, z: 1 }), "RUF");
  assert.equal(getSolvedStickerName("U", { x: 0, y: 1, z: 0 }), "U");
});
