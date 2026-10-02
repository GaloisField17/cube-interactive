import { CanvasTexture, Sprite, SpriteMaterial } from "three";
import { DEFAULT_FACELET_LABEL_COLOR } from "../setupDefaults.js";

function getFaceletData(facelet) {
  return facelet?.facelet ?? facelet;
}

export function createFaceletLabelController({
  facelets,
  getSize,
  getGap,
  getLabelText,
  initialDepth,
}) {
  const labels = new Map();
  let depth = initialDepth;

  function createLabel(facelet) {
    const faceletData = getFaceletData(facelet);
    const canvas = document.createElement("canvas");

    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext("2d");

    context.font = "bold 72px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = 10;
    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.fillStyle = DEFAULT_FACELET_LABEL_COLOR;

    const labelText = getLabelText(facelet);

    context.strokeText(labelText, 128, 128);
    context.fillText(labelText, 128, 128);

    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new Sprite(material);

    sprite.renderOrder = 10;
    sprite.visible = false;
    sprite.userData.canvas = canvas;
    sprite.userData.labelText = labelText;
    sprite.userData.labelColor = DEFAULT_FACELET_LABEL_COLOR;
    sprite.userData.context = context;
    facelet.cubie.add(sprite);
    labels.set(faceletData, sprite);
  }

  function getColor(facelet) {
    return (
      labels.get(getFaceletData(facelet))?.userData.labelColor ??
      DEFAULT_FACELET_LABEL_COLOR
    );
  }

  function setColor(facelet, color) {
    const label = labels.get(getFaceletData(facelet));

    if (!label) {
      return;
    }

    const context = label.userData.context;

    label.userData.labelColor = color;
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = color;
    context.strokeText(label.userData.labelText, 128, 128);
    context.fillText(label.userData.labelText, 128, 128);
    label.material.map.needsUpdate = true;
  }

  function refresh(facelet) {
    const label = labels.get(getFaceletData(facelet));

    if (!label) {
      return;
    }

    const cubieSize = Math.max(
      0,
      (facelet.cubie.userData.currentSize ??
        facelet.cubie.userData.size ??
        getSize()) -
        (facelet.cubie.userData.currentGap ??
          facelet.cubie.userData.gap ??
          getGap()),
    );
    const normal = facelet.normal ?? getFaceletData(facelet)?.normal;
    const offset = cubieSize / 2 + depth;
    const labelText = getLabelText(facelet);

    if (label.userData.labelText !== labelText) {
      const context = label.userData.context;

      context.clearRect(0, 0, 256, 256);
      context.strokeText(labelText, 128, 128);
      context.fillText(labelText, 128, 128);
      label.material.map.needsUpdate = true;
      label.userData.labelText = labelText;
    }

    label.position.set(normal.x * offset, normal.y * offset, normal.z * offset);
    label.scale.setScalar(cubieSize * 0.62);
  }

  function refreshAll() {
    for (const facelet of facelets) {
      refresh(facelet);
    }
  }

  function setVisible(visible) {
    for (const label of labels.values()) {
      label.visible = visible;
    }
  }

  function setDepthTest(depthTest) {
    for (const label of labels.values()) {
      label.material.depthTest = depthTest;
      label.material.needsUpdate = true;
    }
  }

  function setDepth(nextDepth) {
    depth = nextDepth;
    refreshAll();
  }

  for (const facelet of facelets) {
    createLabel(facelet);
  }

  return {
    getColor,
    setColor,
    getDepth: () => depth,
    setDepth,
    refresh,
    refreshAll,
    setVisible,
    setDepthTest,
    getLabels: () => labels,
  };
}
