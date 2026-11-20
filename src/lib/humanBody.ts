/**
 * Adapta un cuerpo humano realista (.glb) a la morfología de una persona:
 *
 * 1. Si el archivo trae formas de mezcla (morph targets / shape keys de Blender o MakeHuman)
 *    con nombres reconocibles —peso, delgadez, músculo, sexo— se ajustan sus valores.
 * 2. Si no, se deforman los vértices por zonas: el tronco se ensancha en hombros y cadera, el
 *    abdomen sobresale con la grasa corporal y brazos y piernas engrosan sobre su propio eje.
 * 3. Se tiñe la piel con el tono de la persona.
 *
 * La estatura la pone después el escalado del modelo. La figura mira hacia +x tras el giro.
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { BodyShape } from '@/domain/morphology';

export interface HumanTraits {
  shape: BodyShape;
  /** Grasa corporal según el IMC: -0,35 (muy delgado) a 1,3 (obeso); 0 = medio. */
  fat: number;
  /** Musculatura: 1 mesomorfo, 0 medio o sin dato. */
  muscle: number;
  sexo: 'masculino' | 'femenino' | '';
  skin: string;
  /** Color de cabello, cejas y barba. */
  hair?: string;
  /** Tono medio de la textura de piel del archivo (ver `CustomMesh.skinRef`). */
  skinRef?: string;
  /** Color medio de la textura de cabello del archivo. */
  hairRef?: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Campana suave entre `a` y `b` (0 fuera, 1 en el centro). */
function bump(t: number, a: number, b: number): number {
  if (t <= a || t >= b) return 0;
  const u = (t - a) / (b - a);
  return Math.sin(u * Math.PI);
}

/** Paso suave de 0 (en `a`) a 1 (en `b`). */
function smooth(a: number, b: number, v: number): number {
  const u = clamp01((v - a) / (b - a));
  return u * u * (3 - 2 * u);
}

/** Valor para una forma de mezcla según su nombre, o `null` si no se reconoce. */
export function morphValue(name: string, h: HumanTraits): number | null {
  const n = name.toLowerCase();
  if (/female|woman|mujer|femen/.test(n)) return h.sexo === 'femenino' ? 1 : 0;
  if (/(^|[^e])male|man\b|hombre|mascul/.test(n)) return h.sexo === 'femenino' ? 0 : 1;
  if (/thin|skinny|slim|delg|flac/.test(n)) return clamp01(-h.fat * 2.5);
  if (/weight|fat|heavy|obes|peso|gord|gras|belly|barriga/.test(n)) return clamp01(h.fat);
  if (/muscle|muscul|athlet|fuert|strong/.test(n)) return clamp01(h.muscle);
  return null;
}

/** Tono de referencia de una textura de piel clara cuando el archivo no indica otro. */
const SKIN_BASE = '#f1d3bc';
/** Color medio de referencia de una textura de cabello cuando el archivo no indica otro. */
const HAIR_BASE = '#8f908d';

const isEye = (name: string) => /eye|ojo|iris|cornea|teeth|dient|tongue|lengua/i.test(name);
const isHair = (name: string) =>
  /hair|pelo|cabello|eyebrow|ceja|beard|barba|lash|pesta/i.test(name);
const isSkin = (name: string) =>
  /skin|piel|body|cuerpo|human|head|cabeza|face|cara|arm|leg|torso/i.test(name);

/** Color que, multiplicado por una textura de tono `ref`, da el tono `target`. */
function ratio(target: string, ref: string): THREE.Color {
  const t = new THREE.Color(target);
  const r = new THREE.Color(ref);
  const k = (a: number, b: number) => Math.min(2.5, a / Math.max(0.02, b));
  return new THREE.Color(k(t.r, r.r), k(t.g, r.g), k(t.b, r.b));
}

/** Tiñe piel y cabello. La piel es el material con nombre de piel o el de la malla mayor. */
function tint(root: THREE.Object3D, h: HumanTraits): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const mats = (m: THREE.Mesh) => (Array.isArray(m.material) ? m.material : [m.material]);
  let skinMats = new Set(meshes.flatMap(mats).filter((m) => isSkin(m.name) && !isHair(m.name)));
  if (!skinMats.size) {
    // Sin nombres reconocibles: la piel es el material de la malla con más vértices.
    const big = [...meshes].sort(
      (a, b) =>
        b.geometry.getAttribute('position').count - a.geometry.getAttribute('position').count,
    )[0];
    if (big) skinMats = new Set(mats(big).filter((m) => !isEye(m.name) && !isHair(m.name)));
  }
  const cache = new Map<THREE.Material, THREE.Material>();
  for (const mesh of meshes) {
    const next = mats(mesh).map((mat) => {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.color || isEye(mat.name)) return mat;
      const kind = skinMats.has(mat) ? 'skin' : isHair(mat.name) && h.hair ? 'hair' : null;
      if (!kind) return mat;
      let c = cache.get(mat);
      if (!c) {
        const cl = std.clone();
        const target = kind === 'skin' ? h.skin : h.hair!;
        const ref = kind === 'skin' ? (h.skinRef ?? SKIN_BASE) : (h.hairRef ?? HAIR_BASE);
        // Con textura el color la multiplica; sin textura se usa el tono tal cual.
        if (std.map) cl.color.copy(ratio(target, ref));
        else cl.color.set(target);
        cache.set(mat, (c = cl));
      }
      return c;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0]!;
  }
}

/**
 * Baja los brazos de la pose en T: gira cada brazo (hueso `upperarm`, `upper_arm`, `arm`…)
 * para que cuelgue a los lados, apenas separado del cuerpo.
 */
export function relaxArms(root: THREE.Object3D): boolean {
  let done = false;
  root.updateMatrixWorld(true);
  const bones: THREE.Bone[] = [];
  root.traverse((o) => {
    if (
      (o as THREE.Bone).isBone &&
      /upper.?arm|arm.?upper|^(left|right)?arm(\.|_)?(l|r)?$/i.test(o.name)
    )
      bones.push(o as THREE.Bone);
  });
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (const bone of bones) {
    const child = bone.children.find((c) => (c as THREE.Bone).isBone);
    if (!child || !bone.parent) continue;
    bone.getWorldPosition(a);
    child.getWorldPosition(b);
    const dir = b.sub(a);
    const horiz = new THREE.Vector3(dir.x, 0, dir.z);
    // Solo si el brazo está casi horizontal (pose en T o en A abierta).
    if (dir.lengthSq() < 1e-10 || Math.abs(dir.y) > dir.length() * 0.6) continue;
    horiz.normalize();
    const target = new THREE.Vector3(0, -1, 0).addScaledVector(horiz, 0.2).normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(dir.normalize(), target);
    const world = bone.getWorldQuaternion(new THREE.Quaternion());
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(delta.multiply(world)));
    bone.updateMatrixWorld(true);
    done = true;
  }
  return done;
}

/**
 * Copia del cuerpo adaptada a la persona. `yaw` (radianes) gira el archivo para que mire
 * hacia +x; la copia devuelta va sin ese giro (lo aplica quien la coloca).
 */
export function humanize(source: THREE.Object3D, yaw: number, h: HumanTraits): THREE.Object3D {
  const body = cloneSkinned(source);
  const probe = new THREE.Group();
  probe.rotation.y = yaw;
  probe.add(body);
  probe.updateMatrixWorld(true);

  // 1. Formas de mezcla.
  let morphed = false;
  body.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const dict = mesh.morphTargetDictionary;
    if (!mesh.isMesh || !dict || !mesh.morphTargetInfluences) return;
    mesh.morphTargetInfluences = [...mesh.morphTargetInfluences];
    for (const [name, i] of Object.entries(dict)) {
      const v = morphValue(name, h);
      if (v != null) {
        mesh.morphTargetInfluences[i] = v;
        morphed = true;
      }
    }
  });

  // 2. Deformación por zonas cuando el archivo no trae formas de mezcla.
  if (!morphed) {
    const box = new THREE.Box3().setFromObject(probe, true);
    const H = Math.max(1e-6, box.max.y - box.min.y);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    // Una malla real ya tiene volumen propio: las proporciones se aplican atenuadas.
    const soft = (f: number) => 1 + (f - 1) * 0.6;
    const shoulders = soft(h.shape.shoulders);
    const belly = soft(h.shape.belly);
    const hips = soft(h.shape.hips);
    const limbs = soft(h.shape.limbs);
    const torsoHalf = 0.12 * H;
    const legOff = 0.055 * H;
    const p = new THREE.Vector3();
    body.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry = mesh.geometry.clone();
      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const toProbe = mesh.matrixWorld.clone();
      const back = toProbe.clone().invert();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(toProbe);
        const t = (p.y - box.min.y) / H;
        let dx = p.x - cx;
        let dz = p.z - cz;
        const side = Math.sign(dz) || 1;
        const ad = Math.abs(dz);

        // Piernas: engrosan alrededor de su eje; arriba se suma el ancho de cadera.
        const lc = side * legOff;
        const wLegHip = bump(t, 0.3, 0.64);
        const dzLeg =
          lc * (1 + (hips - 1) * 0.5 * wLegHip) + (dz - lc) * (limbs + (hips - 1) * 0.3 * wLegHip);
        const dxLeg = dx * (limbs + (belly - 1) * 0.3 * wLegHip);

        // Tronco: hombros arriba, cadera abajo, abdomen hacia adelante. Los brazos (fuera del
        // ancho del tronco) se desplazan lo mismo que el borde del tronco, así no se separan.
        const wChest = bump(t, 0.6, 0.9);
        const wHip = bump(t, 0.42, 0.66);
        const wBelly = bump(t, 0.44, 0.7);
        const sz = 1 + (shoulders - 1) * wChest + (hips - 1) * wHip + (belly - 1) * 0.35 * wBelly;
        const dzUp = ad < torsoHalf ? dz * sz : dz + side * torsoHalf * (sz - 1);
        let dxTorso = dx * (1 + (belly - 1) * 0.25 * (wBelly + wChest * 0.5));
        dxTorso *= dx > 0 ? 1 + (belly - 1) * 1.4 * wBelly : 1 + (belly - 1) * 0.3 * wBelly;
        const wArm = smooth(torsoHalf, torsoHalf * 1.4, ad);
        const dxUp = dxTorso * (1 - wArm) + dx * limbs * wArm;

        // Paso suave entre piernas y tronco.
        const wUp = smooth(0.42, 0.52, t);
        dz = dzLeg * (1 - wUp) + dzUp * wUp;
        dx = dxLeg * (1 - wUp) + dxUp * wUp;
        p.set(cx + dx, p.y, cz + dz).applyMatrix4(back);
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    });
  }

  // 3. Piel y cabello; 4. brazos abajo (después de deformar: la deformación usa la pose base).
  tint(body, h);
  relaxArms(body);
  probe.remove(body);
  return body;
}
