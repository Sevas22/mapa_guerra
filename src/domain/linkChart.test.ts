import { describe, expect, it } from 'vitest';
import { markerSpecFor } from './docCards';
import {
  chartBounds,
  hasEdge,
  moveElement,
  newChart,
  newEdge,
  newGroup,
  newNode,
  profileMap,
  removeElement,
  renderChartSVG,
  routeEdge,
  wrapText,
} from './linkChart';
import { sampleLinkChart } from './linkChartSample';
import { newProfile } from './profiles';
import { parseScenario } from './schema';
import { removeItem, upsertItem } from './scenario';
import { objectStateAt } from './timeline';
import type { PointObject, Scenario, UnitObject } from './types';

describe('grafo de vínculos', () => {
  it('une cajas separadas en horizontal con codos de 90°', () => {
    const pts = routeEdge({ cx: 0, cy: 0, w: 40, h: 40 }, { cx: 200, cy: 100, w: 40, h: 40 });
    expect(pts[0]).toEqual([20, 0]);
    expect(pts[pts.length - 1]).toEqual([180, 100]);
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1]!, pts[i]!];
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true);
    }
  });

  it('usa una recta entre cuadros grandes alineados', () => {
    const pts = routeEdge({ cx: 0, cy: 0, w: 200, h: 150 }, { cx: 400, cy: 30, w: 200, h: 150 });
    expect(pts).toHaveLength(2);
    expect(pts[0]![1]).toBe(pts[1]![1]);
  });

  it('une en vertical cuando la separación es vertical', () => {
    const pts = routeEdge({ cx: 0, cy: 0, w: 40, h: 40 }, { cx: 10, cy: 300, w: 40, h: 40 });
    expect(pts[0]).toEqual([0, 20]);
    expect(pts[pts.length - 1]).toEqual([10, 280]);
  });

  it('parte rótulos largos en líneas', () => {
    expect(wrapText('Cabecilla de la comisión de finanzas del frente', 20)).toEqual([
      'Cabecilla de la',
      'comisión de finanzas',
      'del frente',
    ]);
  });

  it('mover un cuadro arrastra los nodos que contiene', () => {
    const c = newChart();
    const g = newGroup(0, 0, { w: 100, h: 100 });
    c.groups = [g];
    c.nodes = [newNode('amenaza', 50, 50), newNode('amenaza', 300, 50)];
    const m = moveElement(c, g.id, 10, 20);
    expect(m.nodes[0]).toMatchObject({ x: 60, y: 70 });
    expect(m.nodes[1]).toMatchObject({ x: 300, y: 50 });
  });

  it('al quitar un nodo se quitan sus vínculos', () => {
    const c = newChart();
    const a = newNode('persona', 0, 0);
    const b = newNode('persona', 100, 0);
    c.nodes = [a, b];
    c.edges = [newEdge(a.id, b.id)];
    expect(hasEdge(c, b.id, a.id)).toBe(true);
    expect(removeElement(c, a.id).edges).toHaveLength(0);
  });

  it('dibuja el ejemplo con convenciones, pestañas y rótulos de los perfiles', () => {
    const { profiles, chart } = sampleLinkChart();
    const svg = renderChartSVG(chart, profileMap(profiles));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('CONVENCIONES');
    expect(svg).toContain('MANDO Y CONTROL');
    expect(svg).toContain('a. Cóndor');
    expect(svg).toContain('stroke-dasharray');
    expect(chartBounds(chart, profileMap(profiles)).w).toBeGreaterThan(1000);
  });

  it('escapa el texto del usuario', () => {
    const c = newChart('<script>');
    c.nodes = [newNode('lugar', 0, 0, { label: 'a & <b>' })];
    const svg = renderChartSVG(c, new Map());
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('a &amp; &lt;b&gt;');
  });
});

describe('fichas en el mapa y escenario', () => {
  const base = (): Scenario => ({
    v: 1,
    name: 'x',
    speed: 2,
    phases: [{ id: 'p', title: '', date: '', desc: '', view: null }],
    objects: [],
  });
  const card = (profileIds: string[]): PointObject => ({
    id: 'o',
    kind: 'point',
    type: 'perfil',
    faction: 'azul',
    label: '',
    notes: '',
    start: 0,
    end: null,
    frames: { 0: { lat: 0, lng: 0 } },
    profileIds,
  });

  it('la ficha de perfiles muestra una persona o la lista', () => {
    const a = newProfile({ nombre: 'Ana', alias: 'Profe', rol: 'propio', cargo: 'Comandante' });
    const b = newProfile({ alias: 'Tigre', rol: 'amenaza' });
    const one = markerSpecFor(card([a.id]), false, { profiles: [a, b] });
    expect(one.html).toContain('Ana (a. Profe)');
    expect(one.html).toContain('Comandante');
    const two = markerSpecFor(card([b.id, a.id]), true, { profiles: [a, b] });
    expect(two.html).toContain('a. Tigre');
    expect(two.html).toContain(' sel');
    // Los propios van primero.
    expect(two.html.indexOf('Ana')).toBeLessThan(two.html.indexOf('Tigre'));
  });

  it('el JSON con perfiles, grafos y modelos se valida y conserva', () => {
    const { profiles, chart } = sampleLinkChart();
    const s: Scenario = { ...base(), profiles, charts: [chart] };
    const r = parseScenario(JSON.parse(JSON.stringify(s)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scenario.profiles).toHaveLength(profiles.length);
    expect(r.scenario.charts?.[0]?.edges).toHaveLength(chart.edges.length);
  });

  it('los escenarios antiguos siguen sin colecciones', () => {
    const r = parseScenario(base());
    expect(r.ok && r.scenario.profiles).toBeUndefined();
  });

  it('borrar un perfil lo quita de las fichas y de los grafos', () => {
    const { profiles, chart } = sampleLinkChart();
    const id = profiles[0]!.id;
    const s: Scenario = {
      ...base(),
      profiles,
      charts: [chart],
      objects: [card([id, profiles[1]!.id])],
    };
    const r = removeItem(s, 'profiles', id);
    expect(r.profiles?.some((p) => p.id === id)).toBe(false);
    expect((r.objects[0] as PointObject).profileIds).toEqual([profiles[1]!.id]);
    expect(r.charts?.[0]?.nodes.some((n) => n.profileId === id)).toBe(false);
  });

  it('upsert reemplaza por id y borrar el último deja el escenario sin la clave', () => {
    const c = newChart('A');
    let s = upsertItem(base(), 'charts', c);
    s = upsertItem(s, 'charts', { ...c, title: 'B' });
    expect(s.charts).toHaveLength(1);
    expect(s.charts?.[0]?.title).toBe('B');
    expect('charts' in removeItem(s, 'charts', c.id)).toBe(false);
  });

  it('interpola la altura de vuelo entre fases', () => {
    const u: UnitObject = {
      id: 'h',
      kind: 'unit',
      type: 'aviacion',
      echelon: '',
      faction: 'azul',
      label: '',
      notes: '',
      start: 0,
      end: null,
      frames: { 0: { lat: 0, lng: 0, alt: 0 }, 1: { lat: 0, lng: 1, alt: 200 } },
    };
    const st = objectStateAt(u, 0.5, 2);
    expect(st?.kind === 'point' && st.alt).toBeGreaterThan(0);
    expect(st?.kind === 'point' && st.alt).toBeLessThan(200);
  });
});
