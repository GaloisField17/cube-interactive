# Architecture

## Application Structure

- `src/main.js` constructs the cube and Three.js scene, owns the animation engine, and composes the application by calling `createUI()` with grouped scene, viewport, cube, and rotation dependencies.
- `src/ui.js` is the UI composition and application-coordination layer. It connects panels and controllers, coordinates cross-feature setup/reset operations, and owns rotation editing, playback, history, and timeline interactions.
- `src/ui/*Panel.js` modules own their panel DOM, local controls, and panel-local state. The Colors and Labels panels use scene-controller APIs for effects that span panels.
- `src/ui/faceletLabelController.js` owns facelet-label sprites and their rendering, transforms, depth, and visibility.
- `src/ui/axisSceneController.js` owns axis labels and arrows, rotation-arrow geometry, and their visual state.
- `src/ui/viewController.js` owns Ghost/Peek settings and hidden-sticker scene effects; `src/ui/viewPanel.js` owns the corresponding controls.
- `src/ui/fixedMoveControls.js`, `src/ui/customMoveControls.js`, `src/ui/colorPicker.js`, and the other focused UI modules encapsulate reusable or specialized control surfaces.
- `src/sceneSetup.js` owns scene and camera setup, including the shared default camera view.
- `src/setupDefaults.js`, `src/setupDocument.js`, and `src/jsonExport.js` own fresh setup defaults, import validation/default merging, and versioned setup export.
- `src/customRotation.js` and `src/rotationDefinitions.js` provide pure rotation parsing/editor helpers and rotation definitions.

## Ownership and Change Boundaries

- `createUI()` is the UI composition boundary. Pass feature modules only the dependencies they need; avoid forwarding the full application dependency bundle.
- Panels own panel-local DOM and state. Scene controllers own cohesive scene state and effects and should not depend on panel DOM. Keep cross-feature orchestration in `ui.js`.
- Keep pure parsing, defaults, validation, and math independent of the DOM and Three.js where practical. Put shared helpers with their narrowest real owner; avoid generic helper buckets and one-file-per-option designs.
- Rotation playback and timeline behavior spans `ui.js` and the animation engine in `main.js`. The UI coordinates entries, action/cursor queues, playback status, cancellation, and timeline seek/scrub/rebuild; the engine serializes cube animations and currently uses shared mutable duration, cancellation, and progress state. Preserve this lifecycle boundary unless a cohesive animation API or a narrower requirement supports a smaller interface.

## Setup and Behavior Contracts

- Preserve existing user-visible behavior, defaults, control interactions, scene effects, and reset/import/export semantics unless a behavior change is explicitly requested.
- Reset and import share the `applySetup()` workflow. Fresh defaults come from `src/setupDefaults.js`; the default camera view is shared with startup through `getDefaultCameraView()` in `src/sceneSetup.js`.
- Version-1 setup documents may omit optional fields; import merges them with defaults. Ghost/Peek visibility, peek depth, and hidden color are stored in `setup.view`.
- Before changing behavior or moving ownership, trace its call sites and tests. Prefer a bounded change with focused regression coverage; reconsider the boundary if preserving behavior requires broad callbacks or duplicated state.

## Verification

- `npm run check` runs the Node test suite and production build.
- `npm run test:e2e` runs Playwright browser tests for representative panel/setup workflows and rotation playback, cancellation, and timeline behavior.
- Keep tests aligned with behavior changes, especially for reset/import/export and timing-sensitive animation workflows.
