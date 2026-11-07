import {
  ACESFilmicToneMapping, Box3, Color, DirectionalLight, DoubleSide, Group,
  HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Raycaster,
  Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
  type Material, type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ANATOMY_ASSET, CAMERA_LIMITS, MUSCLE_COLORS, type AnatomyViewCommand, type WorkingSide } from "@/lib/anatomy/rowing";
import type { ExerciseAnatomyConfig, MuscleGroupId } from "@/lib/anatomy/types";
import { muscleFromMetadata } from "@/lib/anatomy/highlights";

export type SceneOptions = { config: ExerciseAnatomyConfig; side: WorkingSide; selected: MuscleGroupId | null; colors: boolean; xray: boolean; dark: boolean; reducedMotion: boolean };
export type AnatomySceneController = { command: (command: AnatomyViewCommand) => void; update: (options: SceneOptions) => void; dispose: () => void };
export class AnatomySceneError extends Error { constructor(public kind: "webgl" | "model") { super(kind); } }

/** Real named meshes; event-driven rendering only. No background animation loop. */
export async function createAnatomyScene(container: HTMLDivElement, initial: SceneOptions, onSelect: (id: MuscleGroupId) => void, signal: AbortSignal, onFailure?: () => void): Promise<AnatomySceneController> {
  let renderer: WebGLRenderer;
  try {
    const drawing = document.createElement("canvas");
    const context = drawing.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "low-power" });
    if (!context) throw new AnatomySceneError("webgl");
    renderer = new WebGLRenderer({ canvas: drawing, context, antialias: true, alpha: false, powerPreference: "low-power" });
  }
  catch { throw new AnatomySceneError("webgl"); }
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.tabIndex = -1;
  canvas.style.touchAction = "none";
  container.append(canvas);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = .98;
  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, .05, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.rotateSpeed = .5;
  controls.zoomSpeed = .65;
  controls.screenSpacePanning = false;
  controls.minDistance = CAMERA_LIMITS.minDistance;
  controls.maxDistance = CAMERA_LIMITS.maxDistance;
  controls.minPolarAngle = CAMERA_LIMITS.minPolar;
  controls.maxPolarAngle = CAMERA_LIMITS.maxPolar;
  const model = new Group();
  const lighting = new Group();
  // A broad fill and three studio directions reveal the existing geometry.
  // No shadow maps, postprocessing targets or downloaded environment textures.
  const ambient = new HemisphereLight(0xffffff, 0x59657c, 1.05);
  const key = new DirectionalLight(0xfff6eb, 3.1); key.position.set(-3, 4, 4);
  const rim = new DirectionalLight(0xc7d9ff, 1.9); rim.position.set(3, 2, -3);
  const fill = new DirectionalLight(0xffffff, .8); fill.position.set(3, 1, 3);
  lighting.add(key, rim, fill); scene.add(model, ambient, lighting);
  let options = initial;
  let disposed = false, visible = true, frame = 0, transition = 0, highlight = 0, frames = 0;
  let zoomDestination: number | null = null;
  let framing = initial.config.framing;
  let fitDistance: number = CAMERA_LIMITS.initialDistance;
  let modelBounds: Box3 | null = null;
  let focusBounds: Box3 | null = null;
  const focusTarget = new Vector3(0, .32, 0);
  const gl = renderer.getContext();
  const viewportLimit = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
  const maxDrawingDimension = Math.min(renderer.capabilities.maxTextureSize, Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)), viewportLimit[0], viewportLimit[1]);
  const meshes: Mesh[] = [];
  const originals = new Set<Material>();
  let highlights: { material: MeshStandardMaterial; from: number; to: number }[] = [];
  const projected = Array.from({ length: 8 }, () => new Vector3());
  function framingDiagnostics() {
    if (!focusBounds) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      const point = projected[i].set(i & 1 ? focusBounds.max.x : focusBounds.min.x, i & 2 ? focusBounds.max.y : focusBounds.min.y, i & 4 ? focusBounds.max.z : focusBounds.min.z).project(camera);
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    }
    container.dataset.projectedFocus = JSON.stringify({ minX, maxX, minY, maxY });
  }
  function invalidate() {
    if (disposed || frame || !visible || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      lighting.rotation.y = controls.getAzimuthalAngle();
      renderer.render(scene, camera);
      // Privacy-free diagnostics for interaction/performance regression checks.
      container.dataset.renderFrames = String(++frames);
      container.dataset.cameraAzimuth = controls.getAzimuthalAngle().toFixed(4);
      container.dataset.cameraDistance = camera.position.distanceTo(controls.target).toFixed(4);
      container.dataset.cameraTargetY = controls.target.y.toFixed(4);
      container.dataset.cameraPolar = controls.getPolarAngle().toFixed(4);
      container.dataset.cameraFov = String(camera.fov);
      container.dataset.framing = framing;
      container.dataset.fitDistance = fitDistance.toFixed(4);
      container.dataset.renderGeometries = String(renderer.info.memory.geometries);
      container.dataset.renderTextures = String(renderer.info.memory.textures);
      container.dataset.renderCalls = String(renderer.info.render.calls);
      container.dataset.renderTriangles = String(renderer.info.render.triangles);
      framingDiagnostics();
    });
  }
  function measureFraming() {
    if (!modelBounds) return;
    focusBounds = modelBounds.clone();
    // Keep all vertices intact. For rowing, frame head through upper thighs;
    // the complete standing atlas remains available with the full-body command.
    if (framing === "upperBody") focusBounds.min.y = focusBounds.max.y - modelBounds.getSize(new Vector3()).y * .68;
    focusBounds.getCenter(focusTarget);
    const half = focusBounds.getSize(new Vector3()).multiplyScalar(.5);
    const verticalTangent = Math.tan(camera.fov * Math.PI / 360);
    const horizontalTangent = verticalTangent * camera.aspect;
    const horizontalRadius = Math.hypot(half.x, half.z);
    // Conservative depth allowance keeps the head/hands inside the image at
    // both preset orientations and while turning around the vertical axis.
    fitDistance = Math.min(CAMERA_LIMITS.maxDistance, Math.max(CAMERA_LIMITS.minDistance,
      half.y / (verticalTangent * .91) + half.z,
      horizontalRadius / (horizontalTangent * .88) + half.z));
  }
  function resize() {
    if (disposed) return;
    const { width, height } = container.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const ratio = Math.min(window.devicePixelRatio || 1, CAMERA_LIMITS.maxPixelRatio,
      Math.sqrt(CAMERA_LIMITS.maxRenderPixels / (width * height)), maxDrawingDimension / Math.max(width, height));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    container.dataset.pixelRatio = ratio.toFixed(4);
    container.dataset.drawingWidth = String(canvas.width);
    container.dataset.drawingHeight = String(canvas.height);
    container.dataset.maxDrawingDimension = String(maxDrawingDimension);
    const oldFit = fitDistance;
    const zoom = camera.position.distanceTo(controls.target) / oldFit;
    const angle = controls.getAzimuthalAngle(), polar = controls.getPolarAngle();
    camera.aspect = width / height; camera.updateProjectionMatrix();
    measureFraming();
    if (modelBounds) { stopTransition(); setCamera(angle, fitDistance * zoom, polar); }
    invalidate();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; controls.enabled = visible && !document.hidden;
    if (visible) { resize(); invalidate(); } else { cancelAnimationFrame(frame); frame = 0; stopTransition(); stopHighlight(); }
  });
  intersection.observe(container);
  function visibilityChange() {
    controls.enabled = visible && !document.hidden;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; stopTransition(); stopHighlight(); }
    else invalidate();
  }
  document.addEventListener("visibilitychange", visibilityChange);
  controls.addEventListener("change", invalidate);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const pointers = new Set<number>();
  let start: { x: number; y: number; time: number; multiple: boolean } | null = null;
  function stopTransition() { cancelAnimationFrame(transition); transition = 0; zoomDestination = null; container.dataset.transitioning = "false"; }
  function stopHighlight() {
    cancelAnimationFrame(highlight); highlight = 0;
    for (const item of highlights) item.material.emissiveIntensity = item.to;
    highlights = [];
  }
  function down(event: PointerEvent) {
    stopTransition(); pointers.add(event.pointerId);
    if (pointers.size === 1) start = { x: event.clientX, y: event.clientY, time: performance.now(), multiple: false };
    else if (start) start.multiple = true;
  }
  function up(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (!start || start.multiple || pointers.size || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 || performance.now() - start.time > 800) return;
    start = null;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false).find((hit) => (hit.object as Mesh<Mesh["geometry"], MeshStandardMaterial>).material.opacity >= .8);
    if (!hit) return;
    const group = muscleFromMetadata(options.config, hit.object.userData, options.side);
    if (group) { container.dataset.selectedMesh = String(hit.object.userData.muscleId); onSelect(group.id); }
  }
  function cancel(event: PointerEvent) { pointers.delete(event.pointerId); start = null; }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("wheel", stopTransition, { passive: true });
  function contextLost(event: Event) { event.preventDefault(); if (!disposed) { dispose(); onFailure?.(); } }
  canvas.addEventListener("webglcontextlost", contextLost);
  function setCamera(angle: number, distance: number, polar = Math.PI / 2) {
    const radius = Math.max(CAMERA_LIMITS.minDistance, Math.min(CAMERA_LIMITS.maxDistance, distance));
    const phi = Math.max(CAMERA_LIMITS.minPolar, Math.min(CAMERA_LIMITS.maxPolar, polar));
    camera.position.set(Math.sin(angle) * Math.sin(phi) * radius, Math.cos(phi) * radius, Math.cos(angle) * Math.sin(phi) * radius).add(controls.target);
    controls.update(); invalidate();
  }
  controls.target.copy(focusTarget);
  setCamera(Math.PI, CAMERA_LIMITS.initialDistance);
  function update(next: SceneOptions) {
    const changedExercise = options.config.id !== next.config.id;
    const animateSelection = !changedExercise && (options.selected !== next.selected || options.side !== next.side);
    options = next;
    stopHighlight();
    if (next.reducedMotion) stopTransition();
    const palette = MUSCLE_COLORS[next.dark ? "dark" : "light"];
    scene.background = new Color(palette.background);
    ambient.intensity = next.dark ? 1.2 : 1.05;
    const selectedGroup = next.config.muscles.find((group) => group.id === next.selected);
    // Mixed superficial/deep groups (quadriceps, hamstrings…) stay readable as
    // a whole. Auto-reveal only a fully deep group; xray is always available.
    const selectedMeshes = meshes.filter((mesh) => selectedGroup?.keys.includes(mesh.userData.key));
    const reveal = next.xray || !!selectedGroup?.deep && selectedMeshes.length > 0 && selectedMeshes.every((mesh) => mesh.userData.layer === "deep");
    for (const mesh of meshes) {
      const material = mesh.material as MeshStandardMaterial;
      const group = muscleFromMetadata(next.config, mesh.userData, next.side);
      const chosen = group?.id === next.selected;
      material.color.set(next.colors && group ? palette[group.role] : palette.neutral);
      material.emissive.set(chosen ? next.colors ? palette[group!.role] : palette.neutral : 0x000000);
      const intensity = chosen ? .13 : 0;
      if (animateSelection && !next.reducedMotion && visible && !document.hidden && material.emissiveIntensity !== intensity) highlights.push({ material, from: material.emissiveIntensity, to: intensity });
      else material.emissiveIntensity = intensity;
      material.roughness = chosen ? .44 : .58;
      const faded = reveal && !chosen && !selectedGroup?.unavailable && (next.selected !== null || mesh.userData.layer !== "deep");
      const transparent = faded;
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
      material.opacity = faded ? .12 : 1;
      material.depthWrite = !faded;
      mesh.renderOrder = faded ? 0 : 1;
    }
    if (highlights.length) {
      const began = performance.now();
      function emphasize(now: number) {
        if (disposed || !visible || document.hidden) { stopHighlight(); return; }
        const progress = Math.min(1, (now - began) / 180);
        const eased = 1 - (1 - progress) ** 3;
        for (const item of highlights) item.material.emissiveIntensity = item.from + (item.to - item.from) * eased;
        invalidate();
        if (progress < 1) highlight = requestAnimationFrame(emphasize); else { highlight = 0; highlights = []; }
      }
      highlight = requestAnimationFrame(emphasize);
    }
    if (changedExercise) {
      stopTransition(); framing = next.config.framing; measureFraming();
      controls.target.copy(focusTarget); setCamera(next.config.initialView === "back" ? Math.PI : 0, fitDistance);
      delete container.dataset.selectedMesh;
    }
    container.dataset.exercise = next.config.id;
    container.dataset.neutralColorErrors = String(meshes.filter((mesh) => !muscleFromMetadata(next.config, mesh.userData, next.side) && (mesh.material as MeshStandardMaterial).color.getHexString() !== palette.neutral.slice(1)).length);
    container.dataset.highlightedMeshes = JSON.stringify(meshes.filter((mesh) => muscleFromMetadata(next.config, mesh.userData, next.side)).map((mesh) => ({ id: mesh.userData.muscleId, role: muscleFromMetadata(next.config, mesh.userData, next.side)!.role, color: (mesh.material as MeshStandardMaterial).color.getHexString() })));
    invalidate();
  }
  function disposeObject(root: Object3D) {
    const geometries = new Set<Mesh["geometry"]>();
    const materials = new Set<Material>();
    root.traverse((object) => { if (object instanceof Mesh) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } });
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stopTransition(); stopHighlight(); cancelAnimationFrame(frame);
    signal.removeEventListener("abort", dispose);
    resizeObserver.disconnect(); intersection.disconnect();
    document.removeEventListener("visibilitychange", visibilityChange);
    canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", cancel); canvas.removeEventListener("wheel", stopTransition);
    canvas.removeEventListener("webglcontextlost", contextLost);
    controls.dispose(); disposeObject(model); originals.forEach((material) => material.dispose());
    scene.clear(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    delete container.dataset.renderFrames;
  }
  signal.addEventListener("abort", dispose, { once: true });
  try {
    const response = await fetch(ANATOMY_ASSET.url, { signal, cache: "force-cache" });
    if (!response.ok) throw new AnatomySceneError("model");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== ANATOMY_ASSET.bytes) throw new AnatomySceneError("model");
    const gltf = await new GLTFLoader().parseAsync(buffer, "/models/anatomy/");
    if (disposed || signal.aborted) { disposeObject(gltf.scene); throw new DOMException("Aborted", "AbortError"); }
    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) originals.add(material);
      object.material = new MeshStandardMaterial({ roughness: .58, metalness: .025, side: DoubleSide });
      meshes.push(object);
    });
    model.add(gltf.scene);
    const bounds = new Box3().setFromObject(model);
    const height = bounds.getSize(new Vector3()).y;
    if (!Number.isFinite(height) || height <= 0) throw new AnatomySceneError("model");
    model.scale.setScalar(2 / height);
    const center = new Box3().setFromObject(model).getCenter(new Vector3());
    model.position.sub(center);
    modelBounds = new Box3().setFromObject(model);
    let geometryBytes = 0;
    const arrays = new Set<{ byteLength: number }>();
    for (const mesh of meshes) {
      for (const attribute of Object.values(mesh.geometry.attributes)) arrays.add(attribute.array);
      if (mesh.geometry.index) arrays.add(mesh.geometry.index.array);
    }
    arrays.forEach((array) => { geometryBytes += array.byteLength; });
    container.dataset.geometryBytes = String(geometryBytes);
    container.dataset.meshCount = String(meshes.length);
    update(initial); resize();
    // Apply a fresh fit after the initial canvas measurement, without retaining
    // the pre-load placeholder zoom ratio.
    controls.target.copy(focusTarget); setCamera(options.config.initialView === "back" ? Math.PI : 0, fitDistance);
    invalidate();
  } catch (error) { dispose(); if (signal.aborted) throw error; throw error instanceof AnatomySceneError ? error : new AnatomySceneError("model"); }
  return {
    update,
    command(command) {
      if (disposed) return;
      // Repeated zoom taps should accumulate even if a slow device has not yet
      // drawn the previous tween. Pointer/wheel interaction clears this intent.
      const pendingZoom = zoomDestination;
      stopTransition();
      const current = controls.getAzimuthalAngle();
      const polar = controls.getPolarAngle();
      const distance = camera.position.distanceTo(controls.target);
      const oldTarget = controls.target.clone();
      if (command === "reset" || command === "fullBody") {
        framing = command === "fullBody" ? "fullBody" : options.config.framing;
        measureFraming();
      }
      const target = command === "front" ? 0 : command === "back" ? Math.PI : command === "reset" ? options.config.initialView === "back" ? Math.PI : 0 : current + (command === "left" ? Math.PI / 8 : -Math.PI / 8);
      const rotates = ["front", "back", "left", "right", "reset"].includes(command);
      const delta = rotates ? Math.atan2(Math.sin(target - current), Math.cos(target - current)) : 0;
      const fits = command === "reset" || command === "fullBody";
      const zoomBase = pendingZoom ?? distance;
      const finalDistance = Math.max(CAMERA_LIMITS.minDistance, Math.min(CAMERA_LIMITS.maxDistance,
        fits ? fitDistance : command === "zoomIn" ? zoomBase * .85 : command === "zoomOut" ? zoomBase * 1.15 : distance));
      const finalPolar = fits ? Math.PI / 2 : polar;
      const finalTarget = fits ? focusTarget.clone() : oldTarget.clone();
      if (options.reducedMotion) { controls.target.copy(finalTarget); setCamera(current + delta, finalDistance, finalPolar); return; }
      if (command === "zoomIn" || command === "zoomOut") zoomDestination = finalDistance;
      const began = performance.now();
      container.dataset.transitioning = "true";
      function step(now: number) {
        if (disposed || document.hidden || !visible) { stopTransition(); return; }
        const progress = Math.min(1, (now - began) / 280);
        const eased = 1 - (1 - progress) ** 3;
        controls.target.lerpVectors(oldTarget, finalTarget, eased);
        setCamera(current + delta * eased, distance + (finalDistance - distance) * eased, polar + (finalPolar - polar) * eased);
        if (progress < 1) transition = requestAnimationFrame(step); else { transition = 0; zoomDestination = null; container.dataset.transitioning = "false"; }
      }
      transition = requestAnimationFrame(step);
    },
    dispose() { signal.removeEventListener("abort", dispose); dispose(); },
  };
}
