import { Vector3 } from "three";

const FACE_CELLS = ["U", "D", "L", "R", "F", "B"];
const VISIBLE_FACES = [
  [
    "R",
    0,
    [
      [1, -1, -1],
      [1, -1, 1],
      [1, 1, 1],
      [1, 1, -1],
    ],
  ],
  [
    "L",
    1,
    [
      [-1, -1, 1],
      [-1, -1, -1],
      [-1, 1, -1],
      [-1, 1, 1],
    ],
  ],
  [
    "U",
    2,
    [
      [-1, 1, -1],
      [1, 1, -1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  ],
  [
    "D",
    3,
    [
      [-1, -1, 1],
      [1, -1, 1],
      [1, -1, -1],
      [-1, -1, -1],
    ],
  ],
  [
    "F",
    4,
    [
      [-1, -1, 1],
      [-1, 1, 1],
      [1, 1, 1],
      [1, -1, 1],
    ],
  ],
  [
    "B",
    5,
    [
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, -1],
    ],
  ],
];

function escapeSvgText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createSvg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
}

function getStickerColor(cubie, face) {
  const sticker = cubie.userData.stickers.find((item) => {
    const normal = item.normal;

    return (
      (face === "R" && normal.x === 1) ||
      (face === "L" && normal.x === -1) ||
      (face === "U" && normal.y === 1) ||
      (face === "D" && normal.y === -1) ||
      (face === "F" && normal.z === 1) ||
      (face === "B" && normal.z === -1)
    );
  });

  return sticker?.color ?? "#222";
}

function createVisibleViewSvg({
  camera,
  cubies,
  size,
  gap,
  width = 800,
  height = 600,
}) {
  const half = Math.max(0, size - gap) / 2;
  const polygons = [];

  camera.updateMatrixWorld();

  for (const cubie of cubies) {
    cubie.updateWorldMatrix(true, false);

    for (const [face, materialIndex, normalizedCorners] of VISIBLE_FACES) {
      const corners = normalizedCorners.map(([x, y, z]) => [
        x * half,
        y * half,
        z * half,
      ]);
      const projected = corners.map((corner) => {
        const point = new Vector3(...corner)
          .applyMatrix4(cubie.matrixWorld)
          .project(camera);

        return {
          x: (point.x + 1) * 0.5 * width,
          y: (1 - point.y) * 0.5 * height,
          z: point.z,
        };
      });

      const depth = projected.reduce((sum, point) => sum + point.z, 0) / 4;
      const points = projected
        .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(" ");
      const color = cubie.material[materialIndex]?.color.getStyle() ?? "#222";

      polygons.push({
        depth,
        svg: `<polygon points="${points}" fill="${escapeSvgText(color)}" stroke="#111" stroke-width="1"/>`,
      });
    }
  }

  polygons.sort((a, b) => b.depth - a.depth);

  return createSvg(
    width,
    height,
    `<rect width="100%" height="100%" fill="#e5e5e5"/>${polygons.map((item) => item.svg).join("")}`,
  );
}

function createFlatCubieSvg(cubies) {
  const cell = 92;
  const width = cell * 9;
  const height = cell * 3;
  let content = `<rect width="100%" height="100%" fill="#e5e5e5"/>`;

  cubies.forEach((cubie, index) => {
    const column = index % 9;
    const row = Math.floor(index / 9);
    const x = column * cell + 6;
    const y = row * cell + 6;
    const tile = cell - 12;

    content += `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" fill="#222" stroke="#111"/>`;

    FACE_CELLS.forEach((face, faceIndex) => {
      const faceX = x + (faceIndex % 3) * (tile / 3);
      const faceY = y + Math.floor(faceIndex / 3) * (tile / 2);

      content += `<rect x="${faceX}" y="${faceY}" width="${tile / 3}" height="${tile / 2}" fill="${escapeSvgText(getStickerColor(cubie, face))}" stroke="#111" stroke-width="0.5"/>`;
    });

    content += `<text x="${x + 4}" y="${y + tile - 4}" font-size="9" fill="#fff">${cubie.userData.x},${cubie.userData.y},${cubie.userData.z}</text>`;
  });

  return createSvg(width, height, content);
}

function createLogicalStateSvg(cubies) {
  const cell = 36;
  const faceSize = cell * 3;
  const width = faceSize * 4;
  const height = faceSize * 3;
  const facePositions = {
    U: [faceSize, 0],
    L: [0, faceSize],
    F: [faceSize, faceSize],
    R: [faceSize * 2, faceSize],
    B: [faceSize * 3, faceSize],
    D: [faceSize, faceSize * 2],
  };
  let content = `<rect width="100%" height="100%" fill="#e5e5e5"/>`;

  for (const [face, [originX, originY]] of Object.entries(facePositions)) {
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        const cubie = cubies.find((item) => {
          const { x, y, z } = item.userData;

          if (face === "F" || face === "B") {
            return (
              z === (face === "F" ? 1 : -1) && y === 1 - row && x === column - 1
            );
          }

          if (face === "R" || face === "L") {
            return (
              x === (face === "R" ? 1 : -1) &&
              y === 1 - row &&
              z === (face === "R" ? 1 - column : column - 1)
            );
          }

          return (
            y === (face === "U" ? 1 : -1) &&
            z === (face === "U" ? column - 1 : 1 - column) &&
            x === column - 1
          );
        });
        const color = cubie ? getStickerColor(cubie, face) : "#222";
        const x = originX + column * cell;
        const y = originY + row * cell;

        content += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${escapeSvgText(color)}" stroke="#111"/>`;
      }
    }
  }

  return createSvg(width, height, content);
}

export function createSvgArchive({ camera, cubies, getSize, getGap }) {
  return async function exportSvgArchive() {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const appWidth = Math.max(1, window.innerWidth);
    const appHeight = Math.max(1, window.innerHeight);
    const size = getSize();
    const gap = getGap();
    const viewOptions = { camera, cubies, size, gap };

    zip.file("cube-interactive-visible-view.svg", createVisibleViewSvg(viewOptions));
    zip.file(
      "cube-interactive-app-view.svg",
      createVisibleViewSvg({
        ...viewOptions,
        width: appWidth,
        height: appHeight,
      }),
    );
    zip.file("cube-interactive-flat-cubies.svg", createFlatCubieSvg(cubies));
    zip.file("cube-interactive-logical-state.svg", createLogicalStateSvg(cubies));

    const archive = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(archive);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cube-interactive-svg-export.zip";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
}
