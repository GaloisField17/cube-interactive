import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  getCubeViewportDisplayHeight,
  getCubeViewportHeight,
} from "./responsiveLayout.js";

const DEFAULT_CAMERA_POSITION = new Vector3(5, 5, 7);
const DEFAULT_CUBE_VIEW_LIFT = 1.1162;

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
  scene.background = new Color(0xe5e5e5);

  const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({
    antialias: true,
  });
  viewport.appendChild(renderer.domElement);

  let cubeViewportCollapsed = false;

  function resize() {
    const width = Math.max(1, viewport.clientWidth || window.innerWidth);
    const renderHeight = getCubeViewportHeight(
      window.innerWidth,
      window.innerHeight,
    );
    const viewportHeight = cubeViewportCollapsed
      ? 0
      : getCubeViewportDisplayHeight(window.innerWidth, window.innerHeight);

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
    document.documentElement.classList.toggle(
      "cube-viewport-collapsed",
      collapsed,
    );
    resize();
  }

  resize();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const defaultViewOffset = new Vector3(0, 1, 0)
    .applyQuaternion(camera.quaternion)
    .normalize()
    .multiplyScalar(-DEFAULT_CUBE_VIEW_LIFT);

  function resetCameraView() {
    camera.position.copy(DEFAULT_CAMERA_POSITION).add(defaultViewOffset);
    controls.target.copy(defaultViewOffset);
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
    resetCameraView,
  };
}
