import { cloneVector } from "./cubeMath.js";

export const MATERIAL_INDEX_BY_FACE = {
  R: 0,
  L: 1,
  U: 2,
  D: 3,
  F: 4,
  B: 5,
};

export function createFaceDefinitions(colors) {
  return Object.freeze({
    R: Object.freeze({
      axis: "x",
      value: 1,
      normal: Object.freeze({ x: 1, y: 0, z: 0 }),
      color: colors.right,
    }),
    L: Object.freeze({
      axis: "x",
      value: -1,
      normal: Object.freeze({ x: -1, y: 0, z: 0 }),
      color: colors.left,
    }),
    U: Object.freeze({
      axis: "y",
      value: 1,
      normal: Object.freeze({ x: 0, y: 1, z: 0 }),
      color: colors.top,
    }),
    D: Object.freeze({
      axis: "y",
      value: -1,
      normal: Object.freeze({ x: 0, y: -1, z: 0 }),
      color: colors.bottom,
    }),
    F: Object.freeze({
      axis: "z",
      value: 1,
      normal: Object.freeze({ x: 0, y: 0, z: 1 }),
      color: colors.front,
    }),
    B: Object.freeze({
      axis: "z",
      value: -1,
      normal: Object.freeze({ x: 0, y: 0, z: -1 }),
      color: colors.back,
    }),
  });
}

export function createSticker(face, faceDefinitions) {
  return {
    face,
    color: faceDefinitions[face].color,
    normal: cloneVector(faceDefinitions[face].normal),
  };
}
