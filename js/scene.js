import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { THREADS } from './threads.js';

/* ============================================================
   Renderer / scene / lights
   ============================================================ */

const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0D0B09);
scene.fog = new THREE.Fog(0x0D0B09, 8, 18);

export const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 60);
export const lookTarget = new THREE.Vector3(0, 1, 0);

// museum case at night: one warm key, deep shadow, faint cool fill
const keyLight = new THREE.SpotLight(0xffc9a0, 95);
keyLight.position.set(2.6, 4.2, 2.4);
keyLight.angle = Math.PI / 4.5;
keyLight.penumbra = 0.65;
keyLight.decay = 2;
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0004;
keyLight.shadow.radius = 6;
keyLight.target.position.copy(lookTarget);
scene.add(keyLight, keyLight.target);

// Counter-key from the upper LEFT. Every node now turns a full 360° as it is
// read, so any face can end up toward the camera — and with one key at the
// upper right, everything whose normal points left goes black, made worse by
// the key's own shadow map covering that whole half. This is the light that
// keeps the piece legible at every angle. It is deliberately dimmer and cooler
// than the key, so the museum's one-lamp direction survives. It does NOT cast
// shadow: a second shadow map only fills what the key already occludes, and
// two overlapping contact shadows on the floor read as a lighting error.
const rimLight = new THREE.SpotLight(0xc3d2e6, 78);
rimLight.position.set(-3.4, 2.9, 1.6);
rimLight.angle = Math.PI / 3.6;
rimLight.penumbra = 0.58;
rimLight.decay = 2;
rimLight.target.position.copy(lookTarget);
scene.add(rimLight, rimLight.target);

// Rear kicker: separates the silhouette from the void when a piece turns
// back-on, so the far side reads as form rather than as a hole in the frame.
const backLight = new THREE.SpotLight(0xffd2ab, 30);
backLight.position.set(1.4, 2.6, -3.4);
backLight.angle = Math.PI / 3.4;
backLight.penumbra = 0.75;
backLight.decay = 2;
backLight.target.position.copy(lookTarget);
scene.add(backLight, backLight.target);

const fillLight = new THREE.DirectionalLight(0x40506b, 0.28);
fillLight.position.set(-3, 1.5, -2);
scene.add(fillLight);

const ambient = new THREE.AmbientLight(0x2a1d12, 0.62);
scene.add(ambient);

// reserved for the final node: dead, even, fluorescent
const flatLight = new THREE.DirectionalLight(0xe9efe6, 0);
flatLight.position.set(0, 6, 1.5);
scene.add(flatLight);

// Every spot is aimed at lookTarget, but lookTarget.y tweens per node (`lookY`)
// and the targets above were only copied once at startup. Without re-aiming,
// a tall piece is lit at node 0's height and its head sits in the cone's
// penumbra — dark for reasons that have nothing to do with rotation.
export function aimLights() {
  keyLight.target.position.copy(lookTarget);
  rimLight.target.position.copy(lookTarget);
  backLight.target.position.copy(lookTarget);
}

// shadow catcher
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.ShadowMaterial({ opacity: 0.4 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

export const stage = new THREE.Group();
scene.add(stage);

/* ============================================================
   Loading & model prep
   ============================================================ */

const gltfLoader = new GLTFLoader();
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
gltfLoader.setDRACOLoader(draco);
gltfLoader.setKTX2Loader(new KTX2Loader()
  .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/')
  .detectSupport(renderer));
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

// scale to a common size, sit on the floor, centered on origin
export function normalize(root, targetHeight) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = (targetHeight * 2) / Math.max(size.x, size.y, size.z);
  root.scale.setScalar(scale);
  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
}

function collectMaterials(root) {
  const set = new Set();
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => set.add(m));
    }
  });
  return [...set];
}

// the $4.99 pot, generated in code until today.glb exists
function makePot() {
  const pts = [
    [0.02, 0.0], [0.42, 0.0], [0.44, 0.03], [0.64, 0.92],
    [0.73, 0.94], [0.74, 1.14], [0.65, 1.14], [0.59, 0.98], [0.02, 0.94]
  ].map(p => new THREE.Vector2(p[0], p[1]));
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb05a38, roughness: 0.93, metalness: 0.0, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

// procedural fired-clay surface: fine grain used for both bump and roughness so
// the form reads as matte terracotta rather than its scanned/painted texture
function clayGrainTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 140 + Math.random() * 100;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

// Micro-relief for the press-in. At closeup range the camera sits ~0.4 units off
// a surface whose colour map is a few thousand pixels stretched over the whole
// scan, so every texel covers dozens of screen pixels: the material dissolves
// into smeared blur with no high-frequency detail left for the key light to
// catch. This adds the frequency back as bump — fired-clay tooth, marble's
// crystalline sparkle — at a repeat high enough to survive the magnification.
// `fine` seeds a second, denser octave so the grain doesn't read as one uniform
// static field when the camera is close.
function microGrainTexture(repeat, octave = 3) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  // low-frequency mottling: blotches the size of clay grog / marble crystals.
  // Value noise from a random lattice, bilinearly smoothed — a trig field looks
  // cheaper than it is here, because its interference reads as diagonal hatching
  // once the camera is close enough to resolve it.
  const coarse = new Float32Array(size * size);
  const n = Math.max(4, octave * 8);          // lattice resolution
  const lat = new Float32Array((n + 1) * (n + 1));
  for (let i = 0; i < lat.length; i++) lat[i] = Math.random();
  const step = size / n;
  for (let y = 0; y < size; y++) {
    const gy = y / step, y0 = Math.floor(gy), fy = gy - y0;
    const sy = fy * fy * (3 - 2 * fy);         // smoothstep, so cells don't seam
    for (let x = 0; x < size; x++) {
      const gx = x / step, x0 = Math.floor(gx), fx = gx - x0;
      const sx = fx * fx * (3 - 2 * fx);
      const a = lat[y0 * (n + 1) + x0],       b = lat[y0 * (n + 1) + x0 + 1];
      const c = lat[(y0 + 1) * (n + 1) + x0], d = lat[(y0 + 1) * (n + 1) + x0 + 1];
      coarse[y * size + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    }
  }
  for (let i = 0, p = 0; i < img.data.length; i += 4, p++) {
    const v = 100 + coarse[p] * 78 + Math.random() * 74;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// `grain: { scale, repeat }` — give a node's surface its own micro-relief.
// Applied on top of whatever maps the scan ships; the colour map keeps carrying
// the form, the bump carries the material.
function applyMicroGrain(model, grain) {
  const { scale = 0.2, repeat = 26, octave = 3, rough = false } = grain === true ? {} : grain;
  const tex = microGrainTexture(repeat, octave);
  model.traverse(o => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      m.bumpMap = tex;
      m.bumpScale = scale;
      // stone doesn't just have relief, it has uneven gloss — crystal faces
      // catching the key at slightly different angles. Modulating roughness by
      // the same field is what separates marble from matte plaster up close.
      if (rough) m.roughnessMap = tex;
      if (m.map) m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      m.needsUpdate = true;
    });
  });
}

function clayMaterial() {
  const grain = clayGrainTexture();
  return new THREE.MeshStandardMaterial({
    color: 0x8f5a44,
    roughness: 0.94,
    metalness: 0.0,
    bumpMap: grain,
    bumpScale: 0.02,
    roughnessMap: grain
  });
}

// loads (and memoizes) node `i` of thread `threadKey`, returning its pivot group
export function loadNode(threadKey, i) {
  const thread = THREADS[threadKey];
  // A rejected promise left in the cache would poison every later attempt at
  // this node (a hiccup on one fetch would kill the node for the session), so
  // failures drop their entry and the next call retries the download.
  thread.cache[i] ??= (async () => {
    const node = thread.nodes[i];
    let model;
    try {
      const gltf = await gltfLoader.loadAsync(node.file);
      model = gltf.scene;
    } catch (e) {
      if (node.fallback === 'pot') model = makePot();
      else throw e;
    }

    // some scans ship with their museum furniture baked in (pedestal, label
    // card) on a separate material — drop those meshes so only the clay remains
    if (node.strip) {
      const doomed = [];
      model.traverse(o => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.some(m => (m.name || '').startsWith(node.strip))) doomed.push(o);
      });
      doomed.forEach(o => o.removeFromParent());
    }

    // fired clay is matte; some scans ship a wet-glaze roughness map that
    // multiplies any scalar clamp, so the map itself has to go
    if (node.matte) {
      model.traverse(o => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          m.roughnessMap = null;
          m.metalnessMap = null;
          m.roughness = 0.92;
          m.metalness = 0.0;
          m.needsUpdate = true;
        });
      });
    }

    // Marble is a dielectric and does not glow. Several of these scans arrive
    // from spec-gloss conversions carrying a metallic factor and — worse — a
    // full-white emissive with an emissive map (the Écija Amazon does both).
    // Emissive is fatal here: the emerge fade only tweens material COLOR, so a
    // self-lit mesh stays visible through the dip to black and the swap shows.
    // `polish` sets how wet the stone reads: low for the museum-polished
    // Canova, high for weathered or abraded surfaces.
    if (node.stone) {
      model.traverse(o => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          m.metalness = 0.0;
          m.metalnessMap = null;
          m.roughness = node.polish ?? 0.7;
          m.roughnessMap = null;
          if (m.emissive) m.emissive.setHex(0x000000);
          m.emissiveMap = null;
          m.emissiveIntensity = 0;
          m.needsUpdate = true;
        });
      });
    }

    // some scans arrive lying down or facing away; reorient BEFORE normalize
    // so scaling/centering account for the new silhouette
    if (node.rot) model.rotation.set(node.rot[0], node.rot[1], node.rot[2]);

    const pivot = new THREE.Group();
    pivot.add(model);
    normalize(model, node.height);

    // Read as fired clay while KEEPING the scan's detail. The figurine's surface
    // detail lives in its texture maps (color carries baked relief/AO, plus any
    // normal map), so instead of swapping in a flat material we tint the existing
    // maps terracotta. A flat replacement is only used as a fallback for meshes
    // that ship with no color map at all.
    if (node.clay) {
      const grain = clayGrainTexture();
      model.traverse(o => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => {
          m.metalness = 0.0;
          m.roughness = Math.min(1, (m.roughness ?? 0.8) + 0.05);
          if (m.map) {
            // keep the detailed scan texture, just push its hue toward clay
            m.color.setHex(0xc28a6a);
          } else {
            // no texture to preserve — give it grain so it isn't a smooth blob
            m.color.setHex(0x8f5a44);
            if (!m.normalMap && !m.bumpMap) { m.bumpMap = grain; m.bumpScale = 0.02; }
          }
          if (m.emissive) m.emissive.setHex(0x000000);
          m.needsUpdate = true;
        });
      });
    }

    // Optional albedo tint, multiplied into the scan's colour map. The key is a
    // warm 0xffc9a0, so a scan that is neutral in its own texture still renders
    // tan — worst at the press-in, where the surface fills the frame and has
    // nothing but colour to go on. A cool tint here buys the warmth back.
    if (node.tint !== undefined) {
      model.traverse(o => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          m.color.setHex(node.tint);
          m.needsUpdate = true;
        });
      });
    }

    // micro-relief last, so it lands on top of clay/stone's material edits
    if (node.grain) applyMicroGrain(model, node.grain);

    // the army: one soldier becomes many, sharing geometry & materials
    if (node.army) {
      for (let row = 0; row < 4; row++) {
        for (let col = -2; col <= 2; col++) {
          if (row === 0 && col === 0) continue;
          const clone = model.clone();
          clone.position.x += col * 1.5 + (row % 2) * 0.4;
          clone.position.z -= row * 1.7;
          clone.rotation.y += (Math.random() - 0.5) * 0.08;
          pivot.add(clone);
        }
      }
    }

    // optional per-node vertical nudge: lower a too-tall piece so its top
    // (e.g. the krater's lid finial) drops out of the top of the frame
    pivot.position.y = node.yShift || 0;

    pivot.userData.materials = collectMaterials(pivot);
    warmUp(pivot);
    return pivot;
  })().catch(err => {
    thread.cache[i] = undefined;
    throw err;
  });
  return thread.cache[i];
}

// Compile shaders and prime the shadow map for a freshly loaded model while it's
// still preloading in the background. Without this, the first frame the model
// becomes visible during a transition stalls the main thread (shader compile +
// shadow regen), which is what makes the swap look choppy.
function warmUp(pivot) {
  // black-but-opaque so we compile the SAME (opaque) shader variant used during
  // the transition, and nothing flashes on screen during the warm-up render.
  prepEmerge(pivot);
  scene.add(pivot);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  scene.remove(pivot);
  settleEmerge(pivot);
}

// The model fades in by darkening its color toward black and ramping back —
// NOT by material opacity. Alpha blending on these high-poly scans kills the
// depth-write/early-Z optimisation and floods the GPU with overdraw, which is
// what made the transition choppy. Multiplying color keeps the mesh opaque and
// cheap while still reading as clay emerging from the dark.
export function prepEmerge(pivot) {
  pivot.userData.materials.forEach(m => {
    if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
    m.transparent = false;
    m.opacity = 1;
    m.color.setRGB(0, 0, 0);
  });
}

export function setEmerge(pivot, v) {
  pivot.userData.materials.forEach(m => {
    const b = m.userData.baseColor || m.color;
    m.color.setRGB(b.r * v, b.g * v, b.b * v);
  });
}

export function settleEmerge(pivot) {
  pivot.userData.materials.forEach(m => {
    if (m.userData.baseColor) m.color.copy(m.userData.baseColor);
  });
}

/* ============================================================
   Lighting mood — the museum case, per material
   ============================================================ */

// The default is a warm tungsten case at 2am, which suits fired clay and
// bronze. It does NOT suit marble: the same 0xffc9a0 key renders white stone
// as sandstone, and worst of all at the press-in, where the surface fills the
// frame and colour is all the eye has. A thread can override the mood.
const MOOD_WARM = {
  key: 0xffc9a0, keyI: 95, amb: 0x2a1d12, ambI: 0.62, fillI: 0.28,
  rimI: 78, backI: 30, bg: 0x0D0B09
};
let mood = MOOD_WARM;

export function setThreadMood(m, dur = 0) {
  mood = { ...MOOD_WARM, ...(m || {}) };
  goWarm(dur);
}

// the museum goes away; fluorescent retail flatness. even the darkness is
// taken from you — the void lifts to the noncommittal gray of a store at 9pm
export function goFlat(dur = 3) {
  gsap.to(keyLight, { intensity: 22, duration: dur, ease: 'power1.inOut' });
  gsap.to(keyLight.color, { r: 0.95, g: 0.97, b: 0.94, duration: dur });
  gsap.to(flatLight, { intensity: 1.6, duration: dur, ease: 'power1.inOut' });
  gsap.to(ambient, { intensity: 1.4, duration: dur });
  gsap.to(ambient.color, { r: 0.55, g: 0.58, b: 0.55, duration: dur });
  gsap.to(fillLight, { intensity: 0.5, duration: dur });
  // retail light has no direction at all: the counter-key comes up to meet the
  // key rather than staying subordinate to it
  gsap.to(rimLight, { intensity: 34, duration: dur, ease: 'power1.inOut' });
  gsap.to(rimLight.color, { r: 0.93, g: 0.96, b: 0.93, duration: dur });
  gsap.to(backLight, { intensity: 14, duration: dur, ease: 'power1.inOut' });
  gsap.to(backLight.color, { r: 0.93, g: 0.96, b: 0.93, duration: dur });
  gsap.to(scene.background, { r: BG_FLAT.r, g: BG_FLAT.g, b: BG_FLAT.b, duration: dur });
  gsap.to(scene.fog.color, { r: BG_FLAT.r, g: BG_FLAT.g, b: BG_FLAT.b, duration: dur });
}

// the flat retail void; the warm/cool museum void comes from the thread's mood
const BG_FLAT = new THREE.Color(0x1b1d1b);

// stepping back off the finale — or into a thread: restore this thread's museum
export function goWarm(dur = 3) {
  const kc = new THREE.Color(mood.key);
  const ac = new THREE.Color(mood.amb);
  const bg = new THREE.Color(mood.bg);
  gsap.to(keyLight, { intensity: mood.keyI, duration: dur, ease: 'power1.inOut' });
  gsap.to(keyLight.color, { r: kc.r, g: kc.g, b: kc.b, duration: dur });
  gsap.to(flatLight, { intensity: 0, duration: dur, ease: 'power1.inOut' });
  gsap.to(ambient, { intensity: mood.ambI, duration: dur });
  gsap.to(ambient.color, { r: ac.r, g: ac.g, b: ac.b, duration: dur });
  gsap.to(fillLight, { intensity: mood.fillI, duration: dur });
  const rc = new THREE.Color(mood.rim || 0xc3d2e6);
  const bc = new THREE.Color(mood.back || 0xffd2ab);
  gsap.to(rimLight, { intensity: mood.rimI, duration: dur, ease: 'power1.inOut' });
  gsap.to(rimLight.color, { r: rc.r, g: rc.g, b: rc.b, duration: dur });
  gsap.to(backLight, { intensity: mood.backI, duration: dur, ease: 'power1.inOut' });
  gsap.to(backLight.color, { r: bc.r, g: bc.g, b: bc.b, duration: dur });
  gsap.to(scene.background, { r: bg.r, g: bg.g, b: bg.b, duration: dur });
  gsap.to(scene.fog.color, { r: bg.r, g: bg.g, b: bg.b, duration: dur });
}
