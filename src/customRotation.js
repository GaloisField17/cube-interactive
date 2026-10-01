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
const MOVE_NAME_CANDIDATES = Object.freeze(
  [
    ...Object.keys(ROTATIONS),
    ...Object.keys(LOWERCASE_WIDE_MOVE_NAMES).flatMap((moveName) => [
      moveName,
      `${moveName}'`,
      `${moveName}2`,
    ]),
  ].sort((left, right) => right.length - left.length),
);

export function normalizeWideMoveName(moveName) {
  const match = moveName.match(/^([udrlfb])(['2]?)$/);

  if (!match) {
    return moveName;
  }

  return `${LOWERCASE_WIDE_MOVE_NAMES[match[1]]}${match[2]}`;
}

export function parseCustomMove(value) {
  const match = value.match(
    /^(.+?)(?:\(([+-]?\d+(?:\.\d+)?)(?:degrees?|degs?|°)\)|\[([+-]?\d+(?:\.\d+)?)(?:degrees?|degs?|°)\])$/,
  );

  if (!match) {
    return null;
  }

  return {
    moveName: match[1],
    angle: Number(match[2] ?? match[3]),
  };
}

export function stripCustomMoveParentheses(move) {
  let normalizedMove = move;

  while (normalizedMove.startsWith("(") || normalizedMove.endsWith(")")) {
    if (
      ROTATIONS[normalizeWideMoveName(normalizedMove)] ||
      parseCustomMove(normalizedMove)
    ) {
      return normalizedMove;
    }

    if (normalizedMove.startsWith("(")) {
      normalizedMove = normalizedMove.slice(1);
    } else {
      normalizedMove = normalizedMove.slice(0, -1);
    }
  }

  return normalizedMove;
}

function isCustomMovePrefix(value) {
  const prefixValue = value.replace(/^\(+/u, "").replace(/\)+$/u, "");

  for (const name of MOVE_NAME_CANDIDATES) {
    if (normalizeWideMoveName(name) === normalizeWideMoveName(prefixValue)) {
      continue;
    }

    if (name.startsWith(prefixValue)) {
      return true;
    }
  }

  for (const name of MOVE_NAME_CANDIDATES) {
    const normalizedName = normalizeWideMoveName(name);

    for (const [opening, closing] of [
      ["[", "]"],
      ["(", ")"],
    ]) {
      const prefix = `${name}${opening}`;

      if (!prefixValue.startsWith(prefix)) {
        continue;
      }

      const remainder = prefixValue.slice(prefix.length);
      const numberMatch = remainder.match(/^([+-]?(?:\d+(?:\.\d*)?)?)(.*)$/);

      if (!numberMatch || !/^[-+]?(?:\d+(?:\.\d*)?)?$/.test(numberMatch[1])) {
        continue;
      }

      let unit = numberMatch[2];
      const hasClosingDelimiter = unit.endsWith(closing);

      if (hasClosingDelimiter) {
        unit = unit.slice(0, -1);
      }

      const acceptedUnits = ["degree", "degrees", "deg", "degs", "°"];
      const isUnitPrefix = acceptedUnits.some((acceptedUnit) =>
        acceptedUnit.startsWith(unit),
      );
      const hasValidBase = ROTATIONS[normalizedName];

      if (
        hasValidBase &&
        isUnitPrefix &&
        (!hasClosingDelimiter || acceptedUnits.includes(unit))
      ) {
        return true;
      }
    }
  }

  return false;
}

function getCompleteMoveEnd(value, start) {
  let moveStart = start;

  while (value[moveStart] === "(") {
    moveStart += 1;
  }

  for (const moveName of MOVE_NAME_CANDIDATES) {
    if (!value.startsWith(moveName, moveStart)) {
      continue;
    }

    let moveEnd = moveStart + moveName.length;
    const openingDelimiter = value[moveEnd];

    if (openingDelimiter === "[" || openingDelimiter === "(") {
      const closingDelimiter = openingDelimiter === "[" ? "]" : ")";
      const closingIndex = value.indexOf(closingDelimiter, moveEnd + 1);

      if (closingIndex === -1) {
        return null;
      }

      const customMove = parseCustomMove(
        value.slice(moveStart, closingIndex + 1),
      );

      if (
        !customMove ||
        !ROTATIONS[normalizeWideMoveName(customMove.moveName)]
      ) {
        continue;
      }

      moveEnd = closingIndex + 1;
    } else if (!ROTATIONS[normalizeWideMoveName(moveName)]) {
      continue;
    }

    while (value[moveEnd] === ")") {
      moveEnd += 1;
    }

    return moveEnd;
  }

  return null;
}

export function tokenizeRotationSequence(
  value,
  caretOffset = null,
  { allowDraftOutsideCaret = false } = {},
) {
  const normalizedValue = value.replace(/\u00a0/gu, " ");
  const trailingWhitespace = /\s$/u.test(normalizedValue);
  const tokens = [];
  let draft = null;

  for (const match of normalizedValue.matchAll(/\S+/gu)) {
    let offset = 0;

    while (offset < match[0].length) {
      const remaining = match[0].slice(offset);
      const tokenStart = match.index + offset;
      const caretIsInRemaining =
        caretOffset !== null &&
        caretOffset >= tokenStart &&
        caretOffset <= match.index + match[0].length;
      const moveEnd = getCompleteMoveEnd(match[0], offset);

      if (
        moveEnd === null &&
        (caretIsInRemaining || allowDraftOutsideCaret) &&
        isCustomMovePrefix(remaining)
      ) {
        draft = {
          text: remaining,
          start: tokenStart,
          end: match.index + match[0].length,
        };
        tokens.push(draft);
        break;
      }

      if (moveEnd === null) {
        return null;
      }

      tokens.push({
        text: match[0].slice(offset, moveEnd),
        start: tokenStart,
        end: match.index + moveEnd,
      });
      offset = moveEnd;
    }
  }

  return {
    moves: tokens.filter((token) => token !== draft).map((token) => token.text),
    draft,
    tokens,
    trailingWhitespace,
  };
}

export function getRotationSequenceEditorState(value, caretOffset, options) {
  return tokenizeRotationSequence(value, caretOffset, options);
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
