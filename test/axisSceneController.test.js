import assert from "node:assert/strict";
import test from "node:test";
import { Group, Vector3 } from "three";
import { createAxisSceneController } from "../src/ui/axisSceneController.js";

test("axis scene controller owns label and arrow scene effects", () => {
  const previousDocument = globalThis.document;
  const drawnText = [];
  globalThis.document = {
    createElement: () => {
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

      return {
        getContext: () => context,
        height: 0,
        width: 0,
      };
    },
  };

  try {
    const axisDefinitions = [
      ["R", [1, 0, 0], "#f00"],
      ["L", [-1, 0, 0], "#f80"],
      ["U", [0, 1, 0], "#ff0"],
      ["D", [0, -1, 0], "#0f0"],
      ["F", [0, 0, 1], "#00f"],
      ["B", [0, 0, -1], "#80f"],
    ].map(([face, direction, color]) => ({
      direction: new Vector3(...direction),
      label: { custom: face, coordinate: face, face },
      color,
      depth: 0.25,
    }));
    const scene = new Group();
    const controller = createAxisSceneController({
      scene,
      axisDefinitions,
      getAxisLabelText: (definition) => definition.label.custom,
      initialSize: 1,
      initialAxisDepth: 0.2,
      initialAxisLabelDepth: 0.25,
      initialRotationArrowDepth: 0.65,
      initialRotationArrowThickness: 0.015,
      initialRotationArrowRadius: 0.5,
      initialRotationArrowDirection: "clockwise",
    });
    const axisGroup = controller.getAxisGroup();
    const rotationArrowGroup = controller.getRotationArrowGroup();
    const label = axisGroup.children[1];

    assert.equal(scene.children.length, 2);
    assert.equal(axisGroup.children.length, 12);
    assert.equal(rotationArrowGroup.children.length, 6);
    assert.equal(axisGroup.visible, false);
    assert.equal(rotationArrowGroup.visible, false);
    assert.equal(label.position.x, 1.25);
    assert.ok(drawnText.some(({ text }) => text === "R"));

    axisDefinitions[0].label.custom = "RIGHT";
    controller.setAxisLabelText(0, "RIGHT");
    controller.setAxisLabelColor(0, "#123456");
    controller.setAxisLabelVisible(0, true);
    controller.setAxisLabelGroupVisible(true);
    controller.setAxisArrowGroupVisible(true);
    controller.setAxisDepth(0.3);
    controller.setAxisLabelDepth(0.4);
    controller.setAxisLabelsDepthTest(true);

    assert.equal(controller.getAxisLabelColor(0), "#123456");
    assert.equal(label.userData.labelColor, "#123456");
    assert.equal(label.material.depthTest, true);
    assert.equal(label.visible, true);
    assert.equal(axisGroup.visible, true);
    assert.equal(axisGroup.children[0].position.x, 0.3);
    assert.equal(label.position.x, 1.4);
    assert.ok(
      drawnText.some(
        ({ text, fillStyle }) =>
          text === "RIGHT" && fillStyle === "#123456",
      ),
    );

    controller.setAxisLabelGroupVisible(false);
    assert.equal(axisGroup.visible, true);
    controller.setAxisArrowGroupVisible(false);
    assert.equal(axisGroup.visible, false);

    controller.setRotationArrowColor(0, "#abcdef");
    controller.setRotationArrowDepth(0.8);
    controller.setRotationArrowVisible(0, false);
    controller.setRotationArrowGroupVisible(true);
    controller.setRotationArrowsDepthTest(true);
    controller.setRotationArrowThickness(0.04);
    controller.setRotationArrowRadius(0.8);
    controller.setRotationArrowDirection("counter-clockwise");

    const arrow = rotationArrowGroup.children[0];

    assert.equal(rotationArrowGroup.visible, true);
    assert.equal(arrow.visible, false);
    assert.equal(arrow.position.x, 0.8);
    assert.equal(controller.getRotationArrowColor(0), "#abcdef");
    assert.equal(arrow.userData.color, "#abcdef");
    assert.equal(arrow.children[0].geometry.parameters.radius, 0.02);
    assert.equal(arrow.children[0].material.depthTest, true);

    controller.setScale(1);
    assert.equal(axisGroup.scale.x, 2.4);
    assert.equal(rotationArrowGroup.scale.x, 2.4);
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
});
