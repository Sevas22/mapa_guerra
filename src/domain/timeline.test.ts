import { describe, expect, it } from 'vitest';
import { sampleScenario } from './sample';
import {
  deletePhase,
  easeInOutQuad,
  frameAt,
  insertPhaseAfter,
  interpolatePts,
  objectStateAt,
  opacityAt,
  splitTime,
  visibleAt,
} from './timeline';
import type { LineObject, Phase, Scenario, UnitObject } from './types';

const unit = (frames: UnitObject['frames'], start = 0, end: number | null = null): UnitObject => ({
  id: 'u',
  kind: 'unit',
  type: 'infanteria',
  faction: 'azul',
  echelon: 'I',
  label: '',
  notes: '',
  start,
  end,
  frames,
});

const line = (frames: LineObject['frames'], start = 0, end: number | null = null): LineObject => ({
  id: 'l',
  kind: 'line',
  type: 'frente',
  faction: 'roja',
  label: '',
  notes: '',
  start,
  end,
  frames,
});

const phase = (title: string): Phase => ({ id: title, title, date: '', desc: '', view: null });

const scenario = (n: number, objects: Scenario['objects']): Scenario => ({
  v: 1,
  name: 't',
  speed: 2,
  phases: Array.from({ length: n }, (_, i) => phase(`F${i}`)),
  objects,
});

describe('frameAt', () => {
  const o = unit({ 0: { lat: 0, lng: 0 }, 2: { lat: 2, lng: 2 }, 5: { lat: 5, lng: 5 } });

  it('devuelve el frame con la mayor clave ≤ p', () => {
    expect(frameAt(o, 0)).toEqual({ lat: 0, lng: 0 });
    expect(frameAt(o, 1)).toEqual({ lat: 0, lng: 0 });
    expect(frameAt(o, 2)).toEqual({ lat: 2, lng: 2 });
    expect(frameAt(o, 4)).toEqual({ lat: 2, lng: 2 });
    expect(frameAt(o, 9)).toEqual({ lat: 5, lng: 5 });
  });

  it('usa el de menor clave si no hay ninguno ≤ p', () => {
    const late = unit({ 3: { lat: 3, lng: 3 }, 4: { lat: 4, lng: 4 } }, 3);
    expect(frameAt(late, 0)).toEqual({ lat: 3, lng: 3 });
  });

  it('ordena las claves numéricamente, no como texto', () => {
    const o2 = unit({ 2: { lat: 2, lng: 0 }, 10: { lat: 10, lng: 0 } });
    expect(frameAt(o2, 9).lat).toBe(2);
    expect(frameAt(o2, 11).lat).toBe(10);
  });
});

describe('visibleAt', () => {
  it('es p >= start && (end == null || p <= end)', () => {
    const forever = unit({ 1: { lat: 0, lng: 0 } }, 1, null);
    expect(visibleAt(forever, 0)).toBe(false);
    expect(visibleAt(forever, 1)).toBe(true);
    expect(visibleAt(forever, 99)).toBe(true);

    const window = unit({ 1: { lat: 0, lng: 0 } }, 1, 2);
    expect(visibleAt(window, 0)).toBe(false);
    expect(visibleAt(window, 1)).toBe(true);
    expect(visibleAt(window, 2)).toBe(true);
    expect(visibleAt(window, 3)).toBe(false);
  });
});

describe('interpolación', () => {
  it('splitTime separa fase, siguiente y avance, y no pasa de la última', () => {
    expect(splitTime(1.25, 3)).toEqual({ p: 1, q: 2, t: 0.25 });
    expect(splitTime(2, 3)).toEqual({ p: 2, q: 2, t: 0 });
    expect(splitTime(0, 1)).toEqual({ p: 0, q: 0, t: 0 });
  });

  it('interpola linealmente la posición de unidades y puntos', () => {
    const o = unit({ 0: { lat: 0, lng: 10 }, 1: { lat: 4, lng: 20 } });
    expect(objectStateAt(o, 0, 2)).toEqual({ kind: 'point', opacity: 1, lat: 0, lng: 10 });
    expect(objectStateAt(o, 0.5, 2)).toEqual({ kind: 'point', opacity: 1, lat: 2, lng: 15 });
    expect(objectStateAt(o, 0.25, 2)).toMatchObject({ lat: 1, lng: 12.5 });
    expect(objectStateAt(o, 1, 2)).toMatchObject({ lat: 4, lng: 20 });
  });

  it('interpola trazos vértice a vértice si tienen igual número de puntos', () => {
    const a: [number, number][] = [
      [0, 0],
      [0, 10],
    ];
    const b: [number, number][] = [
      [10, 0],
      [10, 20],
    ];
    expect(interpolatePts(a, b, 0.5)).toEqual([
      [5, 0],
      [5, 15],
    ]);
    const o = line({ 0: { pts: a }, 1: { pts: b } });
    expect(objectStateAt(o, 0.5, 2)).toEqual({
      kind: 'line',
      opacity: 1,
      pts: [
        [5, 0],
        [5, 15],
      ],
    });
  });

  it('cambia de trazo en t = 0,5 si el número de vértices difiere', () => {
    const a: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    const b: [number, number][] = [
      [5, 5],
      [6, 6],
      [7, 7],
    ];
    expect(interpolatePts(a, b, 0.49)).toBe(a);
    expect(interpolatePts(a, b, 0.5)).toBe(b);
    expect(interpolatePts(a, b, 0)).toBe(a);
  });

  it('hace fundido de entrada y salida', () => {
    const appears = unit({ 1: { lat: 1, lng: 1 } }, 1);
    const disappears = unit({ 0: { lat: 0, lng: 0 } }, 0, 0);
    const stays = unit({ 0: { lat: 0, lng: 0 } });
    expect(opacityAt(appears, 0, 1, 0.3)).toBeCloseTo(0.3);
    expect(opacityAt(disappears, 0, 1, 0.3)).toBeCloseTo(0.7);
    expect(opacityAt(stays, 0, 1, 0.3)).toBe(1);
    expect(opacityAt(appears, 0, 1, 0)).toBe(0);
    expect(opacityAt(disappears, 1, 1, 0)).toBe(0);
  });

  it('un objeto que aparece usa su frame de destino sin moverse', () => {
    const appears = unit({ 1: { lat: 1, lng: 1 } }, 1);
    expect(objectStateAt(appears, 0.4, 2)).toEqual({
      kind: 'point',
      opacity: expect.closeTo(0.4, 5) as number,
      lat: 1,
      lng: 1,
    });
  });

  it('un objeto que desaparece se queda en su último frame', () => {
    const o = unit({ 0: { lat: 0, lng: 0 }, 1: { lat: 9, lng: 9 } }, 0, 0);
    expect(objectStateAt(o, 0.5, 2)).toMatchObject({ lat: 0, lng: 0, opacity: 0.5 });
  });

  it('devuelve null si el objeto no es visible', () => {
    const o = unit({ 2: { lat: 0, lng: 0 } }, 2);
    expect(objectStateAt(o, 0, 3)).toBeNull();
    expect(objectStateAt(o, 0.5, 3)).toBeNull();
  });

  it('easeInOutQuad', () => {
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(0.5)).toBe(0.5);
    expect(easeInOutQuad(1)).toBe(1);
    expect(easeInOutQuad(0.25)).toBeCloseTo(0.125);
    expect(easeInOutQuad(0.75)).toBeCloseTo(0.875);
  });
});

describe('insertPhaseAfter', () => {
  it('desplaza frames, start y end mayores que c', () => {
    const o = unit({ 0: { lat: 0, lng: 0 }, 1: { lat: 1, lng: 1 }, 2: { lat: 2, lng: 2 } }, 1, 2);
    const s = insertPhaseAfter(scenario(3, [o]), 0);
    const r = s.objects[0] as UnitObject;
    expect(s.phases).toHaveLength(4);
    expect(s.phases[1]?.title).toBe('Fase 4');
    expect(Object.keys(r.frames).map(Number)).toEqual([0, 2, 3]);
    expect(r.frames[2]).toEqual({ lat: 1, lng: 1 });
    expect(r.start).toBe(2);
    expect(r.end).toBe(3);
  });

  it('no toca claves ≤ c y deja end null', () => {
    const o = unit({ 0: { lat: 0, lng: 0 }, 1: { lat: 1, lng: 1 } }, 0, null);
    const s = insertPhaseAfter(scenario(2, [o]), 1);
    const r = s.objects[0] as UnitObject;
    expect(Object.keys(r.frames).map(Number)).toEqual([0, 1]);
    expect(r.start).toBe(0);
    expect(r.end).toBeNull();
    expect(s.phases).toHaveLength(3);
  });

  it('la nueva fase hereda la vista de la fase c', () => {
    const base = scenario(2, []);
    base.phases[0] = { ...base.phases[0]!, view: { c: [1, 2], z: 9 } };
    const s = insertPhaseAfter(base, 0);
    expect(s.phases[1]?.view).toEqual({ c: [1, 2], z: 9 });
  });

  it('no muta el escenario original', () => {
    const o = unit({ 0: { lat: 0, lng: 0 }, 1: { lat: 1, lng: 1 } }, 1);
    const base = scenario(2, [o]);
    const copy = structuredClone(base);
    insertPhaseAfter(base, 0);
    expect(base).toEqual(copy);
  });
});

describe('deletePhase', () => {
  it('borra los objetos que solo existían en k', () => {
    const only = unit({ 1: { lat: 0, lng: 0 } }, 1, 1);
    const other = { ...unit({ 0: { lat: 0, lng: 0 } }), id: 'other' };
    const s = deletePhase(scenario(3, [only, other]), 1);
    expect(s.phases.map((p) => p.title)).toEqual(['F0', 'F2']);
    expect(s.objects.map((o) => o.id)).toEqual(['other']);
  });

  it('conserva el frame de k si k+1 no tenía uno propio', () => {
    const o = unit({ 0: { lat: 0, lng: 0 }, 1: { lat: 1, lng: 1 }, 3: { lat: 3, lng: 3 } });
    const r = deletePhase(scenario(4, [o]), 1).objects[0] as UnitObject;
    expect(r.frames).toEqual({
      0: { lat: 0, lng: 0 },
      1: { lat: 1, lng: 1 },
      2: { lat: 3, lng: 3 },
    });
  });

  it('descarta el frame de k si k+1 tenía uno propio', () => {
    const o = unit({ 0: { lat: 0, lng: 0 }, 1: { lat: 1, lng: 1 }, 2: { lat: 2, lng: 2 } });
    const r = deletePhase(scenario(3, [o]), 1).objects[0] as UnitObject;
    expect(r.frames).toEqual({ 0: { lat: 0, lng: 0 }, 1: { lat: 2, lng: 2 } });
  });

  it('reindexa start y end', () => {
    const later = unit({ 3: { lat: 0, lng: 0 } }, 3, 4);
    const endsAtK = { ...unit({ 0: { lat: 0, lng: 0 } }, 0, 2), id: 'e' };
    const s = deletePhase(scenario(5, [later, endsAtK]), 2);
    const [a, b] = s.objects as [UnitObject, UnitObject];
    expect(a.start).toBe(2);
    expect(a.end).toBe(3);
    expect(b.start).toBe(0);
    expect(b.end).toBe(1);
  });

  it('no elimina la única fase', () => {
    const base = scenario(1, []);
    expect(deletePhase(base, 0)).toBe(base);
  });

  it('sobre el ejemplo: eliminar la fase 2 deja el escenario coherente', () => {
    const s = deletePhase(sampleScenario(), 1);
    expect(s.phases).toHaveLength(2);
    // "Contacto 08:50" solo existía en la fase 1 y desaparece.
    expect(s.objects.find((o) => o.label === 'Contacto 08:50')).toBeUndefined();
    for (const o of s.objects) {
      expect(Object.keys(o.frames).length).toBeGreaterThan(0);
      expect(o.start).toBeLessThan(2);
    }
  });
});
