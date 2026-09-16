import { Color, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getCubeViewportHeight } from "./responsiveLayout.js";

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
  camera.position.set(5, 5, 7);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({
    antialias: true,
  });
  viewport.appendChild(renderer.domElement);

  function resize() {
    const width = Math.max(1, viewport.clientWidth || window.innerWidth);
    const height = getCubeViewportHeight(window.innerWidth, window.innerHeight);

    document.documentElement.style.setProperty(
      "--cube-viewport-height",
      `${height}px`,
    );

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  resize();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  return { scene, camera, renderer, controls, resize };
}
