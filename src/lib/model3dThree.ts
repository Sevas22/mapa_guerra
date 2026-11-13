/**
 * Convierte un `Model3D` (piezas puras de `domain/models3d`) en objetos de three.js. Lo usan
 * el taller 3D y la capa de modelos de la vista 3D del mapa.
 */
import * as THREE from 'three';
import { modelParts, type Model3D, type Part } from '@/domain/models3d';

const AXIS_ROT: Record<'x' | 'y' | 'z', THREE.Euler> = {
  x: new THREE.Euler(0, 0, -Math.PI / 2),
  y: new THREE.Euler(0, 0, 0),
  z: new THREE.Euler(Math.PI / 2, 0, 0),
};

const materials = new Map<string, THREE.MeshStandardMaterial>();
function material(color: string, opacity = 1): THREE.MeshStandardMaterial {
  const key = `${color}|${opacity}`;
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
