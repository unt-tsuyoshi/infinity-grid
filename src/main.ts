import normalizeWheel from "normalize-wheel";
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
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const gap = 60; // カード同士の間隔
const cardWidth = 400; // カードの横幅
const cardHeight = 540; // カードの縦幅
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
  const cols = Math.floor((window.innerWidth - gap) / (cardWidth + gap)) + 2;
  const rows = Math.floor((window.innerHeight - gap) / (cardHeight + gap)) + 2;
  let id = 0;
  let textureCount = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const geometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
      const path =
        textureCount > 9
          ? "/infinity-grid/texture" + textureCount + ".png"
          : "/infinity-grid/texture0" + textureCount + ".png";
      const texture = new THREE.TextureLoader().load(path);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        map: texture,
      });
      const plane = new THREE.Mesh(geometry, material);
      plane.position.x = col * (cardWidth + gap) + gap / 2;
      plane.position.y = row * (cardHeight + gap) + gap / 2;
      cards.push(plane);
      id++;
      textureCount++;
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

const onMouseDown = (e: MouseEvent) => {
  isDrag = true;
  renderer.domElement.style.cursor = "grabbing";

  previousMousePosition.x = e.clientX;
  previousMousePosition.y = e.clientY;
};

const onMouseUp = () => {
  isDrag = false;
  renderer.domElement.style.cursor = "auto";
};

const onMouseMove = (e: MouseEvent) => {
  // マウス座標を正規化（-1から1の範囲に変換）
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(grids, true);

  if (intersects.length > 0 && !isDrag) {
    // カードにホバーしている場合
    renderer.domElement.style.cursor = "pointer";
  } else if (!isDrag) {
    // カードにホバーしていない場合
    renderer.domElement.style.cursor = "auto";
  }

  if (!isDrag) return;
  const normX = (e.clientX - previousMousePosition.x) / 80;
  const normY = -(e.clientY - previousMousePosition.y) / 80;
  let x = normX;
  let y = normY;
  if (x > 1) {
    x = 1;
  } else if (x < -1) {
    x = -1;
  }
  if (y > 1) {
    y = 1;
  } else if (y < -1) {
    y = -1;
  }
  scrollParam.vec.x = normX;
  scrollParam.vec.y = normY;
  previousMousePosition.x = e.clientX;
  previousMousePosition.y = e.clientY;
};
const onWheel = (e: WheelEvent) => {
  const normWheel = normalizeWheel(e);
  const pixelX = normWheel.pixelX;
  const pixelY = normWheel.pixelY;
  let normX = (pixelX * 4) / window.innerWidth;
  let normY = (pixelY * 4) / window.innerHeight;
  normX = Math.max(-1, Math.min(1, normX));
  normY = Math.max(-1, Math.min(1, normY));
  scrollParam.vec.x = normX;
  scrollParam.vec.y = normY;
};

const rotateCards = () => {
  const maxAngleRad = (45 * Math.PI) / 180; // 45度をラジアンに変換
  const rotationFactor = 1.0; // 回転量を調整する係数（0.0 ~ 1.0）

  const rotationX = Math.max(
    -maxAngleRad,
    Math.min(maxAngleRad, -scrollParam.vec.y * rotationFactor)
  );
  const rotationY = Math.max(
    -maxAngleRad,
    Math.min(maxAngleRad, scrollParam.vec.x * rotationFactor)
  );

  grids.forEach((grid) => {
    grid.children.forEach((card) => {
      card.rotation.x = rotationX;
      card.rotation.y = rotationY;
    });
  });
};

const onResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t + b;
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
};

// const easeOutQuad = (t: number, b: number, c: number, d: number) => {
//   t /= d;
//   return -c * t * (t - 2) + b;
// };

const tick = () => {
  const scrollScalor = 75;
  scrollParam.vec.x *= damping;
  scrollParam.vec.y *= damping;
  if (Math.abs(scrollParam.vec.x) < 0.01) scrollParam.vec.x = 0;
  if (Math.abs(scrollParam.vec.y) < 0.01) scrollParam.vec.y = 0;
  camera.position.x = camera.position.x - scrollParam.vec.x * scrollScalor;
  camera.position.y = camera.position.y - scrollParam.vec.y * scrollScalor;
  scrollParam.total.x -= scrollParam.vec.x * scrollScalor;
  scrollParam.total.y -= scrollParam.vec.y * scrollScalor;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(grids, true);

  grids.forEach((grid) => {
    grid.children.forEach((card) => {
      if (intersects.length > 0 && card === intersects[0].object) {
        if (!card.userData.hoverStartTime) {
          card.userData.hoverStartTime = performance.now();
        }
        const startZ = card.position.z;
        const endZ = 100;
        const duration = 400;
        const elapsed = performance.now() - card.userData.hoverStartTime;
        const progress = Math.min(elapsed / duration, 1);
        card.position.z = easeInOutQuad(progress, startZ, endZ - startZ, 1);
      } else {
        if (card.userData.hoverStartTime) {
          card.userData.hoverEndTime = performance.now();
          card.userData.hoverStartTime = 0;
        }
        const startZ = card.position.z;
        const endZ = 0;
        const duration = 400;
        const elapsed = performance.now() - (card.userData.hoverEndTime || 0);
        const progress = Math.min(elapsed / duration, 1);
        card.position.z = easeInOutQuad(progress, startZ, endZ - startZ, 1);
      }
    });
  });

  addGroup();
  rotateCards();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};

init();
window.addEventListener("resize", onResize);
window.addEventListener("wheel", onWheel);
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("mousemove", onMouseMove);
