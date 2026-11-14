import {
  ACESFilmicToneMapping, Box3, Color, DirectionalLight, DoubleSide, Group,
  HemisphereLight, MeshStandardMaterial, PerspectiveCamera, Scene, SRGBColorSpace,
  Vector3, WebGLRenderer, type Mesh, type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ANATOMY_ASSET } from "@/lib/anatomy/rowing";

/**
 * Sign-in / sign-out intro: the muscles of the shared anatomy model fly onto the
 * skeleton, then the figure turns while named muscle groups light up. It reuses the
 * model and lighting of the "Muscles 3D" viewer but is a fixed sequence, not a viewer.
 */
export type MuscleKey =
  | "deltoids" | "chest" | "biceps" | "abs" | "obliques" | "forearms" | "quadriceps" | "tibialis"
  | "traps" | "triceps" | "lats" | "lowerBack" | "glutes" | "hamstrings" | "calves";

type Step = { key: MuscleKey; match: string[]; anchor: string; side: "left" | "right"; face: "front" | "back" };

// Facing the camera the body's left is on screen right; seen from behind it is on screen left.
export const INTRO_STEPS: Step[] = [
  { key: "deltoids", match: ["deltoid_"], anchor: "deltoid_lateral_right", side: "left", face: "front" },
  { key: "chest", match: ["pectoralis_major_"], anchor: "pectoralis_major_sternocostal_left", side: "right", face: "front" },
  { key: "biceps", match: ["biceps_brachii_", "brachialis_"], anchor: "biceps_brachii_long_right", side: "left", face: "front" },
  { key: "abs", match: ["rectus_abdominis_"], anchor: "rectus_abdominis_left", side: "right", face: "front" },
  { key: "obliques", match: ["external_oblique_"], anchor: "external_oblique_right", side: "left", face: "front" },
  { key: "forearms", match: ["brachioradialis_muscle_", "flexor_carpi_radialis_", "palmaris_longus_muscle_", "extensor_carpi_radialis_longus_", "extensor_carpi_radialis_brevis_", "extensor_digitorum_", "humeral_head_of_flexor_carpi_ulnaris_", "humeral_head_of_extensor_carpi_ulnaris_"], anchor: "brachioradialis_muscle_left", side: "right", face: "front" },
  { key: "quadriceps", match: ["rectus_femoris_", "vastus_lateralis_", "vastus_medialis_", "vastus_intermedius_"], anchor: "vastus_lateralis_right", side: "left", face: "front" },
  { key: "tibialis", match: ["tibialis_anterior_"], anchor: "tibialis_anterior_left", side: "right", face: "front" },
  { key: "traps", match: ["trapezius_"], anchor: "trapezius_upper_left", side: "left", face: "back" },
  { key: "triceps", match: ["triceps_"], anchor: "triceps_long_right", side: "right", face: "back" },
  { key: "lats", match: ["latissimus_dorsi_"], anchor: "latissimus_dorsi_left", side: "left", face: "back" },
  { key: "lowerBack", match: ["iliocostalis_lumborum_", "longissimus_thoracis_", "spinalis_thoracis_", "multifidus_lumborum_"], anchor: "iliocostalis_lumborum_right", side: "right", face: "back" },
  { key: "glutes", match: ["gluteus_maximus_", "gluteus_medius_"], anchor: "gluteus_maximus_left", side: "left", face: "back" },
  { key: "hamstrings", match: ["biceps_femoris_long_", "biceps_femoris_short_", "semitendinosus_", "semimembranosus_"], anchor: "biceps_femoris_long_left", side: "left", face: "back" },
  { key: "calves", match: ["gastrocnemius_", "soleus_"], anchor: "gastrocnemius_lateral_right", side: "right", face: "back" },
];

export type IntroKind = "full" | "reduced";
export type IntroTimeline = { assemble: number; steps: number[]; toBack: [number, number] | null; toFront: [number, number] | null; brand: number; end: number; turn: boolean };

const FLIGHT = 750;
const FLASH = 400;

/** Milliseconds from the start of the intro. A step at Infinity never lights. */
export function introTimeline(kind: IntroKind): IntroTimeline {
  const front = INTRO_STEPS.filter((step) => step.face === "front").length;
  if (kind === "reduced") return { assemble: 0, steps: INTRO_STEPS.map((step) => step.face === "front" ? 150 : Infinity), toBack: null, toFront: null, brand: 400, end: 1600, turn: false };
  const a = 2100;
  return {
    assemble: a,
    steps: INTRO_STEPS.map((step, index) => step.face === "front" ? a + 600 + index * 250 : a + 4250 + (index - front) * 250),
    toBack: [a + 2650, a + 4050], toFront: [a + 5950, a + 7350], brand: a + 7050, end: a + 8050, turn: true,
  };
}

export type IntroAnchor = { x: number; y: number; visible: number; lit: number };
export type IntroScene = {
  resize(width: number, height: number): void;
  /** Renders time `t` and returns where each step's label points, in canvas pixels. */
  frame(t: number): IntroAnchor[];
  reset(): void;
  dispose(): void;
};

type Flight = { mesh: Mesh; base: Vector3; offset: Vector3; delay: number };
type StepState = { group: Mesh[]; anchorMesh: Mesh; local: Vector3; progress: number };

const ease = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const baseName = (mesh: Object3D) => mesh.name.replace(/__mobile.*$/, "").replace(/\.\d+$/, "");

export async function createIntroScene(canvas: HTMLCanvasElement, options: { timeline: IntroTimeline; dark: boolean; accent: string; signal: AbortSignal }): Promise<IntroScene> {
  const { timeline, signal } = options;
  const response = await fetch(ANATOMY_ASSET.url, { signal, cache: "force-cache" });
  if (!response.ok) throw new Error("anatomy model");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== ANATOMY_ASSET.bytes) throw new Error("anatomy model");
  const gltf = await new GLTFLoader().parseAsync(buffer, "/models/anatomy/");
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.05, 40);
  camera.position.set(0, -0.25, 5);
  camera.lookAt(0, -0.25, 0);
  // Same lighting as the "Muscles 3D" viewer.
  scene.add(new HemisphereLight(0xffffff, 0x59657c, 1.05));
  const key = new DirectionalLight(0xfff6eb, 3.1); key.position.set(-3, 4, 4); scene.add(key);
  const rim = new DirectionalLight(0xc7d9ff, 1.9); rim.position.set(3, 2, -3); scene.add(rim);
  const fill = new DirectionalLight(0xffffff, 0.8); fill.position.set(3, 1, 3); scene.add(fill);

  const accent = new Color(options.accent);
  const neutral = new Color(options.dark ? 0x8d929e : 0xb9bcc6);
  const bone = new Color(0xd8d2c4);
  const meshes: Mesh[] = [];
  const muscles: Mesh[] = [];
  gltf.scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const source = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name ?? "";
    const isBone = /bone/i.test(source);
    mesh.material = new MeshStandardMaterial({ color: isBone ? bone : neutral, roughness: 0.58, metalness: 0.025, side: DoubleSide });
    mesh.userData.base = (mesh.material as MeshStandardMaterial).color.clone();
    meshes.push(mesh);
    // Head, hands and feet stay with the skeleton so the figure reads as a man from the start.
    if (/muscle/i.test(source) && !/head_hands_feet/.test(mesh.name)) muscles.push(mesh);
  });
  const model = new Group();
  model.add(gltf.scene);
  scene.add(model);
  const size = new Box3().setFromObject(model).getSize(new Vector3());
  model.scale.setScalar(2 / size.y);
  model.position.sub(new Box3().setFromObject(model).getCenter(new Vector3()));
  model.updateMatrixWorld(true);

  // Each muscle starts away from the body along the direction it faces; feet first.
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const flights: Flight[] = muscles.map((mesh) => {
    mesh.geometry.computeBoundingBox();
    const world = mesh.localToWorld(mesh.geometry.boundingBox!.getCenter(new Vector3()));
    const direction = new Vector3(world.x * 2.2, world.y * 0.25 + 0.15, world.z * 2.2 + (world.z >= 0 ? 0.25 : -0.25));
    if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
    direction.normalize().multiplyScalar(0.9 + random() * 0.6);
    const from = mesh.parent!.worldToLocal(world.clone());
    const to = mesh.parent!.worldToLocal(world.clone().add(direction));
    return { mesh, base: mesh.position.clone(), offset: to.sub(from), delay: world.y };
  }).sort((a, b) => a.delay - b.delay);
  flights.forEach((flight, index) => { flight.delay = 450 + (index / Math.max(1, flights.length - 1)) * 900; });

  const steps: StepState[] = INTRO_STEPS.map((step) => {
    const group = meshes.filter((mesh) => step.match.some((prefix) => baseName(mesh).startsWith(prefix)));
    const anchorMesh = meshes.find((mesh) => baseName(mesh) === step.anchor) ?? group[0];
    anchorMesh.geometry.computeBoundingBox();
    return { group, anchorMesh, local: anchorMesh.geometry.boundingBox!.getCenter(new Vector3()), progress: -1 };
  });

  let assembled = false;
  let width = 1, height = 1;
  const material = (mesh: Mesh) => mesh.material as MeshStandardMaterial;

  function reset() {
    assembled = false;
    for (const step of steps) step.progress = -1;
    for (const { mesh } of flights) { material(mesh).transparent = true; material(mesh).needsUpdate = true; }
  }

  function assemble(t: number) {
    if (assembled) return;
    const finished = !timeline.assemble || t >= timeline.assemble + FLASH;
    for (const flight of flights) {
      const m = material(flight.mesh);
      const p = finished ? 1 : clamp((t - flight.delay) / FLIGHT);
      flight.mesh.position.copy(flight.base).addScaledVector(flight.offset, 1 - (1 - Math.pow(1 - p, 3)));
      m.opacity = Math.min(1, p / 0.4);
      const flash = finished ? 1 : clamp((t - flight.delay - FLIGHT) / FLASH);
      m.emissive.copy(accent).multiplyScalar(p >= 1 && flash < 1 ? 0.45 * (1 - flash) : 0);
    }
    if (finished) {
      for (const { mesh } of flights) { material(mesh).transparent = false; material(mesh).needsUpdate = true; }
      assembled = true;
    }
  }

  reset();
  return {
    resize(w, h) {
      width = Math.max(1, w); height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    frame(t) {
      const span = (range: [number, number] | null) => range ? ease(clamp((t - range[0]) / (range[1] - range[0]))) : 0;
      const settle = ease(clamp(t / (timeline.assemble + 900)));
      model.rotation.y = timeline.turn ? -0.45 * (1 - settle) + Math.PI * (span(timeline.toBack) + span(timeline.toFront)) : 0;
      camera.position.z = 5.3 - settle * 0.3;
      const facing = Math.cos(model.rotation.y);
      assemble(t);
      const anchors = steps.map((state, index) => {
        const lit = clamp((t - timeline.steps[index]) / 450);
        if (lit !== state.progress) {
          state.progress = lit;
          for (const mesh of state.group) {
            material(mesh).color.copy(mesh.userData.base as Color).lerp(accent, lit);
            material(mesh).emissive.copy(accent).multiplyScalar(0.28 * lit);
          }
        }
        const toward = INTRO_STEPS[index].face === "front" ? facing : -facing;
        const visible = t >= timeline.steps[index] ? clamp((toward - 0.35) / 0.4) : 0;
        if (!visible) return { x: 0, y: 0, visible: 0, lit };
        const point = state.anchorMesh.localToWorld(state.local.clone()).project(camera);
        return { x: (point.x + 1) / 2 * width, y: (1 - point.y) / 2 * height, visible, lit };
      });
      renderer.render(scene, camera);
      return anchors;
    },
    reset,
    dispose() {
      renderer.dispose();
      model.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        material(mesh).dispose();
      });
    },
  };
}
