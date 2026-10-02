export const DEFAULT_FACELET_LABEL_COLOR = "#111";

export const DEFAULT_VIEW_SETTINGS = Object.freeze({
  ghostStickersVisibility: "always-visible",
  peekStickersVisibility: "always-visible",
  peekStickersDepth: 0.2,
  peekStickersHideWhenColor: "",
});

export function createDefaultSetup({
  getDefaultCubeState,
  getDefaultCameraView,
  faceletIds,
  axisFaces,
  defaultFaceletLabelColor,
  defaultFaceColors,
}) {
  const faceletLabels = Object.fromEntries(
    faceletIds.map((id) => [id, defaultFaceletLabelColor]),
  );
  const axisLabelsByFace = Object.fromEntries(
    axisFaces.map((face) => [face, { visible: false, customText: face }]),
  );
  const axisArrowsByFace = Object.fromEntries(
    axisFaces.map((face) => [face, { visible: false }]),
  );
  const rotationArrowsByFace = Object.fromEntries(
    axisFaces.map((face) => [face, { visible: false }]),
  );
  const defaultAxisColors = Object.fromEntries(
    axisFaces.map((face) => [face, defaultFaceColors[face]]),
  );

  return {
    cube: getDefaultCubeState(),
    view: {
      ...getDefaultCameraView(),
      ...DEFAULT_VIEW_SETTINGS,
    },
    rotations: { moves: [], text: "", durationSeconds: 1 },
    colors: {
      faceletLabels,
      axisLabels: { ...defaultAxisColors },
      rotationArrows: { ...defaultAxisColors },
    },
    labels: {
      facelets: false,
      faceletVisibility: "always-visible",
      axisLabels: false,
      axisLabelVisibility: "always-visible",
      axisLabelMode: "face",
      axisLabelDepth: 0.25,
      axisLabelsByFace,
      axisArrows: false,
      axisArrowVisibility: "hidden-behind-cube",
      axisDepth: 0,
      axisArrowsByFace,
      rotationArrows: false,
      rotationArrowVisibility: "always-visible",
      rotationArrowDepth: 0.65,
      rotationArrowThickness: 0.015,
      rotationArrowRadius: 0.5,
      rotationArrowDirection: "clockwise",
      rotationArrowsByFace,
      labelDepth: 0.25,
    },
  };
}
