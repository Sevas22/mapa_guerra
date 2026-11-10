import { describe, expect, it } from 'vitest';
import { sampleScenario } from './sample';
import { parseScenario, parseScenarioJSON } from './schema';

describe('ScenarioSchema', () => {
  it('acepta el escenario de ejemplo tras pasar por JSON', () => {
    const s = sampleScenario();
    const r = parseScenarioJSON(JSON.stringify(s));
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(JSON.stringify(r.scenario))).toEqual(JSON.parse(JSON.stringify(s)));
  });

  it('rellena valores por defecto como el prototipo (speed || 2)', () => {
    const r = parseScenario({
      phases: [{ title: 'A' }],
      objects: [
        { kind: 'unit', type: 'infanteria', faction: 'azul', frames: { 0: { lat: 1, lng: 2 } } },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scenario.speed).toBe(2);
    expect(r.scenario.phases[0]).toMatchObject({ title: 'A', date: '', desc: '', view: null });
    expect(r.scenario.objects[0]).toMatchObject({ start: 0, end: null, label: '', echelon: '' });
  });

  it('sustituye tipos y bandos desconocidos', () => {
    const r = parseScenario({
      phases: [{}],
      objects: [
        { kind: 'unit', type: 'dragones', faction: 'morada', frames: { 0: { lat: 1, lng: 2 } } },
      ],
    });
    expect(r.ok && r.scenario.objects[0]).toMatchObject({ type: 'infanteria', faction: 'azul' });
  });

  it('rechaza lo que el prototipo también rechaza', () => {
    expect(parseScenario({ phases: [], objects: [] }).ok).toBe(false);
    expect(parseScenario({ phases: [{}] }).ok).toBe(false);
    expect(parseScenario(null).ok).toBe(false);
    expect(parseScenarioJSON('{no es json').ok).toBe(false);
  });

  it('rechaza frames mal formados', () => {
    const bad = (frames: unknown) =>
      parseScenario({ phases: [{}], objects: [{ kind: 'line', type: 'ruta', frames }] }).ok;
    expect(bad({})).toBe(false);
    expect(bad({ 0: { pts: [[1, 2]] } })).toBe(false);
    expect(
      bad({
        x: {
          pts: [
            [1, 2],
            [3, 4],
          ],
        },
      }),
    ).toBe(false);
    expect(
      bad({
        0: {
          pts: [
            [1, 2],
            [3, 4],
          ],
        },
      }),
    ).toBe(true);
  });
});
