import * as THREE from "three";

type ScrollParam = {
  vec: THREE.Vector2;
  total: THREE.Vector2;
};

const initWidth = window.innerWidth;
const initHeight = window.innerHeight;
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, initWidth / initHeight);
const gap = 40; // カード同士の間隔
const cardWidth = 300; // カードの横幅
const cardHeight = 400; // カードの縦幅
const cards: Array<
  THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial,
    THREE.Object3DEventMap
  >
> = [];

const baseGrid: THREE.Group<THREE.Object3DEventMap> = new THREE.Group();
const grids: Array<THREE.Group<THREE.Object3DEventMap>> = [];
let gridWidth: number;
let gridHeight: number;
let isDrag = false;
const damping = 0.9;

const scrollParam: ScrollParam = {
  vec: new THREE.Vector2(),
  total: new THREE.Vector2(),
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
      cards.push(plane);
      id++;
    }
  }
  gridWidth = cols * (cardWidth + gap) - gap;
  gridHeight = rows * (cardHeight + gap) - gap;
  camera.position.x = (cols * (cardWidth + gap) - cardWidth) / 2;
  camera.position.y = (rows * (cardHeight + gap) - cardHeight) / 2;
  baseGrid.userData.width = gridWidth;
  baseGrid.userData.height = gridHeight;

  cards.map((card) => {
    baseGrid.add(card);
  });
  const clone = baseGrid.clone();
  grids.push(clone);
  scene.add(clone);
};

const addGroup = () => {
  const fov = camera.fov * (Math.PI / 180);
  const height = 2 * Math.tan(fov / 2) * camera.position.z;
  const width = height * camera.aspect;
  const hBase = (gridWidth - width) / 2;
  const vBase = (gridHeight - width) / 2;
  grids.map((grid) => {
    const leftEdge = -hBase + grid.position.x;
    const rightEdge = hBase + grid.position.x;
    const topEdge = vBase + grid.position.y;
    const bottomEdge = -vBase + grid.position.y;
    const isOverLeft = leftEdge > scrollParam.total.x;
    const isOverRight = rightEdge < scrollParam.total.x;
    const isOverTop = topEdge < scrollParam.total.y;
    const isOverBottom = bottomEdge > scrollParam.total.y;
    if (isOverLeft) {
      const x = grid.position.x - (gap + gridWidth);
      const y = grid.position.y;
      const sameXGrids = grids.filter((grid) => {
        return grid.position.x === x;
      });
      const isExist = sameXGrids.some((grid) => {
        return grid.position.y === y;
      });
      if (!isExist) {
        const clone = baseGrid.clone();
        clone.position.y = grid.position.y;
        clone.position.x = x;
        grids.push(clone);
        scene.add(clone);
      }
    }
    if (isOverRight) {
      const x = grid.position.x + (gap + gridWidth);
      const y = grid.position.y;
      const sameXGrids = grids.filter((grid) => {
        return grid.position.x === x;
      });
      const isExist = sameXGrids.some((grid) => {
        return grid.position.y === y;
      });
      if (!isExist) {
        const clone = baseGrid.clone();
        clone.position.y = grid.position.y;
        clone.position.x = x;
        console.log("right");
        grids.push(clone);
        scene.add(clone);
      }
    }
    if (isOverTop) {
      const x = grid.position.x;
      const y = grid.position.y + (gap + gridHeight);
      const sameYGrids = grids.filter((grid) => {
        return grid.position.y === y;
      });
      const isExist = sameYGrids.some((grid) => {
        return grid.position.x === x;
      });
      if (!isExist) {
        const clone = baseGrid.clone();
        clone.position.x = grid.position.x;
        clone.position.y = y;
        console.log("top");
        grids.push(clone);
        scene.add(clone);
      }
    }
    if (isOverBottom) {
      const x = grid.position.x;
      const y = grid.position.y - (gap + gridHeight);
      const sameYGrids = grids.filter((grid) => {
        return grid.position.y === y;
      });
      const isExist = sameYGrids.some((grid) => {
        return grid.position.x === x;
      });
      if (!isExist) {
        const clone = baseGrid.clone();
        clone.position.x = grid.position.x;
        clone.position.y = y;
        grids.push(clone);
        scene.add(clone);
      }
    }
  });
};

const rotateCard = (mouseX: number, mouseY: number) => {
  const rotationX = ((mouseX / window.innerWidth) * Math.PI) / 2;
  cards.map((card) => {
    card.rotation.x = rotationX;
  });
};

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
  rotateCard(e.clientX, e.clientY);
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
  scrollParam.total.x -= scrollParam.vec.x;
  scrollParam.total.y -= scrollParam.vec.y;
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
