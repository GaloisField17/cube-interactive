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

function isValidCustomMove(moveName) {
  const normalizedMove = stripCustomMoveParentheses(moveName);

  if (ROTATIONS[normalizeWideMoveName(normalizedMove)]) {
    return true;
  }

  const customMove = parseCustomMove(normalizedMove);

  return Boolean(
    customMove && ROTATIONS[normalizeWideMoveName(customMove.moveName)],
  );
}

function isCustomMovePrefix(value) {
  const names = [
    ...Object.keys(ROTATIONS),
    ...Object.keys(LOWERCASE_WIDE_MOVE_NAMES),
  ];
  const prefixValue = value.replace(/^\(+/u, "").replace(/\)+$/u, "");

  for (const name of names) {
    if (normalizeWideMoveName(name) === normalizeWideMoveName(prefixValue)) {
      continue;
    }

    if (name.startsWith(prefixValue)) {
      return true;
    }
  }

  for (const name of names) {
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

export function getRotationSequenceEditorState(value, caretOffset) {
  const normalizedValue = value.replace(/\u00a0/gu, " ");
  const trailingWhitespace = /\s$/u.test(normalizedValue);
  const tokens = [...normalizedValue.matchAll(/\S+/gu)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
  const invalidTokens = tokens.filter(
    (token) => !isValidCustomMove(token.text),
  );

  if (invalidTokens.length === 0) {
    return {
      moves: tokens.map((token) => token.text),
      draft: null,
      tokens,
      trailingWhitespace,
    };
  }

  const draft = invalidTokens[0];
  const draftIndex = tokens.indexOf(draft);
  const caretIsInDraft = caretOffset >= draft.start && caretOffset <= draft.end;

  if (
    invalidTokens.length !== 1 ||
    !caretIsInDraft ||
    !isCustomMovePrefix(draft.text)
  ) {
    return null;
  }

  return {
    moves: tokens
      .filter((_, index) => index !== draftIndex)
      .map((token) => token.text),
    draft,
    tokens,
    trailingWhitespace,
  };
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
