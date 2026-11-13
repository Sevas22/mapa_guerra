import { describe, expect, it } from 'vitest';
import {
  PRESETS,
  headingBetween,
  modelParts,
  newModel,
  normalizeModel,
  type Model3D,
} from './models3d';

const extent = (m: Model3D) => {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const p of modelParts(m)) {
    const half =
      p.shape === 'box' || p.shape === 'ellipsoid'
        ? [p.size[0] / 2, p.size[2] / 2]
        : p.shape === 'cyl'
          ? p.axis === 'x'
            ? [p.len / 2, p.r]
            : [p.r, p.axis === 'z' ? p.len / 2 : p.r]
          : [p.r, p.r];
    x0 = Math.min(x0, p.pos[0] - half[0]!);
    x1 = Math.max(x1, p.pos[0] + half[0]!);
    z0 = Math.min(z0, p.pos[2] - half[1]!);
    z1 = Math.max(z1, p.pos[2] + half[1]!);
  }
  return { len: x1 - x0, span: z1 - z0 };
};

describe('modelos 3D', () => {
  it('cada modelo de partida genera piezas con números finitos', () => {
    for (const p of PRESETS) {
      const parts = modelParts(newModel(p));
      expect(parts.length).toBeGreaterThan(5);
      for (const part of parts) for (const v of part.pos) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('el avión mide aproximadamente lo indicado', () => {
    const m = newModel(PRESETS[0]);
    const e = extent(m);
    expect(e.span).toBeCloseTo(m.span, 0);
    expect(e.len).toBeGreaterThan(m.length * 0.85);
    expect(e.len).toBeLessThan(m.length * 1.2);
  });

  it('el multirrotor tiene un rotor por brazo', () => {
    for (const engines of [4, 6, 8]) {
      const m = newModel({ ...PRESETS[3]!, engines });
      expect(modelParts(m).filter((p) => p.shape === 'rotor')).toHaveLength(engines);
    }
  });

  it('el avión de cuatro motores tiene cuatro hélices', () => {
    const m = newModel(PRESETS[0]);
    expect(modelParts(m).filter((p) => p.shape === 'rotor')).toHaveLength(4);
  });

  it('el helicóptero tiene rotor principal del diámetro indicado y rotor de cola', () => {
    const m = newModel(PRESETS[2]);
    const rotors = modelParts(m).filter((p) => p.shape === 'rotor');
    expect(rotors).toHaveLength(2);
    expect(Math.max(...rotors.map((r) => (r.shape === 'rotor' ? r.r : 0)))).toBe(m.span / 2);
  });

  it('normaliza valores fuera de rango', () => {
    const m = normalizeModel({ ...newModel(PRESETS[3]), engines: 5, blades: 9, length: -2 });
    expect(m.engines).toBe(4);
    expect(m.blades).toBe(6);
    expect(m.length).toBeGreaterThan(0);
  });

  it('calcula el rumbo entre dos posiciones', () => {
    expect(headingBetween([4, -74], [4.01, -74])).toBeCloseTo(0);
    expect(headingBetween([4, -74], [4, -73.99])).toBeCloseTo(Math.PI / 2);
    expect(headingBetween([4, -74], [4, -74])).toBeNull();
  });
});
