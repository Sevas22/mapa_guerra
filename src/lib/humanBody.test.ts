import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { bodyShape } from '@/domain/morphology';
import { humanize, morphValue, type HumanTraits } from './humanBody';
import { buildModel } from './model3dThree';
import { newModel, PRESETS } from '@/domain/models3d';

/** Malla única con forma humana (la figura civil paramétrica), mirando hacia +z como un .glb. */
function fakeHuman(): THREE.Object3D {
  const m = newModel(PRESETS.find((p) => p.name === 'Soldado')!);
  const g = buildModel({ ...m, payload: 'ninguna', body: undefined });
  g.updateMatrixWorld(true);
  const geos: THREE.BufferGeometry[] = [];
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geos.push(geo.index ? geo.toNonIndexed() : geo);
  });
  for (const geo of geos) {
    for (const k of Object.keys(geo.attributes)) if (k !== 'position') geo.deleteAttribute(k);
  }
  const merged = mergeGeometries(geos)!;
  // Frente hacia +z, como los .glb: se gira -90° (de +x a +z).
  merged.rotateY(-Math.PI / 2);
  const root = new THREE.Group();
  root.add(new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ name: 'Body' })));
  return root;
}

const traits = (
  estatura: number,
  peso: number,
  somatotipo: 'ectomorfo' | 'endomorfo',
): HumanTraits => {
  const v = peso / (estatura / 100) ** 2;
  return {
    shape: bodyShape({ estatura, peso, somatotipo, sexo: '' }),
    fat: Math.max(-0.35, Math.min(1.3, (v - 22.5) / 9)),
    muscle: 0,
    sexo: '',
    skin: '#7e5236',
  };
};

/** Medidas con el frente hacia +x (giro de 90°). */
function measure(o: THREE.Object3D) {
  const g = new THREE.Group();
  g.rotation.y = Math.PI / 2;
  g.add(o);
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g);
  return b.getSize(new THREE.Vector3());
}

describe('cuerpo humano realista', () => {
  it('reconoce las formas de mezcla por su nombre', () => {
    const fat = traits(170, 100, 'endomorfo');
    expect(morphValue('Weight', fat)).toBeGreaterThan(0.5);
    expect(morphValue('thin', fat)).toBe(0);
    expect(morphValue('macrodetails/Female', { ...fat, sexo: 'femenino' })).toBe(1);
    expect(morphValue('male', { ...fat, sexo: 'femenino' })).toBe(0);
    expect(morphValue('Eyebrows', fat)).toBeNull();
  });

  it('sin formas de mezcla deforma la malla: más ancha y con abdomen si pesa más', () => {
    const src = fakeHuman();
    const thin = measure(humanize(src, Math.PI / 2, traits(175, 58, 'ectomorfo')));
    const fat = measure(humanize(src, Math.PI / 2, traits(175, 110, 'endomorfo')));
    const orig = measure(src.clone());
    expect(fat.z).toBeGreaterThan(thin.z * 1.1);
    expect(fat.x).toBeGreaterThan(thin.x);
    // La estatura no cambia (la pone el escalado del modelo).
    expect(fat.y).toBeCloseTo(orig.y, 2);
    // El original no se toca.
    expect(measure(src.clone()).z).toBeCloseTo(orig.z, 5);
  });

  it('con formas de mezcla las usa en lugar de deformar, y tiñe la piel', () => {
    const geo = new THREE.BoxGeometry(0.4, 1.7, 0.3);
    geo.morphAttributes.position = [geo.getAttribute('position').clone()];
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'Skin' }));
    mesh.morphTargetDictionary = { weight: 0 };
    mesh.morphTargetInfluences = [0];
    const root = new THREE.Group();
    root.add(mesh);
    const out = humanize(root, 0, traits(170, 100, 'endomorfo'));
    const m2 = out.children[0] as THREE.Mesh;
    expect(m2.morphTargetInfluences![0]).toBeGreaterThan(0.5);
    expect(mesh.morphTargetInfluences[0]).toBe(0);
    expect((m2.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('7e5236');
  });
});
