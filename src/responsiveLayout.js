const SMALL_SCREEN_CUBE_VIEWPORT_HEIGHT_RATIO = 0.786;

export function getCubeViewportHeight(width, height) {
  if (width <= 600) {
    return Math.max(280, height * 0.52);
  }

  if (width <= 900) {
    return Math.max(300, height * 0.62);
  }

  return height;
}

export function getCubeViewportDisplayHeight(width, height) {
  const renderHeight = getCubeViewportHeight(width, height);

  return width <= 900
    ? renderHeight * SMALL_SCREEN_CUBE_VIEWPORT_HEIGHT_RATIO
    : renderHeight;
}
