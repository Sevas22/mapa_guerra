import { describe, expect, it } from 'vitest';
import {
  BASE_DEFS,
  MODEL_BASES,
  PRESETS,
  domainOf,
  headingBetween,
  modelParts,
  modelSize,
  newModel,
  normalizeModel,
  partsBounds,
  type Model3D,
  type ModelBase,
} from './models3d';
import { formation } from './model3d/people';

const preset = (name: string) => newModel(PRESETS.find((p) => p.name === name)!);
const firstOf = (base: ModelBase) => newModel(PRESETS.find((p) => p.base === base)!);
const extent = (m: Model3D) => {
  const b = partsBounds(modelParts(m));
  return { len: b.max[0] - b.min[0], span: b.max[2] - b.min[2], y0: b.min[1], y1: b.max[1] };
};

describe('modelos 3D', () => {
  it('cada modelo de partida genera piezas con números finitos y ya normalizado', () => {
    for (const p of PRESETS) {
      const m = newModel(p);
      expect(normalizeModel(m)).toEqual(m);
      const parts = modelParts(m);
      expect(parts.length).toBeGreaterThan(5);
      for (const part of parts) {
        for (const v of part.pos) expect(Number.isFinite(v)).toBe(true);
        if (part.shape === 'prism' || part.shape === 'lathe')
          for (const q of part.pts) expect(q.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('hay un modelo de partida para cada tipo', () => {
    for (const b of MODEL_BASES) expect(PRESETS.some((p) => p.base === b)).toBe(true);
  });

  it('el avión mide aproximadamente lo indicado', () => {
    const m = preset('Avión de transporte');
    const e = extent(m);
    expect(e.span).toBeCloseTo(m.span, 0);
    expect(e.len).toBeGreaterThan(m.length * 0.95);
    expect(e.len).toBeLessThan(m.length * 1.15);
  });

  it('los vehículos y embarcaciones miden lo indicado y se apoyan en el suelo o el agua', () => {
    for (const p of PRESETS) {
      const m = newModel(p);
      const d = domainOf(m.base);
      if (d === 'aire' || d === 'personal') continue;
      const e = extent(m);
      expect(e.len, m.name).toBeGreaterThan(m.length * 0.85);
      expect(e.len, m.name).toBeLessThan(m.length * 1.25);
      expect(e.span, m.name).toBeLessThan(m.span * 1.35);
      if (d === 'tierra') expect(e.y0, m.name).toBeGreaterThanOrEqual(-0.01);
      // La obra viva queda bajo la línea de flotación.
      else expect(e.y0, m.name).toBeLessThan(0);
    }
  });

  it('la infantería pone un soldado por cantidad, de pie sobre el suelo', () => {
    for (const n of [1, 4, 9]) {
      const m = { ...preset('Escuadra de fusileros'), engines: n };
      const heads = modelParts(m).filter(
        (p) => p.shape === 'ellipsoid' && p.color === '#b98d6c' && p.size[1] > 0.2,
      );
      expect(heads).toHaveLength(n);
      const e = extent(m);
      expect(e.y0).toBeGreaterThanOrEqual(-0.01);
      expect(e.y1).toBeCloseTo(m.length, 0);
    }
  });

  it('las formaciones quedan centradas y respetan la separación', () => {
    for (const kind of ['cuna', 'linea', 'columna', 'fila']) {
      const pts = formation(kind, 6, 4);
      const xs = pts.map((p) => p[0]);
      const zs = pts.map((p) => p[1]);
      expect(Math.max(...xs) + Math.min(...xs)).toBeCloseTo(0);
      expect(Math.max(...zs) + Math.min(...zs)).toBeCloseTo(0);
    }
    const line = formation('linea', 3, 4);
    expect(line.map((p) => p[1])).toEqual([-4, 0, 4]);
  });

  it('el multirrotor tiene un rotor por brazo', () => {
    for (const engines of [4, 6, 8]) {
      const m = { ...firstOf('dron-multirrotor'), engines };
      expect(modelParts(m).filter((p) => p.shape === 'rotor')).toHaveLength(engines);
    }
  });

  it('el avión de cuatro motores tiene cuatro hélices', () => {
    const m = preset('Avión de transporte');
    expect(modelParts(m).filter((p) => p.shape === 'rotor')).toHaveLength(4);
  });

  it('el helicóptero tiene rotor principal del diámetro indicado y rotor de cola', () => {
    for (const m of [preset('Helicóptero utilitario'), preset('Helicóptero de ataque')]) {
      const rotors = modelParts(m).flatMap((p) => (p.shape === 'rotor' ? [p.r] : []));
      expect(rotors).toHaveLength(2);
      expect(Math.max(...rotors)).toBe(m.span / 2);
    }
  });

  it('los ejes del camión y del blindado cambian el número de ruedas', () => {
    const tires = (m: Model3D) =>
      modelParts(m).filter((p) => p.shape === 'cyl' && p.color === '#1b1d20').length;
    const truck = preset('Camión de tropas');
    expect(tires({ ...truck, engines: 2 })).toBe(4);
    expect(tires({ ...truck, engines: 3 })).toBe(6);
    const apc = preset('Blindado 8×8');
    expect(tires(apc)).toBe(8);
  });

  it('normaliza valores fuera de rango, variantes y cargas no válidas', () => {
    const m = normalizeModel({ ...firstOf('dron-multirrotor'), engines: 5, blades: 9, length: -2 });
    expect(m.engines).toBe(4);
    expect(m.blades).toBe(6);
    expect(m.length).toBeGreaterThan(0);
    const t = normalizeModel({ ...firstOf('camion'), variant: 'x', payload: 'helipuerto' });
    expect(t.variant).toBe('');
    expect(BASE_DEFS.camion.payloads).toContain(t.payload);
    const s = normalizeModel({ ...firstOf('soldados'), variant: 'nada' });
    expect(s.variant).toBe('cuna');
  });

  it('el tamaño sirve para encuadrar: un buque es mucho mayor que un soldado', () => {
    expect(modelSize(preset('Fragata'))).toBeGreaterThan(100);
    expect(modelSize(preset('Soldado'))).toBeLessThan(2.5);
  });

  it('calcula el rumbo entre dos posiciones', () => {
    expect(headingBetween([4, -74], [4.01, -74])).toBeCloseTo(0);
    expect(headingBetween([4, -74], [4, -73.99])).toBeCloseTo(Math.PI / 2);
    expect(headingBetween([4, -74], [4, -74])).toBeNull();
  });
});
