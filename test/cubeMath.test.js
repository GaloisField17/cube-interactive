import assert from "node:assert/strict";
import test from "node:test";
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
  createFaceDefinitions,
  createSticker,
  MATERIAL_INDEX_BY_FACE,
} from "../src/faceDefinitions.js";
import { getCubeViewportHeight } from "../src/responsiveLayout.js";
import { ROTATIONS } from "../src/rotationDefinitions.js";

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
  });
  assert.deepEqual(rotateVector(vector, "x", 90), { x: 1, y: -3, z: 2 });
  assert.deepEqual(rotateVector(vector, "y", -90), { x: -3, y: 2, z: 1 });
  assert.deepEqual(rotateVector(vector, "z", 180), { x: -1, y: -2, z: 3 });
  assert.deepEqual(rotateVector(vector, "x", 360), vector);
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
});
