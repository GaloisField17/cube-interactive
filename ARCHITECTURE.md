# Architecture

`src/main.js`

- Application initialization and lifecycle.

`src/ui.js`

- Application/UI coordinator for application state orchestration, Three.js scene effects, and editor/application coordination.
- Intentionally remains large: its remaining responsibilities are application-specific, and several areas are tightly coupled to cube and scene state.
- The rotation workflow is a genuine subsystem, but it crosses application state and scene/UI lifecycle boundaries. It has been assessed and deferred because extracting it today would create a callback-heavy module.

`src/ui/setupPanel.js`

- Setup UI surface.

`src/ui/viewPanel.js`

- View settings UI surface.

`src/ui/cubePanel.js`

- Cube controls UI surface.

`src/ui/colorPicker.js`

- Reusable color-control interaction and lifecycle.

`src/ui/fixedMoveControls.js` and `src/ui/customMoveControls.js`

- Rotation input controls.

Do not extract code from `ui.js` merely to reduce line count. Extract only when there is a genuine ownership boundary that reduces coupling.
