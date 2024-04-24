import * as THREE from "three";
type Card = {
  mesh: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial,
    THREE.Object3DEventMap
  >;
  id: number;
};
const initWidth = window.innerWidth;
const initHeight = window.innerHeight;
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, initWidth / initHeight);
const gap = 40; // カード同士の間隔
const cardWidth = 300; // カードの横幅
const cardHeight = 400; // カードの縦幅
const cards: Array<Card> = [];
let grid: THREE.Group<THREE.Object3DEventMap>;
let gridWidth: number;
let gridHeight: number;
let isDrag = false;
const damping = 0.9;
const scrollVec = {
  x: 0,
  y: 0,
};
const mouse = new THREE.Vector2();
const frustum = new THREE.Frustum();
const previousMousePosition = { x: 0, y: 0 };

const init = () => {
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  camera.position.set(0, 0, +1000);
  createCards();
  tick();
};

const createCards = () => {
  const cols = Math.floor((window.innerWidth - gap) / (cardWidth + gap)) + 4;
  const rows = Math.floor((window.innerHeight - gap) / (cardHeight + gap)) + 4;
  const group = new THREE.Group();

  let id = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const geometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(geometry, material);
      plane.position.x = col * (cardWidth + gap) + gap / 2;
      plane.position.y = row * (cardHeight + gap) + gap / 2;
      cards.push({ mesh: plane, id });
      id++;
    }
  }
  gridWidth = cols * (cardWidth + gap) - gap;
  gridHeight = rows * (cardHeight + gap) - gap;
  group.position.x = -(cols * (cardWidth + gap) - cardWidth) / 2;
  group.position.y = -(rows * (cardHeight + gap) - cardHeight) / 2;

  group.userData.width = gridWidth;
  group.userData.height = gridHeight;
  grid = group;
  cards.map((card) => {
    group.add(card.mesh);
  });
  scene.add(group);
};

const addGroup = () => {};

const onMouseDown = (e: MouseEvent) => {
  isDrag = true;
  renderer.domElement.style.cursor = "grabbing";

  previousMousePosition.x = e.clientX;
  previousMousePosition.y = e.clientY;
};

const onMouseUp = (e: MouseEvent) => {
  isDrag = false;
  renderer.domElement.style.cursor = "auto";
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDrag) return;
  const deltaX = e.clientX - previousMousePosition.x;
  const deltaY = -(e.clientY - previousMousePosition.y);
  scrollVec.x = deltaX;
  scrollVec.y = deltaY;
  previousMousePosition.x = e.clientX;
  previousMousePosition.y = e.clientY;
};

const onWheel = (e: WheelEvent) => {
  scrollVec.x = e.deltaX * 0.25;
  scrollVec.y = e.deltaY * 0.25;
};

const onResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const tick = () => {
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  );
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (!frustum.intersectsObject(object)) {
        object.visible = false;
      }
    }
  });
  const gridWorld = grid.getWorldPosition(new THREE.Vector3());
  scrollVec.x *= damping;
  scrollVec.y *= damping;
  if (Math.abs(scrollVec.x) < 0.05) scrollVec.x = 0;
  if (Math.abs(scrollVec.y) < 0.05) scrollVec.y = 0;
  grid.position.x = gridWorld.x + scrollVec.x;
  grid.position.y = gridWorld.y + scrollVec.y;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};

init();
window.addEventListener("resize", onResize);
window.addEventListener("wheel", onWheel);
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("mousemove", onMouseMove);
