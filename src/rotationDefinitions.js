function addMoveVariants(name, axis, layers, angle) {
  const frozenLayers = Object.freeze([...layers]);

  ROTATIONS[name] = Object.freeze({ axis, layers: frozenLayers, angle });
  ROTATIONS[`${name}'`] = Object.freeze({
    axis,
    layers: frozenLayers,
    angle: -angle,
  });
  ROTATIONS[`${name}2`] = Object.freeze({
    axis,
    layers: frozenLayers,
    angle: 180,
  });
}

export const ROTATIONS = {};

addMoveVariants("R", "x", [1], -90);
addMoveVariants("L", "x", [-1], 90);
addMoveVariants("U", "y", [1], -90);
addMoveVariants("D", "y", [-1], 90);
addMoveVariants("F", "z", [1], -90);
addMoveVariants("B", "z", [-1], 90);

addMoveVariants("M", "x", [0], 90);
addMoveVariants("E", "y", [0], 90);
addMoveVariants("S", "z", [0], -90);

addMoveVariants("Rw", "x", [0, 1], -90);
addMoveVariants("Lw", "x", [-1, 0], 90);
addMoveVariants("Uw", "y", [0, 1], -90);
addMoveVariants("Dw", "y", [-1, 0], 90);
addMoveVariants("Fw", "z", [0, 1], -90);
addMoveVariants("Bw", "z", [-1, 0], 90);

addMoveVariants("x", "x", [-1, 0, 1], -90);
addMoveVariants("y", "y", [-1, 0, 1], -90);
addMoveVariants("z", "z", [-1, 0, 1], -90);

Object.freeze(ROTATIONS);

export const FACE_ROTATIONS = Object.freeze({
  R: Object.freeze({ axis: "x", layers: Object.freeze([1]) }),
  L: Object.freeze({ axis: "x", layers: Object.freeze([-1]) }),
  U: Object.freeze({ axis: "y", layers: Object.freeze([1]) }),
  D: Object.freeze({ axis: "y", layers: Object.freeze([-1]) }),
  F: Object.freeze({ axis: "z", layers: Object.freeze([1]) }),
  B: Object.freeze({ axis: "z", layers: Object.freeze([-1]) }),
});
