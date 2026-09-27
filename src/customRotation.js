import { normalizeAngle } from "./cubeMath.js";
import { ROTATIONS } from "./rotationDefinitions.js";

const LOWERCASE_WIDE_MOVE_NAMES = Object.freeze({
  u: "Uw",
  d: "Dw",
  r: "Rw",
  l: "Lw",
  f: "Fw",
  b: "Bw",
});

export function normalizeWideMoveName(moveName) {
  const match = moveName.match(/^([udrlfb])(['2]?)$/);

  if (!match) {
    return moveName;
  }

  return `${LOWERCASE_WIDE_MOVE_NAMES[match[1]]}${match[2]}`;
}

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
