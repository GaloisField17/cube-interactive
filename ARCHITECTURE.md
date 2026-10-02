# Architecture

## Current Structure

- `src/main.js` owns cube construction/state and the animation lifecycle; it supplies grouped scene, viewport, cube, and rotation dependencies to `createUI()`.
- `src/ui.js` is the application coordinator. It composes panels and coordinates cross-feature setup/reset operations plus rotation editor/playback/history/timeline orchestration.
- `src/ui/faceletLabelController.js` owns facelet-label sprite creation, text/color rendering, transforms, depth, and visibility; `src/ui/labelsPanel.js` owns label controls while `src/ui.js` coordinates setup flows.
- `src/ui/axisSceneController.js` owns axis-label and axis-arrow scene groups plus rotation-arrow geometry, colors, depth, direction, scale, visibility, and depth testing; `src/ui/colorsPanel.js` and `src/ui/labelsPanel.js` own the corresponding inputs while `src/ui.js` coordinates serialized setup.
- `src/ui/colorsPanel.js` owns Colors panel DOM, color inputs, picker interactions, and input synchronization. `src/ui/labelsPanel.js` owns Labels panel DOM, local visibility/numeric/label-mode state, and applying or serializing that panel's setup fields.
- `src/ui/viewPanel.js` owns View-panel DOM/input synchronization; `src/ui/viewController.js` owns Ghost/Peek settings and hidden-sticker scene effects.
- `src/ui/cubePanel.js`, `src/ui/setupPanel.js`, `src/ui/fixedMoveControls.js`, and `src/ui/customMoveControls.js` own focused control surfaces. `src/ui/colorPicker.js` owns reusable color-picker interaction.
- `src/sceneSetup.js` owns Three.js scene/camera setup and the shared default camera view.
- `src/setupDefaults.js`, `src/setupDocument.js`, and `src/jsonExport.js` own fresh setup defaults, import validation/merging, and versioned export/default pruning.
- `src/customRotation.js` owns pure rotation parsing and editor-state helpers. Rotation playback still shares mutable duration/cancellation/progress state with the animation code in `src/main.js`.

## Boundaries and Conventions

- `createUI()` is the composition boundary. Its inputs are grouped as `scene`, `viewport`, `cube`, and `rotation`; feature modules should receive only the subset they need.
- Panel modules own their DOM, local controls, and panel-local state; expose small synchronization/reset/setup APIs where needed. Feature controllers own cohesive scene state and effects, expose explicit get/set/reset or command methods, and do not depend on panel DOM.
- Prefer a feature/controller boundary over one file per option or a panel-only move that leaves all state and effects in `ui.js`.
- Keep pure state, parsing, defaults, and document validation independent of DOM/Three.js where practical. Put shared helpers with the narrowest real owner; avoid generic helper buckets and unnecessary abstraction.
- Keep `ui.js` focused on composition and cross-feature lifecycle as feature ownership moves outward. Do not pass the entire app dependency bundle into each module.

## Behavior and Setup Contracts

- Refactoring must preserve all existing user-visible behavior, defaults, control interactions, cube/scene effects, and reset/import/export semantics unless a behavior change is explicitly approved.
- Approved contract: setup JSON stores Ghost/Peek visibility, peek depth, and hidden color in `setup.view`; older version-1 documents receive defaults for omitted optional fields.
- Reset and import use the same `applySetup()` path. Fresh defaults come from `src/setupDefaults.js`; the default camera view is shared with startup through `getDefaultCameraView()` in `src/sceneSetup.js`.
- Before moving behavior, identify its call sites and current tests. Make one bounded change at a time, add focused regression tests, and run `npm run check` at meaningful milestones. If preserving behavior requires broad callbacks or shared mutable state, pause and revise the boundary.

## Known Coupling and Test Gaps

- Colors edits cube facelet/interior colors and also label/arrow colors through the facelet-label and axis-scene controller APIs. Both panel surfaces are now isolated in UI modules; `ui.js` coordinates cross-feature reset/import/export through their controller APIs. Colors and Labels still intentionally share scene-controller APIs rather than owning duplicate scene state.
- Rotation editor/history/playback/timeline/queue/scrub/seek/rebuild state is intertwined with DOM and the animation engine. Existing pure parsing helpers and input controls are already separate; do not extract the remaining workflow without a narrow interface and lifecycle tests.
- Node tests cover pure math/parsing, setup document/default behavior, and View, facelet-label, and axis-scene controllers. Playwright Chromium tests cover representative Colors/Labels changes, axis-label and arrow settings, JSON export/import, color-control synchronization, and reset-to-default setup equivalence. Rotation playback lifecycle and broader UI edge cases remain without browser coverage.

## Organization Roadmap

Work one step at a time. After each step, update this section with its outcome and the next step, then stop and ask before continuing. Maintain the behavior contract above; clarify with the user before any scope or behavior change.

1. **Establish UI regression coverage** — Complete. Playwright Test runs Chromium against Vite using `npm run test:e2e`; install its browser with `npx playwright install chromium`. Coverage verifies facelet/inner color and label edits through JSON export/import, imported color-control synchronization, and that reset returns an empty setup delta. The test exposed stale facelet/inner color inputs after import; `applySetup()` now synchronizes those controls after applying cube state. No feature ownership was reorganized in this step.
2. **Extract facelet-label scene ownership** — Complete. Added `src/ui/faceletLabelController.js` to own sprite creation, text/color rendering, transforms, depth, and visibility. At that step, `ui.js` retained panel controls and setup orchestration while routing label scene changes through the controller; Step 4 subsequently moved panel controls into their own modules. The focused controller test verifies sprite attachment/texture, rendered names and colors, visibility/depth testing, and depth/size-driven transforms. Existing reset/import/export paths continue to use the same setup workflow.
3. **Extract axis and rotation-arrow scene ownership** — Complete. Added `src/ui/axisSceneController.js` to own axis/rotation-arrow construction and scene effects, including text/color drawing, geometry regeneration, depth, scale, visibility, and depth testing. Labels/Colors actions use its API while setup serialization remains coordinated in `ui.js`; Step 4 subsequently moved the controls and Labels-local state into panel modules. Focused controller tests cover visual state and geometry changes; Playwright verifies the axis-label/arrow settings and colors survive JSON export/import.
4. **Separate Colors and Labels panel UI** — Complete. Added `src/ui/colorsPanel.js` and `src/ui/labelsPanel.js`; panel modules own local controls and synchronization/state while `ui.js` coordinates cross-feature reset/import/export through compact APIs. Existing accessibility names, color-picker undo, label/numeric controls, collapse behavior, and setup flows remain covered by Playwright. Verification also exposed sub-ULP camera-position drift in reset setup diffs; JSON default pruning now ignores representational noise at the scale of one floating-point ULP, with a focused regression test.
5. **Reassess rotation extraction** — Use the new test coverage to identify a small state/timeline boundary. Extract only if playback, cancellation, queue, seek/scrub, and rebuild behavior can be preserved behind a testable interface; otherwise keep the current workflow and document why.
6. **Final verification and architecture update** — Run `npm run check`, review reset and import/export plus extracted UI workflows, update the ownership map, and record remaining coupling or deferred work for collaborators.

Current next action: Step 5, reassess whether rotation has a small, testable extraction boundary; leave the coupled workflow in place if preserving its lifecycle requires broad callbacks or shared mutable state.
