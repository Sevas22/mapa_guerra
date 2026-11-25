import { describe, expect, it } from 'vitest';
import { newChart, newEdge, newGroup, newNode, nodeText, profileMap } from './linkChart';
import {
  chartCountByProfile,
  nodesWithoutProfile,
  profileAppearances,
  syncChartProfiles,
} from './profileLinks';
import { newProfile } from './profiles';

describe('perfiles y grafos de la mano', () => {
  const jefe = newProfile({ rol: 'amenaza', alias: 'Mamut', cargo: 'Cabecilla' });
  const socio = newProfile({ rol: 'persona', nombre: 'Ana Ruiz' });
  const g = newGroup(0, 0, { title: 'Finanzas', w: 400, h: 300 });
  const a = newNode('amenaza', 100, 100, { profileId: jefe.id });
  const b = newNode('persona', 600, 100, { profileId: socio.id });
  const sueltoA = newNode('amenaza', 200, 150, { label: 'a. Rayo', sub: 'Operativo' });
  const lugar = newNode('lugar', 800, 300, { label: 'Finca' });
  const chart = {
    ...newChart('Red A'),
    groups: [g],
    nodes: [a, b, sueltoA, lugar],
    edges: [newEdge(a.id, b.id, 'confirmado'), newEdge(sueltoA.id, a.id, 'por-confirmar')],
  };
  const pmap = profileMap([jefe, socio]);

  it('dice en qué grafo está cada ficha, con quién y en qué estructura', () => {
    const ap = profileAppearances(jefe.id, [chart], pmap);
    expect(ap).toHaveLength(1);
    expect(ap[0]!.chartTitle).toBe('Red A');
    const labels = ap[0]!.links.map((l) => `${l.label}|${l.kind}`);
    expect(labels).toContain('Ana Ruiz|confirmado');
    expect(labels.some((l) => l.startsWith('a. Rayo|'))).toBe(true);
    expect(labels).toContain('Finanzas|integra la estructura');
    expect(ap[0]!.links.find((l) => l.label === 'Ana Ruiz')!.profileId).toBe(socio.id);
    expect(chartCountByProfile([chart, chart]).get(jefe.id)).toBe(2);
  });

  it('crea fichas para las personas dibujadas sin ficha y las enlaza', () => {
    expect(nodesWithoutProfile(chart, pmap).map((n) => n.id)).toEqual([sueltoA.id]);
    const r = syncChartProfiles(chart, pmap);
    expect(r.created).toHaveLength(1);
    const p = r.created[0]!;
    expect(p).toMatchObject({ rol: 'amenaza', alias: 'Rayo', cargo: 'Operativo' });
    expect(p.estructura).toBe('Finanzas');
    const n = r.chart.nodes.find((x) => x.id === sueltoA.id)!;
    expect(n.profileId).toBe(p.id);
    // El nodo sigue diciendo lo mismo, ahora tomado de la ficha.
    expect(nodeText(n, profileMap([jefe, socio, p]))).toMatchObject({
      label: 'a. Rayo',
      sub: 'Operativo',
    });
    // Los lugares no son personas: no reciben ficha.
    expect(r.chart.nodes.find((x) => x.id === lugar.id)!.profileId).toBeUndefined();
    expect(syncChartProfiles(chart, pmap, 'otro').created).toHaveLength(0);
  });
});
