import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIEW_SETTINGS } from "../src/setupDefaults.js";
import { createViewController } from "../src/ui/viewController.js";

function createController() {
  const scene = { userData: {} };

  const controller = createViewController({
    scene,
    camera: {},
    cubies: [],
    facelets: [],
    isValidColorValue: () => true,
  });

  return { scene, controller };
}

test("view controller owns settings and hidden-sticker refresh state", () => {
  const { scene, controller } = createController();

  assert.deepEqual(controller.getSettings(), DEFAULT_VIEW_SETTINGS);
  assert.equal(scene.userData.shouldRefreshHiddenStickerState, false);
  assert.equal(scene.userData.refreshHiddenStickerState, controller.refresh);

  controller.setSetting("peekStickersVisibility", "hidden-behind-cube");

  assert.equal(scene.userData.shouldRefreshHiddenStickerState, true);
  assert.equal(
    controller.getSettings().peekStickersVisibility,
    "hidden-behind-cube",
  );

  controller.reset();

  assert.deepEqual(controller.getSettings(), DEFAULT_VIEW_SETTINGS);
  assert.equal(scene.userData.shouldRefreshHiddenStickerState, false);
});

test("view controller applies partial settings over canonical defaults", () => {
  const { controller } = createController();

  controller.setSettings({ peekStickersDepth: 0.75 });

  assert.deepEqual(controller.getSettings(), {
    ...DEFAULT_VIEW_SETTINGS,
    peekStickersDepth: 0.75,
  });
});
