import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import { getFaceFromNormal } from "../cubeMath.js";
import { MATERIAL_INDEX_BY_FACE } from "../faceDefinitions.js";
import { DEFAULT_VIEW_SETTINGS } from "../setupDefaults.js";

const ALWAYS_VISIBLE = "always-visible";
const HIDDEN_BEHIND_CUBE = "hidden-behind-cube";

export function createViewController({
  scene,
  camera,
  cubies,
  facelets,
  isValidColorValue,
}) {
  let settings = { ...DEFAULT_VIEW_SETTINGS };

  function dimColorForGhostEffect(color) {
    const baseColor = new Color(color);

    return `#${baseColor.multiplyScalar(0.28).getHexString()}`;
  }

  function refresh() {
    scene.userData.shouldRefreshHiddenStickerState =
      settings.ghostStickersVisibility !== ALWAYS_VISIBLE ||
      settings.peekStickersVisibility !== ALWAYS_VISIBLE;

    if (!facelets.length) {
      return;
    }

    scene.updateMatrixWorld(true);

    const cameraPosition = camera.getWorldPosition(new Vector3());
    const cubieWorldPositions = new Map();

    for (const cubie of cubies) {
      cubieWorldPositions.set(
        cubie,
        new Vector3().setFromMatrixPosition(cubie.matrixWorld),
      );

      for (const material of cubie.material) {
        material.visible = true;
        material.opacity = 1;
        material.transparent = false;
        material.depthTest = true;
        material.depthWrite = true;
        material.side = 0;
      }
    }

    const activePeekOverlayIds = new Set();
    const hiddenPeekColor = isValidColorValue(
      settings.peekStickersHideWhenColor,
    )
      ? new Color(settings.peekStickersHideWhenColor)
      : null;

    for (const facelet of facelets) {
      const face = getFaceFromNormal(facelet.normal);

      if (!face) {
        continue;
      }

      const materialIndex = MATERIAL_INDEX_BY_FACE[face];

      if (materialIndex === undefined) {
        continue;
      }

      const cubie = facelet.cubie;
      const material = cubie.material[materialIndex];

      if (!facelet.userData) {
        facelet.userData = {};
      }

      const worldNormal = new Vector3(
        facelet.normal.x,
        facelet.normal.y,
        facelet.normal.z,
      ).transformDirection(cubie.matrixWorld);
      const worldPosition = cubieWorldPositions
        .get(cubie)
        .clone()
        .add(worldNormal.clone().multiplyScalar(0.62));
      const toCamera = cameraPosition.clone().sub(worldPosition).normalize();
      const isFacingCamera = worldNormal.dot(toCamera) > 0.01;
      const isHiddenFromView = !isFacingCamera;
      const originalColor =
        facelet.currentColor ?? facelet.defaultColor ?? facelet.color;
      const shouldApplyGhostTint =
        settings.ghostStickersVisibility === HIDDEN_BEHIND_CUBE &&
        isHiddenFromView;
      const matchesHiddenPeekColor =
        hiddenPeekColor !== null &&
        new Color(originalColor).equals(hiddenPeekColor);
      const shouldShowPeek =
        settings.peekStickersVisibility === HIDDEN_BEHIND_CUBE &&
        isHiddenFromView &&
        !matchesHiddenPeekColor;
      const nextColor = shouldApplyGhostTint
        ? dimColorForGhostEffect(originalColor)
        : originalColor;

      material.color.set(nextColor);
      material.visible = true;
      material.transparent = shouldApplyGhostTint;
      material.opacity = shouldApplyGhostTint ? 0.38 : 1;
      material.depthTest = !shouldApplyGhostTint;
      material.depthWrite = !shouldApplyGhostTint;
      material.side = shouldApplyGhostTint ? DoubleSide : 0;

      if (!cubie.userData.peekStickerOverlays) {
        cubie.userData.peekStickerOverlays = new Map();
      }

      let overlay = cubie.userData.peekStickerOverlays.get(facelet.id);

      if (!overlay) {
        overlay = new Mesh(
          new PlaneGeometry(0.96, 0.96),
          new MeshBasicMaterial({
            color: originalColor,
            side: DoubleSide,
            transparent: false,
            depthTest: true,
            depthWrite: false,
          }),
        );
        overlay.renderOrder = 1;
        cubie.add(overlay);
        cubie.userData.peekStickerOverlays.set(facelet.id, overlay);
      }

      const localNormal = new Vector3(
        facelet.normal.x,
        facelet.normal.y,
        facelet.normal.z,
      ).normalize();

      overlay.visible = shouldShowPeek;
      overlay.position.copy(
        localNormal.clone().multiplyScalar(0.62 + settings.peekStickersDepth),
      );
      overlay.quaternion.setFromUnitVectors(
        new Vector3(0, 0, 1),
        localNormal.clone().normalize(),
      );
      overlay.material.color.set(originalColor);
      overlay.material.transparent = false;
      overlay.material.opacity = 1;
      overlay.material.depthTest = true;
      overlay.material.depthWrite = false;
      facelet.userData.peekVisible = shouldShowPeek;
      activePeekOverlayIds.add(`${cubie.uuid}:${facelet.id}`);
    }

    for (const cubie of cubies) {
      const overlays = cubie.userData.peekStickerOverlays;

      if (!overlays) {
        continue;
      }

      for (const [faceletId, overlay] of overlays.entries()) {
        if (!activePeekOverlayIds.has(`${cubie.uuid}:${faceletId}`)) {
          overlay.visible = false;
        }
      }
    }
  }

  function getSettings() {
    return { ...settings };
  }

  function setSettings(nextSettings) {
    settings = { ...DEFAULT_VIEW_SETTINGS, ...nextSettings };
    refresh();
  }

  function setSetting(name, value) {
    if (!Object.hasOwn(DEFAULT_VIEW_SETTINGS, name)) {
      return;
    }

    settings = { ...settings, [name]: value };
    refresh();
  }

  function reset() {
    setSettings(DEFAULT_VIEW_SETTINGS);
  }

  scene.userData.refreshHiddenStickerState = refresh;
  scene.userData.shouldRefreshHiddenStickerState = false;

  return { getSettings, setSetting, setSettings, reset, refresh };
}
