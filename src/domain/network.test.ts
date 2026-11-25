import { describe, expect, it } from 'vitest';
import { newChart, newEdge, newGroup, newNode, profileMap } from './linkChart';
import { sampleLinkChart } from './linkChartSample';
import {
  analyze,
  buildNetwork,
  diagramPositions,
  forceLayout,
  ranking,
  toGexf,
  type Network,
} from './network';

/** Red a mano: nodos «a0…» y aristas no dirigidas de peso 1. */
function net(ids: string[], pairs: [string, string][]): Network {
  return {
    nodes: ids.map((id, i) => ({ id, label: id, sub: '', type: 'persona', x: i * 10, y: 0 })),
    edges: pairs.map(([a, b], i) => ({
      id: `e${i}`,
      source: a,
      target: b,
      kind: 'confirmado',
      weight: 1,
    })),
  };
}

// Dos triángulos unidos por un puente c–d.
const barbell = net(
  ['a', 'b', 'c', 'd', 'e', 'f'],
  [
    ['a', 'b'],
    ['b', 'c'],
    ['a', 'c'],
    ['c', 'd'],
    ['d', 'e'],
    ['e', 'f'],
    ['d', 'f'],
  ],
);

describe('análisis de redes', () => {
  it('en una estrella el centro concentra grado, intermediación y vector propio', () => {
    const star = net(
      ['h', 'x1', 'x2', 'x3', 'x4'],
      [
        ['h', 'x1'],
        ['h', 'x2'],
        ['h', 'x3'],
        ['h', 'x4'],
      ],
    );
    const a = analyze(star);
    const h = a.metrics.get('h')!;
    expect(h.degree).toBe(4);
    expect(h.betweenness).toBeCloseTo(1);
    expect(h.eigenvector).toBe(1);
    expect(h.cut).toBe(true);
    expect(a.metrics.get('x1')!.betweenness).toBe(0);
    for (const key of ['degree', 'betweenness', 'closeness', 'eigenvector'] as const)
      expect(ranking(star, a, key)[0]!.id).toBe('h');
  });

  it('separa dos grupos unidos por un puente y señala el puente y sus extremos', () => {
    const a = analyze(barbell);
    expect(a.communities).toBe(2);
    expect(a.metrics.get('a')!.community).toBe(a.metrics.get('b')!.community);
    expect(a.metrics.get('a')!.community).not.toBe(a.metrics.get('e')!.community);
    expect(a.modularity).toBeGreaterThan(0.3);
    expect([...a.bridges]).toEqual(['e3']);
    expect(a.metrics.get('c')!.cut).toBe(true);
    expect(a.metrics.get('d')!.cut).toBe(true);
    expect(a.metrics.get('a')!.cut).toBe(false);
    expect(
      ranking(barbell, a, 'betweenness')
        .slice(0, 2)
        .map((n) => n.id)
        .sort(),
    ).toEqual(['c', 'd']);
    expect(a.components).toBe(1);
    expect(a.density).toBeCloseTo(7 / 15);
  });

  it('cuenta componentes en una red desconectada', () => {
    const a = analyze(
      net(
        ['a', 'b', 'c', 'd'],
        [
          ['a', 'b'],
          ['c', 'd'],
        ],
      ),
    );
    expect(a.components).toBe(2);
    expect(a.metrics.get('a')!.closeness).toBeGreaterThan(0);
  });

  it('construye la red desde el diagrama: estructuras como nodos y pertenencia', () => {
    const c = newChart();
    const g = newGroup(0, 0, { title: 'Finanzas', w: 300, h: 200 });
    const a = newNode('amenaza', 50, 50, { label: 'a. Uno' });
    const b = newNode('amenaza', 150, 50, { label: 'a. Dos' });
    const out = newNode('persona', 600, 50, { label: 'Afuera' });
    const chart = {
      ...c,
      groups: [g],
      nodes: [a, b, out],
      edges: [newEdge(a.id, out.id, 'fuente-confirmado'), newEdge(a.id, b.id, 'confirmado')],
    };
    const n = buildNetwork(chart, new Map());
    expect(n.nodes.map((x) => x.type).sort()).toEqual([
      'amenaza',
      'amenaza',
      'estructura',
      'persona',
    ]);
    const kinds = n.edges.map((e) => e.kind).sort();
    expect(kinds.filter((k) => k === 'pertenencia')).toHaveLength(2);
    expect(kinds).toContain('fuente-confirmado');
    expect(n.edges.find((e) => e.kind === 'confirmado')!.weight).toBe(2);
  });

  it('analiza el ejemplo ficticio: el cabecilla queda entre los más centrales', () => {
    const { chart, profiles } = sampleLinkChart();
    const n = buildNetwork(chart, profileMap(profiles));
    const a = analyze(n);
    expect(a.metrics.size).toBe(n.nodes.length);
    expect(a.communities).toBeGreaterThan(1);
    const top = ranking(n, a, 'betweenness')
      .slice(0, 4)
      .map((x) => x.label);
    expect(top.some((l) => /Cóndor|Mando/i.test(l))).toBe(true);
  });

  it('la distribución es determinista, sin valores inválidos y separa los nodos', () => {
    const p1 = forceLayout(barbell, diagramPositions(barbell), 200);
    const p2 = forceLayout(barbell, diagramPositions(barbell), 200);
    expect([...p1.values()]).toEqual([...p2.values()]);
    const pts = [...p1.values()];
    for (const p of pts) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y)).toBeGreaterThan(5);
  });

  it('exporta GEXF válido para Gephi', () => {
    const a = analyze(barbell);
    const x = toGexf('Prueba <&>', barbell, a, forceLayout(barbell, new Map(), 50));
    expect(x).toContain('<gexf xmlns="http://gexf.net/1.3"');
    expect(x.match(/<node /g)).toHaveLength(6);
    expect(x.match(/<edge /g)).toHaveLength(7);
    expect(x).toContain('Prueba &lt;&amp;&gt;');
    expect(x).toContain('<attvalue for="puente" value="true"/>');
  });
});
