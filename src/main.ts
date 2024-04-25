import * as THREE from "three";
type Card = {
  mesh: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial,
    THREE.Object3DEventMap
  >;
  id: number;
};

type ScrollParam = {
  vec: THREE.Vector2;
  total: THREE.Vector2;
  gridPos: THREE.Vector2;
  dir: "left" | "right" | "bottom" | "top";
};

type Edge = {
  left: number;
  right: number;
  top: number;
  bottom: number;
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
const grids: THREE.Group<THREE.Object3DEventMap> = new THREE.Group();
const grid: THREE.Group<THREE.Object3DEventMap> = new THREE.Group();
let gridWidth: number;
let gridHeight: number;
let isDrag = false;
const damping = 0.9;

const scrollParam: ScrollParam = {
  vec: new THREE.Vector2(),
  total: new THREE.Vector2(),
  gridPos: new THREE.Vector2(),
  dir: "right",
};

const edge: Edge = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

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
  camera.position.x = (cols * (cardWidth + gap) - cardWidth) / 2;
  camera.position.y = (rows * (cardHeight + gap) - cardHeight) / 2;
  grid.userData.width = gridWidth;
  grid.userData.height = gridHeight;
  cards.map((card) => {
    grid.add(card.mesh);
  });
  grids.add(grid);
  scene.add(grid);
  scrollParam.total.x = (cols * (cardWidth + gap) - cardWidth) / 2;
  scrollParam.total.y = (rows * (cardHeight + gap) - cardHeight) / 2;
};

const checkViewport = () => {};

const setPosition = () => {};

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
  scrollParam.vec.x = deltaX;
  scrollParam.vec.y = deltaY;
  previousMousePosition.x = e.clientX;
  previousMousePosition.y = e.clientY;
};

const onWheel = (e: WheelEvent) => {
  scrollParam.vec.x = e.deltaX * 0.25;
  scrollParam.vec.y = e.deltaY * 0.25;
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
  scrollParam.vec.x *= damping;
  scrollParam.vec.y *= damping;
  if (Math.abs(scrollParam.vec.x) < 0.05) scrollParam.vec.x = 0;
  if (Math.abs(scrollParam.vec.y) < 0.05) scrollParam.vec.y = 0;
  camera.position.x = camera.position.x - scrollParam.vec.x;
  camera.position.y = camera.position.y - scrollParam.vec.y;
  scrollParam.total.x += scrollParam.vec.x;
  scrollParam.total.y += scrollParam.vec.y;
  addGroup();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};

init();
window.addEventListener("resize", onResize);
window.addEventListener("wheel", onWheel);
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("mousemove", onMouseMove);
