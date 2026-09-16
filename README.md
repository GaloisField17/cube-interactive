# cube-interactive

A browser-based Rubik's Cube simulator built with Three.js and Vite.

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run check
npm run preview
```

`npm test` uses Node's built-in test runner and covers the pure cube math, move definitions, face metadata, and configuration modules.

`npm run check` runs the tests and production build together.

## Structure

- `src/main.js` initializes the application, cube state, rotation engine, and lifecycle.
- `src/sceneSetup.js` creates the Three.js scene, camera, renderer, and orbit controls.
- `src/ui.js` builds the interactive controls and rotation workflow.
- `src/svgExport.js` generates SVG views and loads JSZip on demand for export.
- `src/cubeMath.js` contains pure vector and angle operations.
- `src/faceDefinitions.js` contains shared face, sticker, and material metadata.
- `src/rotationDefinitions.js` contains generated move variants and face rotations.
- `src/cubeConfig.js` contains default colors and cube dimensions.
- `test/cubeMath.test.js` contains unit tests for the pure modules.

## Build notes

Vite separates the application bundle from the Three.js and JSZip vendor chunks. JSZip is loaded only when SVG export is used. The Three.js vendor chunk is intentionally larger than Vite's default warning threshold because the application uses the full Three.js runtime and OrbitControls.

## Responsive behavior

The cube has a dedicated responsive viewport:

- Desktop uses the full viewport height.
- Tablet layouts use 62% of the viewport height, with a 300px minimum.
- Phone layouts use 52% of the viewport height, with a 280px minimum.
- On smaller screens, controls stack below the cube and the settings panels behave as an accordion.
- Playback controls and the rotation history stay in a toolbar area below the cube.

The responsive layout is covered by viewport-height tests for phone, tablet, desktop, and minimum-height cases. Manual browser checks should include `320x568`, `390x844`, `768x1024`, and `1440x900`.
