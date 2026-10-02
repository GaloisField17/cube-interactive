import {
  ArrowHelper,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from "three";

export function createAxisSceneController({
  scene,
  axisDefinitions,
  getAxisLabelText,
  initialSize,
  initialAxisDepth,
  initialAxisLabelDepth,
  initialRotationArrowDepth,
  initialRotationArrowThickness,
  initialRotationArrowRadius,
  initialRotationArrowDirection,
}) {
  const axisLength = 1;
  const axisGroup = new Group();
  const axisLabels = [];
  const axisArrows = [];
  const axisLabelColors = [];
  const rotationArrowGroup = new Group();
  const rotationArrowColors = axisDefinitions.map(
    (axisDefinition) => axisDefinition.color,
  );
  const rotationArrowVisibility = axisDefinitions.map(() => true);
  let axisLabelsGroupVisible = false;
  let axisArrowsGroupVisible = false;
  let axisDepth = initialAxisDepth;
  let axisLabelDepth = initialAxisLabelDepth;
  let rotationArrowDepth = initialRotationArrowDepth;
  let rotationArrowThickness = initialRotationArrowThickness;
  let rotationArrowRadius = initialRotationArrowRadius;
  let rotationArrowDirection = initialRotationArrowDirection;
  let rotationArrowsDepthTest = false;

  function createAxisLabel(axisDefinition) {
    const canvas = document.createElement("canvas");
    const canvasScale = 8;

    canvas.width = 128 * canvasScale;
    canvas.height = 64 * canvasScale;

    const context = canvas.getContext("2d");

    context.font = `bold ${36 * canvasScale}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = axisDefinition.color;
    context.strokeStyle = "rgba(0, 0, 0, 0.9)";
    context.lineWidth = 6 * canvasScale;
    context.lineJoin = "round";
    context.lineCap = "round";
    const labelText = getAxisLabelText(axisDefinition);

    context.strokeText(
      labelText,
      (128 / 2) * canvasScale,
      (64 / 2) * canvasScale,
    );
    context.fillText(
      labelText,
      (128 / 2) * canvasScale,
      (64 / 2) * canvasScale,
    );

    const sprite = new Sprite(
      new SpriteMaterial({
        map: new CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );

    sprite.scale.set(0.45, 0.225, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.context = context;
    sprite.userData.labelColor = axisDefinition.color;
    sprite.userData.axisDefinition = axisDefinition;
    sprite.userData.coordinateLabel = axisDefinition.label.coordinate;
    sprite.userData.faceLabel = axisDefinition.label.face;
    return sprite;
  }

  function createAxisArrow(axisDefinition) {
    const guideline = new ArrowHelper(
      axisDefinition.direction,
      axisDefinition.direction.clone().multiplyScalar(axisDepth),
      axisLength,
      0x000000,
      0.165,
      0.095,
    );
    const guidelineLine = guideline.line;
    const guidelineShaftLength = axisLength - 0.165;

    guideline.remove(guidelineLine);
    guideline.line = new Mesh(
      new CylinderGeometry(0.008, 0.008, guidelineShaftLength, 12),
      new MeshBasicMaterial({ color: 0x000000 }),
    );
    guideline.line.position.y = guidelineShaftLength / 2;
    guideline.add(guideline.line);
    const arrow = new ArrowHelper(
      new Vector3(0, 1, 0),
      new Vector3(),
      axisLength,
      axisDefinition.color,
      0.16,
      0.09,
    );
    const axisLabel = createAxisLabel(axisDefinition);

    guideline.line.material.depthWrite = false;
    guideline.cone.material.depthWrite = false;
    guideline.add(arrow);
    guideline.visible = false;
    axisLabel.visible = false;
    axisLabel.position
      .copy(axisDefinition.direction)
      .multiplyScalar(axisLength + axisLabelDepth);
    axisGroup.add(guideline, axisLabel);
    axisArrows.push(guideline);
    axisLabels.push(axisLabel);
    axisLabelColors.push(axisDefinition.color);
  }

  function createRotationArrow(axisDefinition, color) {
    const direction = axisDefinition.direction;
    let firstBasis;
    let secondBasis;

    if (Math.abs(direction.x) === 1) {
      firstBasis = new Vector3(0, 1, 0);
      secondBasis = new Vector3(0, 0, 1);
    } else if (Math.abs(direction.y) === 1) {
      firstBasis = new Vector3(1, 0, 0);
      secondBasis = new Vector3(0, 0, 1);
    } else {
      firstBasis = new Vector3(1, 0, 0);
      secondBasis = new Vector3(0, 1, 0);
    }

    if (firstBasis.clone().cross(secondBasis).dot(direction) < 0) {
      secondBasis.negate();
    }

    const arrow = new Group();
    const axisIndex = axisDefinitions.indexOf(axisDefinition);
    const angleDirection = rotationArrowDirection === "clockwise" ? -1 : 1;

    arrow.userData.color = color;
    arrow.userData.index = axisIndex;

    function addCircularArrow(startAngle, endAngle, segments = 18) {
      const points = [];

      for (let index = 0; index <= segments; index += 1) {
        const angle = startAngle + ((endAngle - startAngle) * index) / segments;
        const point = firstBasis
          .clone()
          .multiplyScalar(Math.cos(angle) * rotationArrowRadius)
          .add(
            secondBasis
              .clone()
              .multiplyScalar(Math.sin(angle) * rotationArrowRadius),
          );

        points.push(point);
      }

      const line = new Mesh(
        new TubeGeometry(
          new CatmullRomCurve3(points, false, "centripetal"),
          segments,
          rotationArrowThickness / 2,
          8,
          false,
        ),
        new MeshBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false,
        }),
      );
      line.renderOrder = 20;

      const arrowPosition = points.at(-1);
      const previousPoint = points.at(-2);
      const arrowDirection = arrowPosition
        .clone()
        .sub(previousPoint)
        .normalize();
      const arrowhead = new ArrowHelper(
        arrowDirection,
        arrowPosition,
        rotationArrowThickness * 10,
        color,
        rotationArrowThickness * 6,
        rotationArrowThickness * 4,
      );
      arrowhead.renderOrder = 20;

      arrow.add(line, arrowhead);
    }

    addCircularArrow(Math.PI * 0.82, Math.PI * (0.82 + angleDirection * 0.74));
    addCircularArrow(
      -Math.PI * 0.18,
      Math.PI * (-0.18 + angleDirection * 0.74),
    );

    arrow.position
      .copy(axisDefinition.direction)
      .multiplyScalar(rotationArrowDepth);
    return arrow;
  }

  function setDepthTest(root, depthTest) {
    root.traverse((object) => {
      if (object.material) {
        object.material.depthTest = depthTest;
        object.material.needsUpdate = true;
      }
    });
  }

  function refreshRotationArrows() {
    rotationArrowGroup.clear();
    axisDefinitions.forEach((axisDefinition, index) => {
      const arrow = createRotationArrow(
        axisDefinition,
        rotationArrowColors[index],
      );

      arrow.visible = rotationArrowVisibility[index];
      rotationArrowGroup.add(arrow);
    });
    setRotationArrowsDepthTest(rotationArrowsDepthTest);
  }

  function updateAxisGroupVisibility() {
    axisGroup.visible = axisLabelsGroupVisible || axisArrowsGroupVisible;
  }

  axisDefinitions.forEach(createAxisArrow);
  axisGroup.visible = false;
  scene.add(axisGroup);

  axisDefinitions.forEach((axisDefinition, index) => {
    const arrow = createRotationArrow(
      axisDefinition,
      rotationArrowColors[index],
    );

    arrow.visible = rotationArrowVisibility[index];
    rotationArrowGroup.add(arrow);
  });
  rotationArrowGroup.visible = false;
  scene.add(rotationArrowGroup);

  function setAxisLabelColor(index, color) {
    const label = axisLabels[index];
    const context = label.userData.context;
    const canvas = label.userData.canvas;

    axisLabelColors[index] = color;
    label.userData.labelColor = color;
    context.fillStyle = color;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const labelText = getAxisLabelText(label.userData.axisDefinition);

    context.strokeText(labelText, canvas.width / 2, canvas.height / 2);
    context.fillText(labelText, canvas.width / 2, canvas.height / 2);
    label.material.map.needsUpdate = true;
  }

  function setRotationArrowColor(index, color) {
    const arrow = rotationArrowGroup.children[index];

    rotationArrowColors[index] = color;
    arrow.userData.color = color;
    arrow.traverse((object) => {
      if (object.material?.color) {
        object.material.color.set(color);
      }
    });
  }

  function setAxisLabelText(index, labelText) {
    const label = axisLabels[index];
    const context = label.userData.context;
    const canvas = label.userData.canvas;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = label.userData.labelColor;
    context.strokeText(labelText, canvas.width / 2, canvas.height / 2);
    context.fillText(labelText, canvas.width / 2, canvas.height / 2);
    label.material.map.needsUpdate = true;
  }

  function setAxisLabelVisible(index, visible) {
    axisLabels[index].visible = visible;
  }

  function setAxisArrowVisible(index, visible) {
    axisArrows[index].visible = visible;
  }

  function setRotationArrowVisible(index, visible) {
    rotationArrowVisibility[index] = visible;
    rotationArrowGroup.children[index].visible = visible;
  }

  function setAxisLabelGroupVisible(visible) {
    axisLabelsGroupVisible = visible;
    updateAxisGroupVisibility();
  }

  function setAxisArrowGroupVisible(visible) {
    axisArrowsGroupVisible = visible;
    updateAxisGroupVisibility();
  }

  function setRotationArrowGroupVisible(visible) {
    rotationArrowGroup.visible = visible;
  }

  function setAxisLabelsDepthTest(depthTest) {
    for (const label of axisLabels) {
      setDepthTest(label, depthTest);
    }
  }

  function setAxisArrowsDepthTest(depthTest) {
    for (const arrow of axisArrows) {
      setDepthTest(arrow, depthTest);
    }
  }

  function setRotationArrowsDepthTest(depthTest) {
    rotationArrowsDepthTest = depthTest;

    for (const arrow of rotationArrowGroup.children) {
      setDepthTest(arrow, depthTest);
    }
  }

  function setAxisDepth(depth) {
    axisDepth = depth;

    axisArrows.forEach((arrow, index) => {
      arrow.position
        .copy(axisDefinitions[index].direction)
        .multiplyScalar(axisDepth);
    });
  }

  function setAxisLabelDepth(depth) {
    axisLabelDepth = depth;

    for (const [index, axisDefinition] of axisDefinitions.entries()) {
      axisDefinition.depth = axisLabelDepth;
      axisLabels[index].position
        .copy(axisDefinition.direction)
        .multiplyScalar(axisLength + axisLabelDepth);
    }
  }

  function setRotationArrowDepth(depth) {
    rotationArrowDepth = depth;

    for (const [index, axisDefinition] of axisDefinitions.entries()) {
      rotationArrowGroup.children[index].position
        .copy(axisDefinition.direction)
        .multiplyScalar(rotationArrowDepth);
    }
  }

  function setRotationArrowDirection(direction) {
    rotationArrowDirection = direction;
    refreshRotationArrows();
  }

  function setRotationArrowThickness(thickness) {
    rotationArrowThickness = thickness;
    refreshRotationArrows();
  }

  function setRotationArrowRadius(radius) {
    rotationArrowRadius = radius;
    refreshRotationArrows();
  }

  function setScale(size) {
    const scale = Math.max(size * 2.4, 1.5);

    axisGroup.scale.setScalar(scale);
    rotationArrowGroup.scale.setScalar(scale);
  }

  setAxisDepth(axisDepth);
  setAxisLabelDepth(axisLabelDepth);
  setRotationArrowDepth(rotationArrowDepth);
  setScale(initialSize);

  return {
    getAxisGroup: () => axisGroup,
    getRotationArrowGroup: () => rotationArrowGroup,
    getAxisLabelColor: (index) => axisLabelColors[index],
    setAxisLabelColor,
    getRotationArrowColor: (index) => rotationArrowColors[index],
    setRotationArrowColor,
    setAxisLabelText,
    setAxisLabelVisible,
    setAxisArrowVisible,
    setRotationArrowVisible,
    setAxisLabelGroupVisible,
    setAxisArrowGroupVisible,
    setRotationArrowGroupVisible,
    setAxisLabelsDepthTest,
    setAxisArrowsDepthTest,
    setRotationArrowsDepthTest,
    setAxisDepth,
    setAxisLabelDepth,
    setRotationArrowDepth,
    setRotationArrowDirection,
    setRotationArrowThickness,
    setRotationArrowRadius,
    setScale,
  };
}
