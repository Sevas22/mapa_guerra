import { describe, expect, it } from 'vitest';
import { LINES } from './catalog';
import { exerciseScenario } from './exercise';
import { EXAMPLES } from './sample';
import { parseScenarioJSON } from './schema';
import { frameAt, visibleAt } from './timeline';
import { forceSummary } from './travel';

describe('Ejercicio Halcón (ficticio)', () => {
  const s = exerciseScenario();

  it('es un escenario válido que sobrevive a exportar e importar', () => {
    const r = parseScenarioJSON(JSON.stringify(s));
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(JSON.stringify(r.scenario))).toEqual(JSON.parse(JSON.stringify(s)));
  });

  it('cada objeto es visible en alguna fase y tiene posición en ella', () => {
    for (const o of s.objects) {
      const visible = s.phases.map((_, i) => i).filter((i) => visibleAt(o, i));
      expect(visible.length, o.label || o.type).toBeGreaterThan(0);
      expect(frameAt(o, visible[0]!)).toBeTruthy();
    }
  });

  it('las líneas respetan el número de puntos de su tipo', () => {
    for (const o of s.objects) {
      if (o.kind !== 'line') continue;
      const def = LINES[o.type];
      const n = frameAt(o, o.start).pts.length;
      expect(n).toBeGreaterThanOrEqual(def.min);
      if (def.max) expect(n).toBeLessThanOrEqual(def.max);
    }
  });

  it('el resumen de fuerzas de la maniobra suma los PAX de las fichas', () => {
    const azul = forceSummary(s, 4).find((f) => f.faction === 'azul');
    expect(azul?.pax).toBe(36 + 18 + 10 + 8 + 4);
    expect(forceSummary(s, 5).find((f) => f.faction === 'roja')).toBeUndefined();
  });

  it('aparece en el menú de ejemplos', () => {
    expect(EXAMPLES.map((e) => e.name)).toContain('Ejercicio Halcón (inserción aérea)');
  });
});
