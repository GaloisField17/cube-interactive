import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  getCubeViewportDisplayHeight,
  getCubeViewportDisplayHeightBounds,
  getCubeViewportHeight,
} from "./responsiveLayout.js";

const DEFAULT_CAMERA_POSITION = new Vector3(5, 5, 7);
const DEFAULT_CUBE_VIEW_LIFT = 1.1162;
export const CUBE_BACKGROUND_COLOR = "#e5e5e5";

export function createScene() {
  document.documentElement.style.margin = "0";
  document.body.style.margin = "0";
  document.body.style.overflowX = "hidden";

  const viewport = document.createElement("div");

  viewport.className = "cube-viewport";
  viewport.style.position = "fixed";
  viewport.style.top = "0";
  viewport.style.left = "0";
  viewport.style.width = "100vw";
  viewport.style.height = "100vh";
  viewport.style.overflow = "hidden";
  viewport.style.zIndex = "0";
  document.body.appendChild(viewport);

  const scene = new Scene();
  scene.background = new Color(CUBE_BACKGROUND_COLOR);

  const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({
    antialias: true,
  });
  viewport.appendChild(renderer.domElement);

  let cubeViewportCollapsed = false;
  let customCubeViewportHeight = null;

  function resize() {
    const width = Math.max(1, viewport.clientWidth || window.innerWidth);
    const defaultRenderHeight = getCubeViewportHeight(
      window.innerWidth,
      window.innerHeight,
    );
    const defaultViewportHeight = getCubeViewportDisplayHeight(
      window.innerWidth,
      window.innerHeight,
    );
    const compactLayout = window.innerWidth <= 900;

    if (customCubeViewportHeight !== null && compactLayout) {
      const bounds = getCubeViewportDisplayHeightBounds(window.innerHeight);

      customCubeViewportHeight = Math.min(
        bounds.maximum,
        Math.max(bounds.minimum, customCubeViewportHeight),
      );
    }

    const viewportHeight = cubeViewportCollapsed
      ? 0
      : compactLayout && customCubeViewportHeight !== null
        ? customCubeViewportHeight
        : defaultViewportHeight;
    const displayScale = defaultViewportHeight / defaultRenderHeight;
    const renderHeight =
      !cubeViewportCollapsed &&
      compactLayout &&
      customCubeViewportHeight !== null
        ? viewportHeight / displayScale
        : defaultRenderHeight;

    viewport.style.height = `${viewportHeight}px`;
    document.documentElement.style.setProperty(
      "--cube-viewport-height",
      `${viewportHeight}px`,
    );

    camera.aspect = width / renderHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, renderHeight);
  }

  function setCubeViewportCollapsed(collapsed) {
    cubeViewportCollapsed = collapsed;
    customCubeViewportHeight = null;
    document.documentElement.classList.toggle(
      "cube-viewport-collapsed",
      collapsed,
    );
    resize();
  }

  function setCubeViewportDisplayHeight(height) {
    if (cubeViewportCollapsed || window.innerWidth > 900) {
      return getCubeViewportDisplayHeight(
        window.innerWidth,
        window.innerHeight,
      );
    }

    const bounds = getCubeViewportDisplayHeightBounds(window.innerHeight);

    customCubeViewportHeight = Math.min(
      bounds.maximum,
      Math.max(bounds.minimum, height),
    );
    resize();

    return customCubeViewportHeight;
  }

  resize();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const defaultViewOffset = new Vector3(0, 1, 0)
    .applyQuaternion(camera.quaternion)
    .normalize()
    .multiplyScalar(-DEFAULT_CUBE_VIEW_LIFT);

  function getDefaultCameraView() {
    const cameraPosition =
      DEFAULT_CAMERA_POSITION.clone().add(defaultViewOffset);

    return {
      cameraPosition: {
        x: cameraPosition.x,
        y: cameraPosition.y,
        z: cameraPosition.z,
      },
      target: {
        x: defaultViewOffset.x,
        y: defaultViewOffset.y,
        z: defaultViewOffset.z,
      },
    };
  }

  function resetCameraView() {
    const { cameraPosition, target } = getDefaultCameraView();

    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    controls.target.set(target.x, target.y, target.z);
    controls.update();
  }

  resetCameraView();

  return {
    scene,
    camera,
    renderer,
    controls,
    resize,
    setCubeViewportCollapsed,
    setCubeViewportDisplayHeight,
    getDefaultCameraView,
    resetCameraView,
  };
}
