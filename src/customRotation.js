import { normalizeAngle } from "./cubeMath.js";
import { ROTATIONS } from "./rotationDefinitions.js";

export function getCustomMoveLabel(
  shortName,
  angle,
  { preserveEnteredAngle = false } = {},
) {
  const normalized = preserveEnteredAngle
    ? Math.trunc(angle * 1000) / 1000
    : normalizeAngle(angle);

  if (normalized === 90) return shortName;
  if (normalized === -90) return `${shortName}'`;
  if (normalized === 180 || normalized === -180) return `${shortName}2`;
  if (normalized !== 0) return `${shortName}[${normalized}°]`;

  return "";
}

export function getCustomRotationAngle(moveName, angle) {
  const definition = ROTATIONS[moveName];

  return definition ? Math.sign(definition.angle) * angle : angle;
}
