import assert from "node:assert/strict";
import test from "node:test";
import { Group } from "three";
import { createFaceletLabelController } from "../src/ui/faceletLabelController.js";

test("facelet label controller owns label color, depth, visibility, and transforms", () => {
  const previousDocument = globalThis.document;
  const drawnText = [];
  const context = {
    fillStyle: "",
    clearRect() {},
    fillText(text) {
      drawnText.push({ text, fillStyle: this.fillStyle });
    },
    strokeText(text) {
      drawnText.push({ text, fillStyle: this.fillStyle });
    },
  };
  const canvas = {
    getContext: () => context,
  };
  const cubie = new Group();

  cubie.userData.size = 1;
  cubie.userData.gap = 0.1;
  globalThis.document = {
    createElement: () => canvas,
  };

  try {
    const facelet = {
      id: "sticker-f",
      facelet: { id: "sticker-f" },
      cubie,
      normal: { x: 0, y: 0, z: 1 },
    };
    let labelText = "F";
    const controller = createFaceletLabelController({
      facelets: [facelet],
      getSize: () => 1,
      getGap: () => 0.1,
      getLabelText: () => labelText,
      initialDepth: 0.25,
    });
    const label = controller.getLabels().get(facelet.facelet);

    assert.ok(label);
    assert.ok(cubie.children.includes(label));
    assert.equal(label.material.map.image, canvas);
    assert.equal(label.userData.labelText, "F");
    assert.equal(controller.getColor(facelet), "#111");
    assert.equal(label.visible, false);
    assert.ok(drawnText.some(({ text }) => text === "F"));

    controller.setColor(facelet, "#123456");
    controller.setVisible(true);
    controller.setDepthTest(false);
    controller.refresh(facelet);

    assert.equal(controller.getColor(facelet), "#123456");
    assert.equal(label.userData.context.fillStyle, "#123456");
    assert.equal(label.visible, true);
    assert.equal(label.material.depthTest, false);
    assert.equal(label.position.z, 0.7);
    assert.equal(label.scale.x, 0.558);
    assert.ok(
      drawnText.some(
        ({ text, fillStyle }) => text === "F" && fillStyle === "#123456",
      ),
    );

    labelText = "FU";
    cubie.userData.currentSize = 0.8;
    controller.setDepth(0.4);

    assert.equal(controller.getDepth(), 0.4);
    assert.equal(label.userData.labelText, "FU");
    assert.equal(label.position.z, 0.75);
    assert.ok(Math.abs(label.scale.x - 0.434) < 1e-12);
    assert.ok(drawnText.some(({ text }) => text === "FU"));
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
});
