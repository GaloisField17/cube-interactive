import { colornames } from "color-name-list/bestof";

const colorNameByHex = new Map();

for (const { name, hex } of colornames) {
  const normalizedHex = hex.toLowerCase();

  if (!colorNameByHex.has(normalizedHex)) {
    colorNameByHex.set(normalizedHex, name.toLowerCase());
  }
}

export function getNamedColorOrHex(value) {
  const hex = value.toLowerCase();

  return colorNameByHex.get(hex) ?? value;
}
