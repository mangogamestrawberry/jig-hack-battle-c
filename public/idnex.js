import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // for PC
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const param = new URL(location.href).searchParams;
const monocolor = param.get("monocolor") || undefined;
const opacity = parseFloat(param.get("opacity")) || 0.8;
const geometry = param.get("geometry") || "blocks"; // or jig, megane
const snap = param.get("snap") || 0;
console.log(param, opacity, geometry, monocolor);

let container;
let camera, scene, renderer;
let controller1, controller2;

let raycaster;

const intersected = [];
const tempMatrix = new THREE.Matrix4();

let group;

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const isTouch = (intersection) => {
  const d = intersection.distance;
  return d > 0 && d < .10;
};

const onSelectStart = (event) => {
  const controller = event.target;
  const intersections = getIntersections(controller);
  const objects = [];
  for (const intersection of intersections) {
    const object = intersection.object;
    object.material.emissive.b = 1;
    controller.attach(object);
    objects.push(object);
    if (isTouch(intersection)) {
      break;
    }
  }
  controller.userData.selected = objects;
};

const onSelectEnd = (event) => {
  const controller = event.target;
  if (controller.userData.selected !== undefined) {
    for (const object of controller.userData.selected) {
      object.material.emissive.b = 0;
      group.attach(object);
      if (snap) {
        object.position.x = Math.floor((object.position.x + snap / 2) / snap) *
          snap;
        object.position.y = Math.floor((object.position.y + snap / 2) / snap) *
          snap;
        object.position.z = Math.floor((object.position.z + snap / 2) / snap) *
          snap;
        const dsnap = Math.PI / 2;
        object.rotation.x =
          Math.floor((object.rotation.x + dsnap / 2) / dsnap) * dsnap;
        object.rotation.y =
          Math.floor((object.rotation.y + dsnap / 2) / dsnap) * dsnap;
        object.rotation.z =
          Math.floor((object.rotation.z + dsnap / 2) / dsnap) * dsnap;
      }
    }
    controller.userData.selected = undefined;
  }
};

const getIntersections = (controller) => {
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  return raycaster.intersectObjects(group.children, false);
};

const intersectObjects = (controller) => {
  // Do not highlight when already selected
  if (controller.userData.selected !== undefined) return;

  const intersections = getIntersections(controller);
  for (const intersection of intersections) {
    const object = intersection.object;
    object.material.emissive.r = 1;
    intersected.push(object);
    if (isTouch(intersection)) {
      object.material.emissive.g = 1;
      break;
    }
  }
};

const cleanIntersected = () => {
  while (intersected.length) {
    const object = intersected.pop();
    object.material.emissive.r = 0;
    object.material.emissive.g = 0;
  }
};

const render = () => {
  cleanIntersected();
  intersectObjects(controller1);
  intersectObjects(controller2);
  renderer.render(scene, camera);
};
const animate = () => {
  renderer.setAnimationLoop(render);
};

const loader = new GLTFLoader();

loader.load( './fujisan.glb', gltf => {

	scene.add( gltf.scene );

}, undefined, err => {});

loader.load( './mouth.glb', gltf => {

  // サイズ調整
	gltf.scene.scale.set(0.01, 0.01, 0.01); 
  const root = gltf.scene;
  scene.add(root);

}, undefined, err => {});

loader.load( './nose.glb', gltf => {

  // サイズ調整
	gltf.scene.scale.set(0.01, 0.01, 0.01); 
  const root = gltf.scene;
  scene.add(root);
}, undefined, () => {});

loader.load( './right-eye.glb', gltf => {

  // サイズ調整
	gltf.scene.scale.set(0.01, 0.01, 0.01); 
  const root = gltf.scene;
  scene.add(root);

}, undefined, () => {});

loader.load( './left-eye.glb', gltf => {

  // サイズ調整
	gltf.scene.scale.set(0.01, 0.01, 0.01); 
  const root = gltf.scene;
  scene.add(root);

}, undefined, () => {});

const init = () => {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10,
  );
  camera.position.set(0, 0, 3);

  const controls = new OrbitControls(camera, container);
  controls.minDistance = 0;
  controls.maxDistance = 8;

  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  scene.add(light);

  group = new THREE.Group();
  scene.add(group);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer));

  // controllers

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  scene.add(controller2);

  raycaster = new THREE.Raycaster();

  // line
  const makeLine = (len) => {
    const material = new THREE.LineBasicMaterial({
      //color: 0xff0000, // red
      //color: 0x0000ff, // blue
      color: 0xffffff, // white
    });
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(0, 0, -len));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    return line;
  };
  controller1.add(makeLine(5));
  controller2.add(makeLine(5));

  //
  window.addEventListener("resize", onWindowResize);
};

init();
animate();
