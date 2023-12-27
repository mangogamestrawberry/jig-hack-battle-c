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

/** 顔のパーツを表示 */
const loadFaceParts = () => {
  /** GLTFファイルローダー */
  const loader = new GLTFLoader();

  /** 各パーツのURL */
  const partsUrls = ['./fujisan.glb', './mouth.glb', './nose.glb', './right-eye.glb', './left-eye.glb']

  const loadParts = (url, scale) => {
    loader.load(url, gltf => {
      // サイズ調整
      gltf.scene.scale.set(scale, scale, scale);
      // 画面に表示
      scene.add(gltf.scene);
    
    }, undefined, () => {});
  }

  partsUrls.forEach((part, index) => loadParts(part, index === 0 ? 3 : 0.02))
}

/** 空間を初期化 */
const initScene = () => {
  container = document.createElement("div");
  document.body.appendChild(container);

  // 空間を作成
  scene = new THREE.Scene();

  // カメラを設定
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10,
  );
  camera.position.set(0, 0, 3);

  // カメラ範囲を設定
  const controls = new OrbitControls(camera, container);
  controls.minDistance = 0;
  controls.maxDistance = 8;

  // 真上に光源を設定
  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

  // 特定の方向に向いた光を設定
  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  scene.add(light);

  // 入れ子構造を作成
  // 入れ子構造として設計することで、複数の3Dオブジェクトをまとめて移動させたり、回転させたりするのが便利になる
  group = new THREE.Group();
  scene.add(group);

  // 3Dモデルを画面に表示するためのレンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer));
}

/** コントローラーを設定 */
const setControllers = () => {
  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  scene.add(controller2);

  // コントローラーの向きにラインを表示
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
}

/** 初期化処理 */
const init = () => {
  // 空間を初期化
  initScene()

  // 顔のパーツを表示
  loadFaceParts()

  // コントローラーを設定
  setControllers()

  // レイキャスティング
  // マウスピッキング（マウスが3D空間のどのオブジェクトの上にあるかを調べること）などに使わる。
  raycaster = new THREE.Raycaster();
};

init();
animate();

window.addEventListener("resize", onWindowResize);
