/**
 * Convierte un `Model3D` (piezas puras de `domain/models3d`, o un archivo .glb propio) en
 * objetos de three.js. Lo usan el taller 3D y la capa de modelos de la vista 3D del mapa.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { formation } from '@/domain/model3d/people';
import { bmi, bodyShape } from '@/domain/morphology';
import { domainOf, modelParts, type Model3D, type Part } from '@/domain/models3d';
import { humanize, type HumanTraits } from './humanBody';
import { getMedia } from './mediaStore';

const AXIS_ROT: Record<'x' | 'y' | 'z', THREE.Euler> = {
  x: new THREE.Euler(0, 0, -Math.PI / 2),
  y: new THREE.Euler(0, 0, 0),
  z: new THREE.Euler(Math.PI / 2, 0, 0),
};

const materials = new Map<string, THREE.MeshStandardMaterial>();
function material(color: string, opacity = 1, twoSided = false): THREE.MeshStandardMaterial {
  const key = `${color}|${opacity}|${twoSided}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.62,
      metalness: 0.18,
      transparent: opacity < 1,
      opacity,
      side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
      depthWrite: opacity >= 1,
      // Prismas y tornos: caras visibles por ambos lados (el sentido del polígono no importa).
      ...(twoSided ? { side: THREE.DoubleSide } : {}),
    });
    materials.set(key, m);
  }
  return m;
}

function rotorObject(p: Extract<Part, { shape: 'rotor' }>): THREE.Object3D {
  // El grupo exterior orienta el eje; el interior gira sobre su Y.
  const holder = new THREE.Group();
  holder.setRotationFromEuler(AXIS_ROT[p.axis]);
  const spin = new THREE.Group();
  spin.userData.spin = true;
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(p.r, p.r, p.r * 0.01 + 0.005, 40),
    material('#c9d2db', 0.09),
  );
  spin.add(disc);
  const bladeMat = material(p.color);
  for (let i = 0; i < p.blades; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(p.r * 0.96, Math.max(p.r * 0.02, 0.01), Math.max(p.r * 0.09, 0.02)),
      bladeMat,
    );
    const a = (2 * Math.PI * i) / p.blades;
    blade.position.set((Math.cos(a) * p.r) / 2, 0, (Math.sin(a) * p.r) / 2);
    blade.rotation.y = -a;
    spin.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(Math.max(p.r * 0.07, 0.02), 12, 8), bladeMat);
  spin.add(hub);
  holder.add(spin);
  return holder;
}

function partObject(p: Part): THREE.Object3D {
  let obj: THREE.Object3D;
  switch (p.shape) {
    case 'box':
      obj = new THREE.Mesh(new THREE.BoxGeometry(...p.size), material(p.color, p.opacity));
      break;
    case 'ellipsoid': {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 24, 16),
        material(p.color, p.opacity),
      );
      mesh.scale.set(...p.size);
      obj = mesh;
      break;
    }
    case 'cyl': {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(p.r2 ?? p.r, p.r, p.len, 24),
        material(p.color, p.opacity),
      );
      const holder = new THREE.Group();
      holder.setRotationFromEuler(AXIS_ROT[p.axis]);
      holder.add(mesh);
      obj = holder;
      break;
    }
    case 'rotor':
      obj = rotorObject(p);
      break;
    case 'prism': {
      const shape = new THREE.Shape(p.pts.map(([a, b]) => new THREE.Vector2(a, b)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: p.depth, bevelEnabled: false });
      if (p.plane === 'xy') geo.translate(0, 0, -p.depth / 2);
      else {
        // Planta (x, z): la forma se dibuja en (x, y) y se gira para que su «y» pase a z y la
        // extrusión quede vertical.
        geo.rotateX(Math.PI / 2);
        geo.translate(0, p.depth / 2, 0);
      }
      geo.computeVertexNormals();
      obj = new THREE.Mesh(geo, material(p.color, p.opacity, true));
      break;
    }
    case 'limb': {
      const d = new THREE.Vector3(p.to[0] - p.pos[0], p.to[1] - p.pos[1], p.to[2] - p.pos[2]);
      const len = d.length();
      const r1 = p.r;
      const r2 = p.r2 ?? p.r;
      // Perfil: media esfera abajo (radio r1), tronco cónico y media esfera arriba (radio r2).
      const pts: THREE.Vector2[] = [];
      const N = 6;
      for (let i = 0; i <= N; i++) {
        const a = -Math.PI / 2 + (Math.PI / 2) * (i / N);
        pts.push(new THREE.Vector2(Math.cos(a) * r1, Math.sin(a) * r1));
      }
      for (let i = 0; i <= N; i++) {
        const a = (Math.PI / 2) * (i / N);
        pts.push(new THREE.Vector2(Math.cos(a) * r2, len + Math.sin(a) * r2));
      }
      const geo = new THREE.LatheGeometry(pts, 18);
      const mesh = new THREE.Mesh(geo, material(p.color, p.opacity, true));
      if (len > 1e-9) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      obj = mesh;
      break;
    }
    case 'lathe': {
      const geo = new THREE.LatheGeometry(
        p.pts.map(([x, r]) => new THREE.Vector2(Math.max(0, r), x)),
        28,
      );
      // El torno gira alrededor de y: se lleva ese eje a x.
      geo.rotateZ(-Math.PI / 2);
      if (p.squash) geo.scale(1, p.squash, 1);
      obj = new THREE.Mesh(geo, material(p.color, p.opacity, true));
      break;
    }
  }
  const wrap = new THREE.Group();
  wrap.position.set(...p.pos);
  if (p.rot) wrap.rotation.set(...p.rot);
  wrap.add(obj);
  return wrap;
}

/** Grupo con todas las piezas del modelo (en metros, nariz hacia +X, arriba +Y). */
export function buildModel(m: Model3D): THREE.Group {
  const g = new THREE.Group();
  for (const p of modelParts(m)) g.add(partObject(p));
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.userData.modelId = m.id;
  return g;
}

/** Gira los rotores y hélices según el tiempo (segundos). */
export function spinRotors(g: THREE.Object3D, seconds: number): void {
  g.traverse((o) => {
    if (o.userData.spin) o.rotation.y = seconds * 22;
  });
}

/** Libera las geometrías del grupo (los materiales se comparten y se conservan). */
export function disposeModel(g: THREE.Object3D): void {
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry.dispose();
  });
}

// ---------------------------------------------------------------- modelos propios (.glb)

interface MeshTemplate {
  scene: THREE.Object3D;
  clips: THREE.AnimationClip[];
}

const templates = new Map<string, Promise<MeshTemplate | null>>();

/** Lee y analiza un .glb del almacén de adjuntos (una sola vez por archivo). */
export function loadMesh(id: string): Promise<MeshTemplate | null> {
  let p = templates.get(id);
  if (!p) {
    p = (async () => {
      try {
        // Modelos incluidos en la app: se cargan por su ruta pública.
        if (id.startsWith('/')) {
          const gltf = await new GLTFLoader().loadAsync(id);
          return { scene: gltf.scene, clips: gltf.animations };
        }
        const blob = await getMedia(id).catch(() => undefined);
        if (!blob) return null;
        const gltf = await new GLTFLoader().parseAsync(await blob.arrayBuffer(), '');
        return { scene: gltf.scene, clips: gltf.animations };
      } catch {
        return null;
      }
    })();
    templates.set(id, p);
  }
  return p;
}

/** El modelo con sus piezas adicionales (cabello, barba…) en un solo grupo. */
async function loadWithParts(id: string, parts: string[]): Promise<MeshTemplate | null> {
  const [main, ...extra] = await Promise.all([id, ...parts].map(loadMesh));
  if (!main) return null;
  if (!parts.length) return main;
  const scene = new THREE.Group();
  scene.add(cloneSkinned(main.scene));
  for (const e of extra) if (e) scene.add(e.scene.clone());
  return { scene, clips: main.clips };
}

/** Nombres de las animaciones de un modelo propio. */
export const meshClipNames = async (id: string): Promise<string[]> =>
  (await loadMesh(id))?.clips.map((c) => c.name) ?? [];

/** Valor de `anim` que desactiva la animación. */
export const NO_ANIM = '(ninguna)';

function pickClip(clips: THREE.AnimationClip[], wanted: string): THREE.AnimationClip | undefined {
  if (wanted === NO_ANIM) return undefined;
  if (wanted) return clips.find((c) => c.name === wanted);
  return clips.find((c) => /walk|camin|march|run|idle|repos/i.test(c.name)) ?? clips[0];
}

/** Rasgos para adaptar un cuerpo humano a la morfología del modelo. */
function traitsOf(m: Model3D): HumanTraits {
  const b = m.body!;
  const v = bmi({ estatura: m.length * 100, peso: b.peso });
  return {
    // El archivo ya tiene la forma de su sexo: las proporciones solo siguen peso y somatotipo.
    shape: bodyShape({
      estatura: m.length * 100,
      peso: b.peso,
      somatotipo: b.somatotipo,
      sexo: '',
    }),
    fat: v == null ? 0 : Math.max(-0.35, Math.min(1.3, (v - 22.5) / 9)),
    muscle: b.somatotipo === 'mesomorfo' ? 1 : 0,
    sexo: b.sexo,
    skin: b.piel,
    hair: b.cabello,
    ...(m.mesh?.skinRef ? { skinRef: m.mesh.skinRef } : {}),
    ...(m.mesh?.hairRef ? { hairRef: m.mesh.hairRef } : {}),
  };
}

/**
 * Copias del modelo propio ya escaladas a las medidas del `Model3D`: el largo (o la estatura,
 * en la infantería) manda; el frente queda hacia +x y la base en y = 0 (centrado si vuela).
 * La infantería repite la figura en cada puesto de la formación.
 */
function placeMesh(m: Model3D, t: MeshTemplate, mixers: THREE.AnimationMixer[]): THREE.Group {
  const mesh = m.mesh!;
  const domain = domainOf(m.base);
  const yaw = (mesh.yaw * Math.PI) / 180;
  // Con morfología, el cuerpo humano se adapta a la persona antes de medirlo.
  const source = m.body ? humanize(t.scene, yaw, traitsOf(m)) : t.scene;
  const probe = new THREE.Group();
  probe.rotation.y = yaw;
  probe.add(cloneSkinned(source));
  probe.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(probe, true);
  const size = b.getSize(new THREE.Vector3());
  const ref = domain === 'personal' ? size.y : size.x;
  const k = ref > 1e-6 ? m.length / ref : 1;
  const cx = (b.min.x + b.max.x) / 2;
  const cz = (b.min.z + b.max.z) / 2;
  const cy = domain === 'aire' ? (b.min.y + b.max.y) / 2 : b.min.y;
  const clip = pickClip(t.clips, mesh.anim);

  const slots: [number, number][] =
    domain === 'personal' ? formation(m.variant, m.engines, m.span) : [[0, 0]];
  const out = new THREE.Group();
  slots.forEach(([x, z], i) => {
    const inner = i === 0 ? probe : new THREE.Group();
    if (i > 0) {
      inner.rotation.y = probe.rotation.y;
      inner.add(cloneSkinned(source));
    }
    const holder = new THREE.Group();
    holder.scale.setScalar(k);
    holder.position.set(x - cx * k, -cy * k, z - cz * k);
    holder.add(inner);
    out.add(holder);
    if (clip) {
      const mixer = new THREE.AnimationMixer(inner);
      const action = mixer.clipAction(clip);
      action.play();
      // Cada integrante va un poco desfasado para que no se muevan al unísono.
      action.time = (i * 0.37) % Math.max(clip.duration, 0.01);
      mixers.push(mixer);
    }
  });
  out.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      // La capa del mapa usa una cámara con matriz propia: no recortar por el frustum.
      o.frustumCulled = false;
    }
  });
  return out;
}

export interface ModelInstance {
  root: THREE.Group;
  /** Avanza rotores y animaciones (`seconds`: tiempo total; `dt`: desde el último cuadro). */
  update(seconds: number, dt: number): void;
  dispose(): void;
}

/**
 * Objeto listo para la escena. Si el modelo tiene un archivo propio, muestra las piezas
 * paramétricas mientras carga y luego las reemplaza (`onLoad` avisa para redibujar).
 */
export function instantiateModel(m: Model3D, onLoad?: () => void): ModelInstance {
  const root = new THREE.Group();
  let proc: THREE.Group | null = buildModel(m);
  root.add(proc);
  const mixers: THREE.AnimationMixer[] = [];
  let disposed = false;
  if (m.mesh)
    void loadWithParts(m.mesh.id, m.mesh.parts ?? []).then((t) => {
      if (disposed || !t || !proc) return;
      root.remove(proc);
      disposeModel(proc);
      proc = null;
      root.add(placeMesh(m, t, mixers));
      onLoad?.();
    });
  return {
    root,
    update(seconds, dt) {
      if (proc) spinRotors(proc, seconds);
      for (const mx of mixers) mx.update(dt);
    },
    dispose() {
      disposed = true;
      // Las geometrías del archivo propio se comparten entre copias: solo se liberan las paramétricas.
      if (proc) disposeModel(proc);
      for (const mx of mixers) mx.stopAllAction();
    },
  };
}
