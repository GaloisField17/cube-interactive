import assert from "node:assert/strict";
import test from "node:test";
import { createJsonExport } from "../src/jsonExport.js";
import { createDefaultSetup } from "../src/setupDefaults.js";
import {
  mergeImportedValues,
  validateImportedDocument,
} from "../src/setupDocument.js";

const DEFAULT_SETUP = {
  cube: {
    size: 1,
    gap: 0.035,
    cubies: {
      solved: {
        position: { x: 0, y: 0, z: 0 },
        innerColor: "#222",
        facelets: { F: { normal: { x: 0, y: 0, z: 1 }, color: "red" } },
      },
    },
  },
  view: {
    cameraPosition: { x: 5, y: 5, z: 7 },
    target: { x: 0, y: 0, z: 0 },
    ghostStickersVisibility: "always-visible",
    peekStickersVisibility: "always-visible",
    peekStickersDepth: 0.2,
    peekStickersHideWhenColor: "",
  },
  rotations: { moves: [], text: "", durationSeconds: 1 },
  colors: {
    faceletLabels: { F: "#111" },
    axisLabels: { R: "#0d0" },
    rotationArrows: { R: "#0d0" },
  },
  labels: {
    facelets: false,
    faceletVisibility: "always-visible",
    axisLabels: false,
    axisLabelVisibility: "always-visible",
    axisLabelMode: "face",
    axisLabelDepth: 0.25,
    axisLabelsByFace: { R: { visible: false, customText: "R" } },
    axisArrows: false,
    axisArrowVisibility: "hidden-behind-cube",
    axisDepth: 0,
    axisArrowsByFace: { R: { visible: false } },
    rotationArrows: false,
    rotationArrowVisibility: "always-visible",
    rotationArrowDepth: 0.65,
    rotationArrowThickness: 0.015,
    rotationArrowRadius: 0.5,
    rotationArrowDirection: "clockwise",
    rotationArrowsByFace: { R: { visible: false } },
    labelDepth: 0.25,
  },
};

function createTestDefaultSetup() {
  return createDefaultSetup({
    getDefaultCubeState: () => ({ size: 1, gap: 0.035, cubies: {} }),
    getDefaultCameraView: () => ({
      cameraPosition: { x: 4, y: 6, z: 8 },
      target: { x: 1, y: 2, z: 3 },
    }),
    faceletIds: ["F", "R"],
    axisFaces: ["R", "U"],
    defaultFaceletLabelColor: "#111",
    defaultFaceColors: { R: "#f00", U: "#fff" },
  });
}

function makeDocument(setup = {}, overrides = {}) {
  return {
    version: 1,
    exportedAt: "2026-09-23T12:34:56Z",
    setup,
    ...overrides,
  };
}

test("default setup factory returns complete independent defaults", () => {
  const first = createTestDefaultSetup();
  const second = createTestDefaultSetup();

  assert.deepEqual(first.view, {
    cameraPosition: { x: 4, y: 6, z: 8 },
    target: { x: 1, y: 2, z: 3 },
    ghostStickersVisibility: "always-visible",
    peekStickersVisibility: "always-visible",
    peekStickersDepth: 0.2,
    peekStickersHideWhenColor: "",
  });
  assert.deepEqual(first.colors.faceletLabels, { F: "#111", R: "#111" });
  assert.deepEqual(first.labels.axisLabelsByFace, {
    R: { visible: false, customText: "R" },
    U: { visible: false, customText: "U" },
  });
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.view, second.view);
  assert.notStrictEqual(
    first.labels.axisLabelsByFace,
    second.labels.axisLabelsByFace,
  );

  first.view.peekStickersDepth = 1.5;
  assert.equal(second.view.peekStickersDepth, 0.2);
});

test("valid document accepts all supported setup sections", () => {
  const setup = {
    cube: {
      size: 1.5,
      gap: 0.04,
      cubies: {
        solved: {
          position: { x: 1, y: 0, z: -1 },
          innerColor: "#333",
          size: 1.25,
          gap: 0.02,
          facelets: { F: { normal: { x: 0, y: 0, z: 1 }, color: "blue" } },
        },
      },
    },
    view: {
      cameraPosition: { x: 4, y: 5, z: 6 },
      target: { x: 0, y: 1, z: 0 },
      ghostStickersVisibility: "hidden-behind-cube",
      peekStickersVisibility: "hidden-behind-cube",
      peekStickersDepth: 0.75,
      peekStickersHideWhenColor: "#f00",
    },
    rotations: { moves: ["R", "U'"], text: "R U'", durationSeconds: 0.5 },
    colors: {
      faceletLabels: { F: "white" },
      axisLabels: { R: "green" },
      rotationArrows: { R: "blue" },
    },
    labels: {
      facelets: true,
      faceletVisibility: "hidden-behind-cube",
      axisLabels: true,
      axisLabelVisibility: "always-visible",
      axisLabelMode: "coordinate",
      axisLabelDepth: 0.3,
      axisLabelsByFace: { R: { visible: true, customText: "Right" } },
      axisArrows: true,
      axisArrowVisibility: "hidden-behind-cube",
      axisDepth: 0.1,
      axisArrowsByFace: { R: { visible: true } },
      rotationArrows: true,
      rotationArrowVisibility: "always-visible",
      rotationArrowDepth: 0.7,
      rotationArrowThickness: 0.02,
      rotationArrowRadius: 0.6,
      rotationArrowDirection: "counter-clockwise",
      rotationArrowsByFace: { R: { visible: true } },
      labelDepth: 0.4,
    },
  };

  assert.deepEqual(
    validateImportedDocument(makeDocument(setup, { version: 2 })),
    setup,
  );
});

test("version 1 documents remain valid without per-cubie dimensions", () => {
  const setup = {
    cube: {
      cubies: { solved: { position: { x: 1 }, innerColor: "#333" } },
    },
  };

  assert.deepEqual(validateImportedDocument(makeDocument(setup)), setup);
});

test("missing optional properties merge recursively with defaults", () => {
  const setup = {
    cube: {
      cubies: {
        solved: { position: { x: 2 } },
        "custom-piece": { position: { y: -1 } },
      },
    },
    view: { target: { y: 3 } },
    rotations: { moves: ["R"], text: "", durationSeconds: 0 },
    labels: { axisLabelsByFace: { R: { visible: true, customText: "" } } },
  };
  const expected = structuredClone(DEFAULT_SETUP);

  expected.cube.cubies.solved.position.x = 2;
  expected.cube.cubies["custom-piece"] = { position: { y: -1 } };
  expected.view.target.y = 3;
  expected.rotations = { moves: ["R"], text: "", durationSeconds: 0 };
  expected.labels.axisLabelsByFace.R = { visible: true, customText: "" };

  assert.deepEqual(
    mergeImportedValues(
      DEFAULT_SETUP,
      validateImportedDocument(makeDocument(setup)),
    ),
    expected,
  );
});

test("export retains changed Ghost and Peek settings", () => {
  const setup = structuredClone(DEFAULT_SETUP);

  setup.view.ghostStickersVisibility = "hidden-behind-cube";
  setup.view.peekStickersVisibility = "hidden-behind-cube";
  setup.view.peekStickersDepth = 0.75;
  setup.view.peekStickersHideWhenColor = "#f00";

  const exported = createJsonExport(
    setup,
    DEFAULT_SETUP,
    new Date("2026-09-23T12:34:56.000Z"),
  );

  assert.deepEqual(exported.setup.view, {
    ghostStickersVisibility: "hidden-behind-cube",
    peekStickersVisibility: "hidden-behind-cube",
    peekStickersDepth: 0.75,
    peekStickersHideWhenColor: "#f00",
  });
});

test("export retains per-cubie dimension overrides", () => {
  const setup = structuredClone(DEFAULT_SETUP);

  setup.cube.cubies.solved.size = 1.25;
  setup.cube.cubies.solved.gap = 0.02;

  const exported = createJsonExport(
    setup,
    DEFAULT_SETUP,
    new Date("2026-09-23T12:34:56.000Z"),
  );

  assert.equal(exported.version, 2);
  assert.deepEqual(exported.setup.cube.cubies.solved, {
    size: 1.25,
    gap: 0.02,
  });
});

test("date-only timestamps and arbitrary entity IDs remain accepted", () => {
  const setup = {
    cube: { cubies: { "custom-id": { position: { x: 0 } } } },
  };

  assert.deepEqual(
    mergeImportedValues(
      DEFAULT_SETUP,
      validateImportedDocument(
        makeDocument(setup, { exportedAt: "2026-09-23" }),
      ),
    ).cube.cubies["custom-id"],
    { position: { x: 0 } },
  );
});

test("invalid documents and malformed values retain validation errors", () => {
  const invalidDocuments = [
    [[], "The imported value must be a JSON object."],
    [{ ...makeDocument(), extra: true }, "document.extra is not supported."],
    [makeDocument({}, { version: 3 }), "Unsupported setup version: 3."],
    [
      makeDocument({}, { exportedAt: "not a date" }),
      "exportedAt must be a valid UTC timestamp.",
    ],
    [
      { version: 1, exportedAt: "2026-09-23T12:34:56Z" },
      "setup must be an object.",
    ],
    [makeDocument({ view: null }), "setup.view must be an object."],
    [
      makeDocument({ view: { peekStickersVisibility: "sometimes" } }),
      "setup.view.peekStickersVisibility is invalid.",
    ],
    [
      makeDocument({ view: { peekStickersDepth: -0.1 } }),
      "setup.view.peekStickersDepth must be a valid number.",
    ],
    [
      makeDocument({ view: { peekStickersHideWhenColor: 7 } }),
      "setup.view.peekStickersHideWhenColor must be a string.",
    ],
    [
      makeDocument({ view: { target: { x: Infinity } } }),
      "setup.view.target.x must be a valid number.",
    ],
    [makeDocument({ cube: { size: -1 } }), "cube.size must be a valid number."],
    [
      makeDocument(
        { cube: { cubies: { piece: { size: -1 } } } },
        { version: 2 },
      ),
      "cube.cubies.piece.size must be a valid number.",
    ],
    [
      makeDocument({ cube: { cubies: { piece: null } } }),
      "cube.cubies.piece must be an object.",
    ],
    [
      makeDocument({ rotations: { moves: ["R", 2] } }),
      "setup.rotations.moves must be an array of strings.",
    ],
    [
      makeDocument({ colors: { axisLabels: { R: 1 } } }),
      "setup.colors.axisLabels values must be color strings.",
    ],
    [
      makeDocument({ labels: { axisLabelMode: "unknown" } }),
      "setup.labels.axisLabelMode is invalid.",
    ],
    [
      makeDocument({ labels: { axisLabelsByFace: { R: {} } } }),
      "setup.labels.axisLabelsByFace.R is invalid.",
    ],
  ];

  for (const [document, message] of invalidDocuments) {
    assert.throws(
      () => validateImportedDocument(document),
      new RegExp(message.replaceAll(".", "\\.")),
    );
  }
});
