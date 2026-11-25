import { describe, expect, it } from 'vitest';
import { LINES } from './catalog';
import { profileMap } from './linkChart';
import { analyze, buildNetwork, ranking } from './network';
import { profileAppearances } from './profileLinks';
import { EXAMPLES } from './sample';
import { parseScenarioJSON } from './schema';
import { telaranaScenario } from './telarana';
import { frameAt, visibleAt } from './timeline';

describe('Operación Telaraña (operación completa, ficticia)', () => {
  const s = telaranaScenario();
  const profiles = s.profiles!;
  const chart = s.charts![0]!;
  const pmap = profileMap(profiles);

  it('es un escenario válido que sobrevive a exportar e importar', () => {
    const r = parseScenarioJSON(JSON.stringify(s));
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(JSON.stringify(r.scenario))).toEqual(JSON.parse(JSON.stringify(s)));
    expect(EXAMPLES.some((e) => e.name.startsWith('Operación Telaraña'))).toBe(true);
  });

  it('cada objeto aparece en alguna fase y los trazos tienen sus puntos', () => {
    expect(s.phases.length).toBe(8);
    for (const o of s.objects) {
      expect(
        s.phases.some((_, i) => visibleAt(o, i)),
        o.label || o.type,
      ).toBe(true);
      if (o.kind !== 'line') continue;
      const k = frameAt(o, o.start).pts.length;
      expect(k, o.label || o.type).toBeGreaterThanOrEqual(LINES[o.type].min);
      if (LINES[o.type].max) expect(k).toBeLessThanOrEqual(LINES[o.type].max!);
    }
  });

  it('todo está conectado: fichas en el grafo, fichas y grafo en el mapa, modelos en las unidades', () => {
    // Cada amenaza con ficha aparece en el grafo.
    for (const p of profiles.filter((x) => x.rol === 'amenaza'))
      expect(profileAppearances(p.id, [chart], pmap).length, p.alias).toBe(1);
    // Las fichas y el grafo colocados en el mapa apuntan a cosas que existen.
    const cards = s.objects.filter(
      (o) => o.kind === 'point' && (o.type === 'perfil' || o.type === 'grafo'),
    );
    expect(cards.length).toBeGreaterThanOrEqual(4);
    for (const c of cards) {
      if (c.kind !== 'point') continue;
      for (const id of c.profileIds ?? []) expect(pmap.has(id)).toBe(true);
      if (c.type === 'grafo') expect(c.chartId).toBe(chart.id);
    }
    // Cada modelo 3D lo usa alguna unidad, y cada unidad con modelo apunta a uno existente.
    const ids = new Set(s.models!.map((m) => m.id));
    const used = new Set(
      s.objects.flatMap((o) => (o.kind === 'unit' && o.model3d ? [o.model3d] : [])),
    );
    expect([...used].every((id) => ids.has(id))).toBe(true);
    expect([...ids].every((id) => used.has(id))).toBe(true);
  });

  it('la red muestra al cabecilla como hub y a los enlaces como puentes hacia los aliados', () => {
    const n = buildNetwork(chart, pmap);
    const a = analyze(n);
    const top = ranking(n, a, 'betweenness')
      .slice(0, 3)
      .map((x) => x.label);
    expect(top).toEqual(['a. Mamut', 'a. Coyote', 'a. Lince']);
    expect(a.communities).toBeGreaterThanOrEqual(6);
  });
});
