export function getCubeViewportHeight(width, height) {
  if (width <= 600) {
    return Math.max(280, height * 0.52);
  }

  if (width <= 900) {
    return Math.max(300, height * 0.62);
  }

  return height;
}
