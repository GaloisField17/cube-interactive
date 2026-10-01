const SMALL_SCREEN_CUBE_VIEWPORT_HEIGHT_RATIO = 0.786;
const MAX_CUBE_VIEWPORT_DISPLAY_HEIGHT_RATIO = 0.85;

export function getCubeViewportDisplayHeightBounds(height) {
  const minimum = 0;

  return {
    minimum,
    maximum: Math.max(minimum, height * MAX_CUBE_VIEWPORT_DISPLAY_HEIGHT_RATIO),
  };
}

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
