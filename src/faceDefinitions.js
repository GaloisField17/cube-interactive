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

export function getSolvedPieceKey(position) {
  return {
    x: position.z,
    y: position.x,
    z: position.y,
  };
}

export function getSolvedPieceFaces(position) {
  const faceDefinitions = [
    ["U", "y", 1],
    ["D", "y", -1],
    ["F", "z", 1],
    ["B", "z", -1],
    ["R", "x", 1],
    ["L", "x", -1],
  ];

  return faceDefinitions
    .filter(([, axis, value]) => position[axis] === value)
    .map(([face]) => face);
}

export function getFaceletLabel(face, pieceFaces = []) {
  return [face, ...pieceFaces.filter((pieceFace) => pieceFace !== face)].join(
    "",
  );
}

export function getFaceletVisibility(face, position) {
  const faceDefinition = {
    R: { axis: "x", value: 1 },
    L: { axis: "x", value: -1 },
    U: { axis: "y", value: 1 },
    D: { axis: "y", value: -1 },
    F: { axis: "z", value: 1 },
    B: { axis: "z", value: -1 },
  }[face];

  if (!faceDefinition) {
    return "inner";
  }

  return position[faceDefinition.axis] === faceDefinition.value
    ? "outer"
    : "inner";
}

export function getSolvedStickerName(face, position) {
  const faceAxes = {
    F: [
      { axis: "y", positive: "U", negative: "D" },
      { axis: "x", positive: "R", negative: "L" },
    ],
    B: [
      { axis: "y", positive: "U", negative: "D" },
      { axis: "x", positive: "R", negative: "L" },
    ],
    R: [
      { axis: "y", positive: "U", negative: "D" },
      { axis: "z", positive: "F", negative: "B" },
    ],
    L: [
      { axis: "y", positive: "U", negative: "D" },
      { axis: "z", positive: "F", negative: "B" },
    ],
    U: [
      { axis: "z", positive: "F", negative: "B" },
      { axis: "x", positive: "R", negative: "L" },
    ],
    D: [
      { axis: "z", positive: "F", negative: "B" },
      { axis: "x", positive: "R", negative: "L" },
    ],
  };

  const axes = faceAxes[face] ?? [];
  const suffix = axes
    .map(({ axis, positive, negative }) => {
      if (position[axis] === 1) return positive;
      if (position[axis] === -1) return negative;
      return "";
    })
    .join("");

  return `${face}${suffix}`;
}

export function getFaceletId(parentKey, orientationKey) {
  return `(${parentKey.x},${parentKey.y},${parentKey.z})-${orientationKey}`;
}

export function createFacelet(
  face,
  faceDefinitions,
  parentKey = { x: 0, y: 0, z: 0 },
  position = null,
) {
  const currentParentKey = {
    x: parentKey.x,
    y: parentKey.y,
    z: parentKey.z,
  };

  const visibilityKey = position
    ? getFaceletVisibility(face, position)
    : "outer";
  const defaultColor = faceDefinitions[face].color;
  const id = getFaceletId(currentParentKey, face);
  const solvedFaces = position ? getSolvedPieceFaces(position) : [];
  const label =
    visibilityKey === "outer" && position
      ? getFaceletLabel(face, solvedFaces)
      : id;

  const facelet = {
    id,
    name: label,
    label,
    orientationKey: face,
    visibilityKey,
    parentKey: currentParentKey,
    defaultColor,
    currentColor: defaultColor,
    color: defaultColor,
    face,
    normal: cloneVector(faceDefinitions[face].normal),
    solvedPosition: position ? { ...position } : null,
    type: "facelet",
    sticker: null,
  };

  facelet.sticker = facelet;

  return facelet;
}

export function createSticker(
  face,
  faceDefinitions,
  position = null,
  pieceKey = null,
) {
  const parentKey = pieceKey ?? { x: 0, y: 0, z: 0 };
  const facelet = createFacelet(face, faceDefinitions, parentKey, position);

  return facelet;
}
