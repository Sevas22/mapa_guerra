import { describe, expect, it } from 'vitest';
import { airAssaultScenario } from './airAssault';
import { LINES } from './catalog';
import { EXAMPLES } from './sample';
import { parseScenarioJSON } from './schema';
import { frameAt, objectStateAt, visibleAt } from './timeline';
import { forceSummary } from './travel';
import type { MapObject } from './types';

describe('Ejercicio Colibrí (asalto aéreo ficticio)', () => {
  const s = airAssaultScenario();
  const n = s.phases.length;
  const byLabel = (label: string) => s.objects.filter((o) => o.label === label);
  const pos = (o: MapObject, p: number) => {
    const st = objectStateAt(o, p, n);
    return st?.kind === 'point' ? ([st.lat, st.lng] as const) : null;
  };

  it('es un escenario válido que sobrevive a exportar e importar', () => {
    const r = parseScenarioJSON(JSON.stringify(s));
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(JSON.stringify(r.scenario))).toEqual(JSON.parse(JSON.stringify(s)));
  });

  it('cada objeto es visible en alguna fase y los trazos respetan su número de puntos', () => {
    for (const o of s.objects) {
      const visible = s.phases.map((_, i) => i).filter((i) => visibleAt(o, i));
      expect(visible.length, o.label || o.type).toBeGreaterThan(0);
      if (o.kind !== 'line') continue;
      const k = frameAt(o, o.start).pts.length;
      expect(k).toBeGreaterThanOrEqual(LINES[o.type].min);
      if (LINES[o.type].max) expect(k).toBeLessThanOrEqual(LINES[o.type].max!);
    }
  });

  it('el helicóptero va de A a B, espera, extrae en la ZE y vuelve a A', () => {
    const [heli] = byLabel('UH-60');
    const a = pos(heli!, 0);
    const b = pos(heli!, 3);
    expect(s.phases.every((_, i) => pos(heli!, i))).toBe(true);
    expect(pos(heli!, 9)).toEqual(a);
    expect(b).not.toEqual(a);
    // Se retira del punto B mientras el pelotón ataca.
    expect(pos(heli!, 4)).not.toEqual(b);
    expect(pos(heli!, 6)).toEqual(pos(heli!, 7));
  });

  it('el pelotón está en tierra solo antes de embarcar, entre desembarco y extracción y al final', () => {
    const pel = byLabel('PEL 1');
    const onGround = s.phases.map((_, i) => pel.filter((o) => visibleAt(o, i)).length);
    expect(onGround).toEqual([1, 0, 0, 1, 1, 1, 1, 1, 0, 1]);
  });

  it('el OPFOR desaparece tras el asalto y el resumen de fuerzas cuenta los PAX', () => {
    expect(forceSummary(s, 5).find((f) => f.faction === 'roja')?.pax).toBe(8);
    expect(forceSummary(s, 6).find((f) => f.faction === 'roja')).toBeUndefined();
    // En el asalto: pelotón (30) + tripulación (4).
    expect(forceSummary(s, 5).find((f) => f.faction === 'azul')?.pax).toBe(34);
  });

  it('aparece en el menú de ejemplos', () => {
    expect(EXAMPLES.map((e) => e.name)).toContain(
      'Ejercicio Colibrí (asalto aéreo con helicóptero)',
    );
  });
});
