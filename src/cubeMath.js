export function cloneVector(vector) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

export function getFaceFromNormal(normal) {
  if (normal.x === 1) return "R";
  if (normal.x === -1) return "L";

  if (normal.y === 1) return "U";
  if (normal.y === -1) return "D";

  if (normal.z === 1) return "F";
  if (normal.z === -1) return "B";

  return null;
}

export function normalizeAngle(value) {
  let angle = Number(value);

  if (!Number.isFinite(angle)) {
    return 0;
  }

  while (angle > 360) {
    angle -= 360;
  }

  while (angle < -360) {
    angle += 360;
  }

  return angle;
}

function rotateVector90(vector, axis, direction) {
  const { x, y, z } = vector;

  if (axis === "x") {
    return direction === 1 ? { x, y: -z, z: y } : { x, y: z, z: -y };
  }

  if (axis === "y") {
    return direction === 1 ? { x: z, y, z: -x } : { x: -z, y, z: x };
  }

  if (axis === "z") {
    return direction === 1 ? { x: -y, y: x, z } : { x: y, y: -x, z };
  }

  return { x, y, z };
}

export function rotateVector(vector, axis, angle) {
  const quarterTurns = Math.round(normalizeAngle(angle) / 90);
  const direction = quarterTurns >= 0 ? 1 : -1;
  const turns = Math.abs(quarterTurns) % 4;
  let result = cloneVector(vector);

  for (let index = 0; index < turns; index += 1) {
    result = rotateVector90(result, axis, direction);
  }

  return result;
}
