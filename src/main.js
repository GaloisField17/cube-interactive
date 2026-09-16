import { BoxGeometry, Group, MathUtils, Mesh, MeshBasicMaterial } from "three";
import { DEFAULT_COLORS, DEFAULT_GAP, DEFAULT_SIZE } from "./cubeConfig.js";
import {
  cloneVector,
  getFaceFromNormal,
  normalizeAngle,
  rotateVector,
} from "./cubeMath.js";
import {
  createFaceDefinitions,
  createSticker,
  MATERIAL_INDEX_BY_FACE,
} from "./faceDefinitions.js";
import "./responsive.css";
import { FACE_ROTATIONS, ROTATIONS } from "./rotationDefinitions.js";
import { createScene } from "./sceneSetup.js";
import { createUI } from "./ui.js";

const { scene, camera, renderer, controls, resize } = createScene();

// ============================================================
// Cube colors
// ============================================================

const colors = { ...DEFAULT_COLORS };
const defaultColors = { ...DEFAULT_COLORS };

// ============================================================
// Cube settings
// ============================================================

const defaultSize = DEFAULT_SIZE;
const defaultGap = DEFAULT_GAP;

let size = defaultSize;
let gap = defaultGap;

// ============================================================
// Cube state
// ============================================================
//
// Every cubie has:
//
// position:
//   Its current logical position.
//
// stickers:
//   The physical stickers belonging to that cubie.
//
// A sticker has:
//
//   color
//   normal
//
// "normal" describes which direction the sticker is currently
// facing.
//
// Example:
//
//   normal = { x: 0, y: 1, z: 0 }
//
// means the sticker is currently facing U.
//
// This means sticker orientation is part of the cube state.
// ============================================================

const cubies = [];

// ============================================================
// Face definitions
// ============================================================

const FACE_DEFINITIONS = createFaceDefinitions(colors);

// ============================================================
// Create one cubie
// ============================================================

function createCubie(x, y, z) {
  const cubieSize = Math.max(0, size - gap);

  const materials = Array.from(
    { length: Object.keys(MATERIAL_INDEX_BY_FACE).length },
    () => new MeshBasicMaterial({ color: colors.inner }),
  );

  const geometry = new BoxGeometry(cubieSize, cubieSize, cubieSize);

  const cubie = new Mesh(geometry, materials);

  cubie.position.set(x * size, y * size, z * size);

  // ----------------------------------------------------------
  // Logical position
  // ----------------------------------------------------------

  cubie.userData.x = x;
  cubie.userData.y = y;
  cubie.userData.z = z;

  cubie.userData.originalX = x;
  cubie.userData.originalY = y;
  cubie.userData.originalZ = z;
  cubie.userData.innerColor = colors.inner;
  cubie.userData.size = size;
  cubie.userData.gap = gap;

  // ----------------------------------------------------------
  // Physical stickers
  // ----------------------------------------------------------

  cubie.userData.stickers = [];

  const position = { x, y, z };

  for (const [face, definition] of Object.entries(FACE_DEFINITIONS)) {
    if (position[definition.axis] === definition.value) {
      cubie.userData.stickers.push(createSticker(face, FACE_DEFINITIONS));
    }
  }

  updateCubieMaterials(cubie);

  scene.add(cubie);

  cubies.push(cubie);

  return cubie;
}

// ============================================================
// Create all 27 cubies
// ============================================================

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      createCubie(x, y, z);
    }
  }
}

// ============================================================
// Update Three.js materials from logical sticker state
// ============================================================
//
// Material order:
//
// 0 = +X = Right
// 1 = -X = Left
// 2 = +Y = Up
// 3 = -Y = Down
// 4 = +Z = Front
// 5 = -Z = Back
//
// The important difference from the old implementation:
//
// Materials are NOT treated as permanent stickers.
//
// Instead, every time the logical sticker orientation changes,
// the materials are rebuilt from the current sticker state.
// ============================================================

function updateCubieMaterials(cubie) {
  const materials = cubie.material;

  for (const material of materials) {
    material.color.set(cubie.userData.innerColor);
  }

  for (const sticker of cubie.userData.stickers) {
    const face = getFaceFromNormal(sticker.normal);

    if (!face) {
      continue;
    }

    const materialIndex = MATERIAL_INDEX_BY_FACE[face];

    if (materialIndex === undefined) {
      continue;
    }

    materials[materialIndex].color.set(sticker.color);
  }
}

// ============================================================
// Facelets
// ============================================================
//
// This array is kept for compatibility with the UI.
//
// Each entry refers to a physical sticker, rather than assuming
// that a particular material index is permanently a particular
// sticker.
// ============================================================

const facelets = [];

function rebuildFacelets() {
  facelets.length = 0;

  for (const cubie of cubies) {
    for (const sticker of cubie.userData.stickers) {
      const currentFace = getFaceFromNormal(sticker.normal);

      if (!currentFace) {
        continue;
      }

      facelets.push({
        name: `${sticker.face}`,
        face: currentFace,
        cubie,
        sticker,
        materialIndex: MATERIAL_INDEX_BY_FACE[currentFace],
      });
    }
  }
}

rebuildFacelets();

// ============================================================
// Get rotation definition
// ============================================================

function getRotationDefinition(move) {
  return ROTATIONS[move] ?? null;
}

// ============================================================
// Update logical state after rotation
// ============================================================

function updateCubieLogicalState(cubie, axis, angle) {
  const currentPosition = {
    x: cubie.userData.x,
    y: cubie.userData.y,
    z: cubie.userData.z,
  };

  const newPosition = rotateVector(currentPosition, axis, angle);

  cubie.userData.x = newPosition.x;
  cubie.userData.y = newPosition.y;
  cubie.userData.z = newPosition.z;

  // ----------------------------------------------------------
  // Rotate every physical sticker orientation
  // ----------------------------------------------------------

  for (const sticker of cubie.userData.stickers) {
    sticker.normal = rotateVector(sticker.normal, axis, angle);
  }

  cubie.rotation.set(0, 0, 0);

  // ----------------------------------------------------------
  // Update visual position
  // ----------------------------------------------------------

  cubie.position.set(
    newPosition.x * size,
    newPosition.y * size,
    newPosition.z * size,
  );

  // ----------------------------------------------------------
  // Rebuild materials from logical sticker state
  // ----------------------------------------------------------

  updateCubieMaterials(cubie);
}

function isExactQuarterTurn(angle) {
  return Math.abs(angle % 90) < Number.EPSILON;
}

// ============================================================
// Rotation lock
// ============================================================

let rotating = false;
const rotationQueue = [];
let processingRotationQueue = false;

function enqueueRotation(
  axis,
  layers,
  angleDegrees,
  duration,
  updateLogicalState,
) {
  return new Promise((resolve) => {
    rotationQueue.push({
      axis,
      layers,
      angleDegrees,
      duration,
      updateLogicalState,
      resolve,
    });

    processRotationQueue();
  });
}

async function processRotationQueue() {
  if (processingRotationQueue) {
    return;
  }

  processingRotationQueue = true;

  while (rotationQueue.length > 0) {
    const rotation = rotationQueue.shift();

    await performRotation(
      rotation.axis,
      rotation.layers,
      rotation.angleDegrees,
      rotation.duration,
      rotation.updateLogicalState,
    );

    rotation.resolve(true);

    if (animationDuration.stopAfterCurrent) {
      const canceledRotations = rotationQueue.splice(0);

      for (const canceledRotation of canceledRotations) {
        canceledRotation.resolve(false);
      }

      animationDuration.stopAfterCurrent = false;
      break;
    }
  }

  processingRotationQueue = false;
}

// ============================================================
// Face-based cube orientation
// ============================================================
//
// This is the cleaner public API for the cube engine.
// It explicitly takes the face to rotate and the requested angle.
// ============================================================

function getFaceRotation(face) {
  return FACE_ROTATIONS[face] ?? null;
}

function orientCube(face, angleDegrees, duration = 0) {
  const definition = getFaceRotation(face);

  if (!definition) {
    console.warn(`Unknown face orientation: ${face}`);
    return Promise.resolve();
  }

  return enqueueRotation(
    definition.axis,
    definition.layers,
    normalizeAngle(angleDegrees),
    duration,
    true,
  );
}

// ============================================================
// Rotate standardized move
// ============================================================
//
// This function accepts either:
//
//   rotateMove("R", duration)
//
// or, for temporary compatibility with the current UI:
//
//   rotateSlice("R", 90, duration)
//
// The second form will be removed later.
// ============================================================

function rotateMove(moveName, duration = 0) {
  const definition = getRotationDefinition(moveName);

  if (!definition) {
    console.warn(`Unknown rotation: ${moveName}`);
    return Promise.resolve();
  }

  return enqueueRotation(
    definition.axis,
    definition.layers,
    definition.angle,
    duration,
    true,
  );
}

// ============================================================
// Rotation engine
// ============================================================

function performRotation(
  axis,
  layers,
  angleDegrees,
  duration = 0,
  updateLogicalState = true,
) {
  const normalizedAngle = normalizeAngle(angleDegrees);

  if (normalizedAngle === 0) {
    return Promise.resolve();
  }

  // ----------------------------------------------------------
  // Find affected cubies
  // ----------------------------------------------------------

  const slice = cubies.filter((cubie) => layers.includes(cubie.userData[axis]));

  if (slice.length === 0) {
    return Promise.resolve();
  }

  // ----------------------------------------------------------
  // Create temporary visual rotation group
  // ----------------------------------------------------------

  const group = new Group();

  scene.add(group);

  for (const cubie of slice) {
    group.attach(cubie);
  }

  rotating = true;

  let start = performance.now();

  const targetAngle = MathUtils.degToRad(normalizedAngle);

  return new Promise((resolve) => {
    function animateRotation(time) {
      if (duration.paused) {
        requestAnimationFrame(animateRotation);
        return;
      }

      if (
        duration.pauseStartedAt !== null &&
        duration.pauseStartedAt !== undefined
      ) {
        start += time - duration.pauseStartedAt;
        duration.pauseStartedAt = null;
      }

      const elapsed = time - start;
      const currentDuration =
        typeof duration === "object" ? duration.value : duration;

      const progress =
        currentDuration === 0 ? 1 : Math.min(elapsed / currentDuration, 1);

      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      group.rotation[axis] = targetAngle * eased;

      if (progress < 1) {
        requestAnimationFrame(animateRotation);
        return;
      }

      // ------------------------------------------------------
      // Detach cubies
      // ------------------------------------------------------

      for (const cubie of slice) {
        scene.attach(cubie);
      }

      scene.remove(group);

      if (updateLogicalState && isExactQuarterTurn(normalizedAngle)) {
        // ----------------------------------------------------
        // Update logical cube state
        // ----------------------------------------------------

        for (const cubie of slice) {
          updateCubieLogicalState(cubie, axis, normalizedAngle);
        }

        // ----------------------------------------------------
        // Rebuild facelet references
        // ----------------------------------------------------

        rebuildFacelets();
      }

      rotating = false;

      resolve();
    }

    requestAnimationFrame(animateRotation);
  });
}

// ============================================================
// Temporary compatibility wrapper
// ============================================================
//
// Current UI calls:
//
//   rotateSlice(slice, angle, duration)
//
// Keep this working while the UI is being migrated.
//
// If the requested angle corresponds to a standardized move,
// we use the standardized definition.
//
// Otherwise we perform the same axis/layer operation directly.
// ============================================================

function rotateSlice(
  sliceName,
  angleDegrees,
  duration = 0,
  updateLogicalState = true,
) {
  const definition = getRotationDefinition(sliceName);

  if (definition) {
    // --------------------------------------------------------
    // Standard move. Use the actual requested angle from the UI,
    // not the default angle from the notation table, so custom
    // slice rotations stay consistent with the current state.
    // --------------------------------------------------------

    return enqueueRotation(
      definition.axis,
      definition.layers,
      normalizeAngle(angleDegrees),
      duration,
      updateLogicalState,
    );
  }

  const faceDefinition = getFaceRotation(sliceName);

  if (faceDefinition) {
    return enqueueRotation(
      faceDefinition.axis,
      faceDefinition.layers,
      normalizeAngle(angleDegrees),
      duration,
      updateLogicalState,
    );
  }

  console.warn(`Unknown slice: ${sliceName}`);

  return Promise.resolve();
}

// ============================================================
// Reset cube
// ============================================================

function resetCube() {
  if (rotating) {
    return;
  }

  for (const cubie of cubies) {
    const x = cubie.userData.originalX;
    const y = cubie.userData.originalY;
    const z = cubie.userData.originalZ;

    cubie.userData.x = x;
    cubie.userData.y = y;
    cubie.userData.z = z;

    cubie.position.set(x * size, y * size, z * size);

    // --------------------------------------------------------
    // Restore original sticker orientations/colors
    // --------------------------------------------------------

    for (const sticker of cubie.userData.stickers) {
      sticker.normal = cloneVector(FACE_DEFINITIONS[sticker.face].normal);

      sticker.color = FACE_DEFINITIONS[sticker.face].color;
    }

    cubie.userData.innerColor = colors.inner;

    cubie.rotation.set(0, 0, 0);

    updateCubieMaterials(cubie);
  }

  rebuildFacelets();
}

function resetCubeOrientation() {
  if (rotating) {
    return;
  }

  for (const cubie of cubies) {
    const x = cubie.userData.originalX;
    const y = cubie.userData.originalY;
    const z = cubie.userData.originalZ;

    cubie.userData.x = x;
    cubie.userData.y = y;
    cubie.userData.z = z;

    cubie.position.set(x * size, y * size, z * size);

    for (const sticker of cubie.userData.stickers) {
      sticker.normal = cloneVector(FACE_DEFINITIONS[sticker.face].normal);
    }

    cubie.rotation.set(0, 0, 0);

    updateCubieMaterials(cubie);
  }

  rebuildFacelets();
}

function resetVisualRotations() {
  if (rotating) {
    return;
  }

  for (const cubie of cubies) {
    cubie.position.set(
      cubie.userData.x * size,
      cubie.userData.y * size,
      cubie.userData.z * size,
    );

    cubie.rotation.set(0, 0, 0);
  }
}

// ============================================================
// Update cube dimensions
// ============================================================

function updateCubeDimensions(
  nextSize = size,
  nextGap = gap,
  dimensions = null,
) {
  const previousSize = size;

  size = nextSize;
  gap = nextGap;

  const positionScale = previousSize === 0 ? null : size / previousSize;

  for (const cubie of cubies) {
    const dimension = dimensions?.get(cubie) ?? { size, gap };

    cubie.userData.size = dimension.size;
    cubie.userData.gap = dimension.gap;

    cubie.geometry.dispose();

    const cubieSize = Math.max(0, dimension.size - dimension.gap);

    cubie.geometry = new BoxGeometry(cubieSize, cubieSize, cubieSize);

    if (positionScale === null) {
      cubie.position.set(
        cubie.userData.x * size,
        cubie.userData.y * size,
        cubie.userData.z * size,
      );
    } else {
      cubie.position.multiplyScalar(positionScale);
    }
  }
}

// ============================================================
// UI
// ============================================================

const animationDuration = {
  value: 1000,
  paused: false,
  pauseStartedAt: null,
  stopAfterCurrent: false,
};

createUI({
  scene,
  camera,
  controls,
  cubies,
  facelets,
  colors,
  defaultColors,
  defaultSize,
  defaultGap,
  durationState: animationDuration,

  rotateSlice,
  rotateMove,
  orientCube,

  getRotationDefinition,
  resetCube,
  resetCubeOrientation,
  resetVisualRotations,

  updateCubeDimensions,

  get size() {
    return size;
  },

  set size(value) {
    size = value;
  },

  get gap() {
    return gap;
  },

  set gap(value) {
    gap = value;
  },

  normalizeAngle,
});

// ============================================================
// Animation loop
// ============================================================

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);
}

animate();

// ============================================================
// Resize
// ============================================================

window.addEventListener("resize", () => {
  resize();
});

window.addEventListener("orientationchange", resize);
window.visualViewport?.addEventListener("resize", resize);
