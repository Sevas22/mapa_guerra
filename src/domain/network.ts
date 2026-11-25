/**
 * Análisis de redes (teoría de grafos) a partir de un grafo de vínculos, al estilo de Gephi:
 *
 * - La red: cada integrante, persona, fuente, lugar o vehículo es un nodo; cada cuadro de
 *   estructura (mando y control, finanzas…) es un nodo «estructura» unido a quienes contiene;
 *   cada vínculo del diagrama es una arista con peso según si está confirmado.
 * - Métricas: grado, grado ponderado, intermediación (Brandes), cercanía armónica, vector propio.
 * - Comunidades por modularidad (Louvain), puntos de corte y vínculos puente (Tarjan).
 * - Distribución por fuerzas tipo ForceAtlas2 y exportación GEXF para abrirla en Gephi.
 *
 * Todo es puro y determinista (mismo diagrama, mismo resultado).
 */
import {
  EDGE_DEFS,
  NODE_DEFS,
  insideGroup,
  nodeText,
  type EdgeKind,
  type LinkChart,
  type NodeKind,
} from './linkChart';
import type { Profile, SourceType } from './profiles';

export type NetNodeType = NodeKind | 'estructura';
export type NetEdgeKind = EdgeKind | 'pertenencia';

export interface NetNode {
  id: string;
  label: string;
  sub: string;
  type: NetNodeType;
  source?: SourceType;
  /** Posición en el diagrama (punto de partida de la distribución). */
  x: number;
  y: number;
}

export interface NetEdge {
  id: string;
  source: string;
  target: string;
  kind: NetEdgeKind;
  weight: number;
}

export interface Network {
  nodes: NetNode[];
  edges: NetEdge[];
}

export const NET_TYPE_NAMES: Record<NetNodeType, string> = {
  ...(Object.fromEntries(Object.entries(NODE_DEFS).map(([k, v]) => [k, v.name])) as Record<
    NodeKind,
    string
  >),
  estructura: 'Estructura',
};

export const NET_EDGE_DEFS: Record<NetEdgeKind, { name: string; color: string; weight: number }> = {
  confirmado: { name: EDGE_DEFS.confirmado.name, color: '#e5484d', weight: 2 },
  'por-confirmar': { name: EDGE_DEFS['por-confirmar'].name, color: '#f0a3a6', weight: 1 },
  'fuente-confirmado': { name: EDGE_DEFS['fuente-confirmado'].name, color: '#3b82f6', weight: 1.5 },
  'fuente-por-confirmar': {
    name: EDGE_DEFS['fuente-por-confirmar'].name,
    color: '#93b8f8',
    weight: 0.75,
  },
  pertenencia: { name: 'Pertenencia a una estructura', color: '#9aa3ad', weight: 1 },
};

/** Red a partir del diagrama. Vínculos repetidos entre los mismos nodos suman su peso. */
export function buildNetwork(c: LinkChart, profiles: ReadonlyMap<string, Profile>): Network {
  const nodes: NetNode[] = c.nodes.map((n) => {
    const t = nodeText(n, profiles);
    return {
      id: n.id,
      label: t.label || NODE_DEFS[n.kind].name,
      sub: t.sub,
      type: n.kind,
      ...(n.source ? { source: n.source } : {}),
      x: n.x,
      y: n.y,
    };
  });
  for (const g of c.groups)
    nodes.push({
      id: g.id,
      label: g.title || 'Estructura',
      sub: '',
      type: 'estructura',
      x: g.x + g.w / 2,
      y: g.y + g.h / 2,
    });
  const ids = new Set(nodes.map((n) => n.id));
  const byPair = new Map<string, NetEdge>();
  const add = (a: string, b: string, kind: NetEdgeKind, id: string) => {
    if (a === b || !ids.has(a) || !ids.has(b)) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const prev = byPair.get(key);
    const w = NET_EDGE_DEFS[kind].weight;
    if (prev) {
      prev.weight += w;
      // Prevalece el tipo de mayor peso (p. ej. confirmado sobre pertenencia).
      if (w > NET_EDGE_DEFS[prev.kind].weight) prev.kind = kind;
    } else byPair.set(key, { id, source: a, target: b, kind, weight: w });
  };
  for (const g of c.groups)
    for (const n of c.nodes)
      if (insideGroup(n, g)) add(g.id, n.id, 'pertenencia', `m-${g.id}-${n.id}`);
  for (const e of c.edges) add(e.from, e.to, e.kind, e.id);
  return { nodes, edges: [...byPair.values()] };
}

// ---------------------------------------------------------------- estructura interna

interface Adj {
  n: number;
  index: Map<string, number>;
  /** Vecinos con peso, por índice. */
  nb: { j: number; w: number }[][];
}

function adjacency(net: Network): Adj {
  const index = new Map(net.nodes.map((n, i) => [n.id, i]));
  const nb: Adj['nb'] = net.nodes.map(() => []);
  for (const e of net.edges) {
    const a = index.get(e.source)!;
    const b = index.get(e.target)!;
    nb[a]!.push({ j: b, w: e.weight });
    nb[b]!.push({ j: a, w: e.weight });
  }
  return { n: net.nodes.length, index, nb };
}

/** Intermediación de Brandes (sin pesos, no dirigida), normalizada a 0–1. */
function betweenness(adj: Adj): number[] {
  const { n, nb } = adj;
  const cb = new Array<number>(n).fill(0);
  for (let s = 0; s < n; s++) {
    const stack: number[] = [];
    const pred: number[][] = Array.from({ length: n }, () => []);
    const sigma = new Array<number>(n).fill(0);
    const dist = new Array<number>(n).fill(-1);
    sigma[s] = 1;
    dist[s] = 0;
    const q = [s];
    for (let h = 0; h < q.length; h++) {
      const v = q[h]!;
      stack.push(v);
      for (const { j: w } of nb[v]!) {
        if (dist[w]! < 0) {
          dist[w] = dist[v]! + 1;
          q.push(w);
        }
        if (dist[w] === dist[v]! + 1) {
          sigma[w]! += sigma[v]!;
          pred[w]!.push(v);
        }
      }
    }
    const delta = new Array<number>(n).fill(0);
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred[w]!) delta[v]! += (sigma[v]! / sigma[w]!) * (1 + delta[w]!);
      if (w !== s) cb[w]! += delta[w]!;
    }
  }
  // No dirigida: cada camino se contó dos veces. Normalización por (n-1)(n-2)/2.
  const norm = n > 2 ? ((n - 1) * (n - 2)) / 2 : 1;
  return cb.map((v) => v / 2 / norm);
}

/** Cercanía armónica (sirve con redes desconectadas), normalizada a 0–1. */
function harmonicCloseness(adj: Adj): number[] {
  const { n, nb } = adj;
  return Array.from({ length: n }, (_, s) => {
    const dist = new Array<number>(n).fill(-1);
    dist[s] = 0;
    const q = [s];
    let sum = 0;
    for (let h = 0; h < q.length; h++) {
      const v = q[h]!;
      for (const { j } of nb[v]!)
        if (dist[j]! < 0) {
          dist[j] = dist[v]! + 1;
          sum += 1 / dist[j]!;
          q.push(j);
        }
    }
    return n > 1 ? sum / (n - 1) : 0;
  });
}

/** Centralidad de vector propio (iteración de potencias, con pesos), máximo = 1. */
function eigenvector(adj: Adj): number[] {
  const { n, nb } = adj;
  let x = new Array<number>(n).fill(1);
  for (let it = 0; it < 200; it++) {
    // Se suma el propio valor (A + I) para que converja también en redes bipartitas.
    const y = x.map((xi, i) => xi + nb[i]!.reduce((s, { j, w }) => s + w * x[j]!, 0));
    const max = Math.max(...y, 1e-12);
    const next = y.map((v) => v / max);
    const diff = next.reduce((s, v, i) => s + Math.abs(v - x[i]!), 0);
    x = next;
    if (diff < 1e-9) break;
  }
  return x;
}

/** Comunidades por modularidad (método de Louvain). Devuelve la comunidad de cada nodo. */
function louvain(adj: Adj): { community: number[]; modularity: number } {
  const N = adj.n;
  // Grafo de trabajo con pesos (lista de adyacencia con lazos propios).
  let gNb: Map<number, number>[] = adj.nb.map((l) => {
    const m = new Map<number, number>();
    for (const { j, w } of l) m.set(j, (m.get(j) ?? 0) + w);
    return m;
  });
  let member = Array.from({ length: N }, (_, i) => i); // nodo original → nodo de trabajo
  const total = gNb.reduce((s, m) => s + [...m.values()].reduce((a, b) => a + b, 0), 0) / 2;
  if (total === 0) return { community: member, modularity: 0 };
  const m2 = 2 * total;

  for (let level = 0; level < 20; level++) {
    const n = gNb.length;
    // Grado de cada nodo de trabajo (los lazos internos, clave -1, ya cuentan los dos sentidos).
    const k = gNb.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
    const comm = Array.from({ length: n }, (_, i) => i);
    const tot = [...k];
    let moved = false;
    for (let pass = 0; pass < 50; pass++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        const ci = comm[i]!;
        const links = new Map<number, number>();
        for (const [j, w] of gNb[i]!)
          if (j !== i && j >= 0) links.set(comm[j]!, (links.get(comm[j]!) ?? 0) + w);
        tot[ci]! -= k[i]!;
        let best = ci;
        let bestGain = (links.get(ci) ?? 0) - (tot[ci]! * k[i]!) / m2;
        for (const [c, w] of links) {
          const gain = w - (tot[c]! * k[i]!) / m2;
          if (gain > bestGain + 1e-12) {
            bestGain = gain;
            best = c;
          }
        }
        tot[best]! += k[i]!;
        if (best !== ci) {
          comm[i] = best;
          changed = true;
          moved = true;
        }
      }
      if (!changed) break;
    }
    if (!moved) break;
    // Agregar: cada comunidad pasa a ser un nodo.
    const ids = new Map<number, number>();
    for (const c of comm) if (!ids.has(c)) ids.set(c, ids.size);
    const next: Map<number, number>[] = Array.from({ length: ids.size }, () => new Map());
    for (let i = 0; i < n; i++) {
      const a = ids.get(comm[i]!)!;
      for (const [j, w] of gNb[i]!) {
        const b = j >= 0 ? ids.get(comm[j]!)! : a;
        // Los lazos internos se guardan en la clave -1 para conservar el grado.
        const key = a === b ? -1 : b;
        next[a]!.set(key, (next[a]!.get(key) ?? 0) + w);
      }
    }
    member = member.map((v) => ids.get(comm[v]!)!);
    gNb = next;
  }
  // Renumerar por tamaño (la comunidad 0 es la mayor).
  const size = new Map<number, number>();
  for (const c of member) size.set(c, (size.get(c) ?? 0) + 1);
  const order = [...size.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([c]) => c);
  const rank = new Map(order.map((c, i) => [c, i]));
  const community = member.map((c) => rank.get(c)!);
  return { community, modularity: modularity(adj, community) };
}

/** Modularidad Q de una partición. */
export function modularity(adj: Adj, community: number[]): number {
  const k = adj.nb.map((l) => l.reduce((s, { w }) => s + w, 0));
  const m2 = k.reduce((a, b) => a + b, 0);
  if (!m2) return 0;
  let q = 0;
  for (let i = 0; i < adj.n; i++)
    for (const { j, w } of adj.nb[i]!) if (community[i] === community[j]) q += w;
  const tot = new Map<number, number>();
  community.forEach((c, i) => tot.set(c, (tot.get(c) ?? 0) + k[i]!));
  for (const t of tot.values()) q -= (t * t) / m2;
  return q / m2;
}

/** Puntos de corte y aristas puente (Tarjan, no dirigido). */
function cutsAndBridges(adj: Adj): { cut: boolean[]; bridges: [number, number][] } {
  const { n, nb } = adj;
  const disc = new Array<number>(n).fill(-1);
  const low = new Array<number>(n).fill(0);
  const cut = new Array<boolean>(n).fill(false);
  const bridges: [number, number][] = [];
  let time = 0;
  const dfs = (u: number, parent: number) => {
    disc[u] = low[u] = time++;
    let children = 0;
    let parentSkipped = false;
    for (const { j: v } of nb[u]!) {
      if (v === parent && !parentSkipped) {
        parentSkipped = true;
        continue;
      }
      if (disc[v]! < 0) {
        children++;
        dfs(v, u);
        low[u] = Math.min(low[u]!, low[v]!);
        if (parent >= 0 && low[v]! >= disc[u]!) cut[u] = true;
        if (low[v]! > disc[u]!) bridges.push([u, v]);
      } else low[u] = Math.min(low[u]!, disc[v]!);
    }
    if (parent < 0 && children > 1) cut[u] = true;
  };
  for (let i = 0; i < n; i++) if (disc[i]! < 0) dfs(i, -1);
  return { cut, bridges };
}

/** Componentes conexos: número de componente de cada nodo. */
function components(adj: Adj): number[] {
  const comp = new Array<number>(adj.n).fill(-1);
  let c = 0;
  for (let s = 0; s < adj.n; s++) {
    if (comp[s]! >= 0) continue;
    const q = [s];
    comp[s] = c;
    for (let h = 0; h < q.length; h++)
      for (const { j } of adj.nb[q[h]!]!)
        if (comp[j]! < 0) {
          comp[j] = c;
          q.push(j);
        }
    c++;
  }
  return comp;
}

// ---------------------------------------------------------------- análisis

export interface NodeMetrics {
  degree: number;
  strength: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  community: number;
  component: number;
  /** Quitarlo separa la red en más partes. */
  cut: boolean;
}

export interface NetworkAnalysis {
  metrics: Map<string, NodeMetrics>;
  /** Ids de aristas puente (su eliminación desconecta la red). */
  bridges: Set<string>;
  communities: number;
  components: number;
  modularity: number;
  /** Densidad: aristas existentes / posibles. */
  density: number;
  averageDegree: number;
}

export function analyze(net: Network): NetworkAnalysis {
  const adj = adjacency(net);
  const bt = betweenness(adj);
  const cl = harmonicCloseness(adj);
  const ev = eigenvector(adj);
  const { community, modularity: q } = louvain(adj);
  const { cut, bridges } = cutsAndBridges(adj);
  const comp = components(adj);
  const metrics = new Map<string, NodeMetrics>();
  net.nodes.forEach((node, i) =>
    metrics.set(node.id, {
      degree: adj.nb[i]!.length,
      strength: adj.nb[i]!.reduce((s, { w }) => s + w, 0),
      betweenness: bt[i]!,
      closeness: cl[i]!,
      eigenvector: ev[i]!,
      community: community[i]!,
      component: comp[i]!,
      cut: cut[i]!,
    }),
  );
  const bridgeIds = new Set<string>();
  const ids = net.nodes.map((n) => n.id);
  for (const [a, b] of bridges) {
    const e = net.edges.find(
      (x) =>
        (x.source === ids[a] && x.target === ids[b]) ||
        (x.source === ids[b] && x.target === ids[a]),
    );
    if (e) bridgeIds.add(e.id);
  }
  const n = net.nodes.length;
  return {
    metrics,
    bridges: bridgeIds,
    communities: new Set(community).size,
    components: new Set(comp).size,
    modularity: q,
    density: n > 1 ? net.edges.length / ((n * (n - 1)) / 2) : 0,
    averageDegree: n ? (2 * net.edges.length) / n : 0,
  };
}

export const METRICS = ['degree', 'betweenness', 'closeness', 'eigenvector'] as const;
export type MetricKey = (typeof METRICS)[number];
export const METRIC_NAMES: Record<MetricKey, { name: string; hint: string }> = {
  degree: { name: 'Grado', hint: 'Número de vínculos directos: quién está más conectado.' },
  betweenness: {
    name: 'Intermediación',
    hint: 'Cuántos caminos pasan por el nodo: intermediarios y puentes entre grupos.',
  },
  closeness: {
    name: 'Cercanía',
    hint: 'Qué tan rápido llega a toda la red: alcance e influencia.',
  },
  eigenvector: {
    name: 'Vector propio',
    hint: 'Conectado con otros nodos importantes: poder dentro de la red.',
  },
};

/** Ranking de nodos por una métrica (mayor primero). */
export function ranking(net: Network, a: NetworkAnalysis, key: MetricKey): NetNode[] {
  return [...net.nodes].sort(
    (x, y) =>
      a.metrics.get(y.id)![key] - a.metrics.get(x.id)![key] || x.label.localeCompare(y.label),
  );
}

// ---------------------------------------------------------------- distribución por fuerzas

export type Positions = Map<string, { x: number; y: number }>;

/**
 * Distribución por fuerzas tipo ForceAtlas2: los nodos se repelen según su grado, los
 * vínculos atraen según su peso y una gravedad suave los mantiene juntos. Parte de `start`
 * (la distribución anterior o el diagrama) para que la red no salte al editarla.
 */
export function forceLayout(
  net: Network,
  start: Positions,
  iterations = 300,
  opts: { scaling?: number; gravity?: number } = {},
): Positions {
  const n = net.nodes.length;
  const adj = adjacency(net);
  const kr = opts.scaling ?? 40;
  const kg = opts.gravity ?? 1;
  const deg = adj.nb.map((l) => l.length);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  // Posición inicial: la anterior; si es nuevo, junto a un vecino o en espiral.
  net.nodes.forEach((node, i) => {
    const p = start.get(node.id);
    if (p) {
      xs[i] = p.x;
      ys[i] = p.y;
      return;
    }
    const nbPos = adj.nb[i]!.map(({ j }) => start.get(net.nodes[j]!.id)).find(Boolean);
    const a = i * 2.399963;
    const r = nbPos ? 30 : 40 * Math.sqrt(i + 1);
    xs[i] = (nbPos?.x ?? 0) + r * Math.cos(a);
    ys[i] = (nbPos?.y ?? 0) + r * Math.sin(a);
  });
  let speed = 1;
  for (let it = 0; it < iterations; it++) {
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);
    // Repulsión entre todos los pares (proporcional a (grado+1)·(grado+1) / distancia).
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        let dx = xs[i]! - xs[j]!;
        let dy = ys[i]! - ys[j]!;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = 0.1 * ((i % 7) - 3) + 0.05;
          dy = 0.1 * ((j % 5) - 2) + 0.05;
          d2 = dx * dx + dy * dy;
        }
        const f = (kr * kr * (deg[i]! + 1) * (deg[j]! + 1)) / d2;
        fx[i]! += dx * f;
        fy[i]! += dy * f;
        fx[j]! -= dx * f;
        fy[j]! -= dy * f;
      }
    // Atracción por los vínculos (proporcional a la distancia y al peso).
    for (const e of net.edges) {
      const a = adj.index.get(e.source)!;
      const b = adj.index.get(e.target)!;
      const dx = xs[b]! - xs[a]!;
      const dy = ys[b]! - ys[a]!;
      const f = 0.06 * e.weight;
      fx[a]! += dx * f;
      fy[a]! += dy * f;
      fx[b]! -= dx * f;
      fy[b]! -= dy * f;
    }
    // Gravedad hacia el centro.
    for (let i = 0; i < n; i++) {
      fx[i]! -= xs[i]! * 0.01 * kg * (deg[i]! + 1);
      fy[i]! -= ys[i]! * 0.01 * kg * (deg[i]! + 1);
    }
    // Paso con límite de desplazamiento que se enfría con las iteraciones.
    const maxStep = 40 * speed;
    for (let i = 0; i < n; i++) {
      const len = Math.hypot(fx[i]!, fy[i]!);
      const k = len > maxStep ? maxStep / len : 1;
      xs[i]! += fx[i]! * k * 0.5;
      ys[i]! += fy[i]! * k * 0.5;
    }
    speed = Math.max(0.05, speed * 0.985);
  }
  const out: Positions = new Map();
  net.nodes.forEach((node, i) => out.set(node.id, { x: xs[i]!, y: ys[i]! }));
  return out;
}

/** Posiciones iniciales desde el diagrama, centradas y a escala de la red. */
export function diagramPositions(net: Network): Positions {
  if (!net.nodes.length) return new Map();
  const cx = net.nodes.reduce((s, n) => s + n.x, 0) / net.nodes.length;
  const cy = net.nodes.reduce((s, n) => s + n.y, 0) / net.nodes.length;
  return new Map(net.nodes.map((n) => [n.id, { x: (n.x - cx) * 0.6, y: (n.y - cy) * 0.6 }]));
}

// ---------------------------------------------------------------- colores

/** Paleta de comunidades (distinguible, como la de Gephi). */
export const COMMUNITY_COLORS = [
  '#e5484d',
  '#3b82f6',
  '#22a06b',
  '#f59e0b',
  '#a855f7',
  '#14b8a6',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#06b6d4',
  '#eab308',
];
export const communityColor = (c: number): string => COMMUNITY_COLORS[c % COMMUNITY_COLORS.length]!;

export const TYPE_COLORS: Record<NetNodeType, string> = {
  amenaza: '#e5484d',
  persona: '#22a06b',
  fuente: '#f59e0b',
  propio: '#3b82f6',
  lugar: '#14b8a6',
  vehiculo: '#eab308',
  estructura: '#a855f7',
};

// ---------------------------------------------------------------- GEXF (Gephi)

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hexRgb = (h: string) => {
  const v = parseInt(h.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
};

/** Archivo GEXF 1.3 con atributos, métricas, colores y posiciones, listo para Gephi. */
export function toGexf(
  title: string,
  net: Network,
  a: NetworkAnalysis,
  pos: Positions,
  sizeBy: MetricKey = 'degree',
): string {
  const max = Math.max(...net.nodes.map((n) => a.metrics.get(n.id)![sizeBy]), 1e-9);
  const nodes = net.nodes
    .map((n) => {
      const m = a.metrics.get(n.id)!;
      const p = pos.get(n.id) ?? { x: 0, y: 0 };
      const c = hexRgb(communityColor(m.community));
      return `      <node id="${xml(n.id)}" label="${xml(n.label)}">
        <attvalues>
          <attvalue for="tipo" value="${xml(NET_TYPE_NAMES[n.type])}"/>
          <attvalue for="detalle" value="${xml(n.sub)}"/>
          <attvalue for="comunidad" value="${m.community}"/>
          <attvalue for="grado" value="${m.degree}"/>
          <attvalue for="intermediacion" value="${m.betweenness.toFixed(6)}"/>
          <attvalue for="cercania" value="${m.closeness.toFixed(6)}"/>
          <attvalue for="vector_propio" value="${m.eigenvector.toFixed(6)}"/>
          <attvalue for="punto_de_corte" value="${m.cut}"/>
        </attvalues>
        <viz:color r="${c.r}" g="${c.g}" b="${c.b}"/>
        <viz:position x="${p.x.toFixed(2)}" y="${(-p.y).toFixed(2)}" z="0"/>
        <viz:size value="${(6 + 24 * (m[sizeBy] / max)).toFixed(2)}"/>
      </node>`;
    })
    .join('\n');
  const edges = net.edges
    .map(
      (e) =>
        `      <edge id="${xml(e.id)}" source="${xml(e.source)}" target="${xml(e.target)}" weight="${e.weight}" label="${xml(NET_EDGE_DEFS[e.kind].name)}">
        <attvalues><attvalue for="tipo" value="${xml(e.kind)}"/><attvalue for="puente" value="${a.bridges.has(e.id)}"/></attvalues>
      </edge>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
  <meta>
    <creator>Mapa Táctico Colombia</creator>
    <description>${xml(title)}</description>
  </meta>
  <graph mode="static" defaultedgetype="undirected">
    <attributes class="node">
      <attribute id="tipo" title="Tipo" type="string"/>
      <attribute id="detalle" title="Detalle" type="string"/>
      <attribute id="comunidad" title="Comunidad" type="integer"/>
      <attribute id="grado" title="Grado" type="integer"/>
      <attribute id="intermediacion" title="Intermediación" type="double"/>
      <attribute id="cercania" title="Cercanía" type="double"/>
      <attribute id="vector_propio" title="Vector propio" type="double"/>
      <attribute id="punto_de_corte" title="Punto de corte" type="boolean"/>
    </attributes>
    <attributes class="edge">
      <attribute id="tipo" title="Tipo de vínculo" type="string"/>
      <attribute id="puente" title="Puente" type="boolean"/>
    </attributes>
    <nodes>
${nodes}
    </nodes>
    <edges>
${edges}
    </edges>
  </graph>
</gexf>
`;
}

// ---------------------------------------------------------------- roles (colores tipo lámina)

export const ROLES = [
  'lider',
  'operativo',
  'familia',
  'sentimental',
  'apoyo',
  'finanzas',
  'bienes',
  'general',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_DEFS: Record<Role, { name: string; color: string }> = {
  lider: { name: 'Líder / hub principal', color: '#2f7de1' },
  operativo: { name: 'Operativo / delictivo', color: '#e5484d' },
  familia: { name: 'Familia / seguridad', color: '#3fae49' },
  sentimental: { name: 'Sentimental', color: '#a855f7' },
  apoyo: { name: 'Personal / apoyo', color: '#14a38b' },
  finanzas: { name: 'Finanzas / económico', color: '#f59e0b' },
  bienes: { name: 'Bienes / evidencia', color: '#e6b800' },
  general: { name: 'Contacto general', color: '#8b95a1' },
};

/** Rol de una estructura según su título. */
function structureRole(title: string): Role {
  const t = title.toLowerCase();
  if (/finanz|econ|dinero|lavado/.test(t)) return 'finanzas';
  if (/bien|evidenc|inmueble|propiedad|veh/.test(t)) return 'bienes';
  if (/segur|famil|escolta/.test(t)) return 'familia';
  if (/mando|control|operat|armad|milit/.test(t)) return 'operativo';
  return 'apoyo';
}

/** Rol de una persona según su detalle (familia, pareja…). */
function personRole(sub: string): Role | null {
  const t = sub.toLowerCase();
  if (/sentim|pareja|novi|amante|esposa|esposo|expareja/.test(t)) return 'sentimental';
  if (/famil|madre|padre|herman|hij|t[ií]o|primo/.test(t)) return 'familia';
  if (/apoyo|contacto|log[ií]st/.test(t)) return 'apoyo';
  return null;
}

/**
 * Rol de cada nodo para colorear la red como una lámina de inteligencia: líderes (integrantes
 * de la amenaza con muchos vínculos), operativos, familia, sentimental, apoyo, finanzas y
 * bienes. Los integrantes de una estructura toman su rol y los contactos sueltos (un solo
 * vínculo) heredan el de quien los conecta.
 */
export function roles(net: Network, a: NetworkAnalysis): Map<string, Role> {
  const out = new Map<string, Role>();
  const byId = new Map(net.nodes.map((n) => [n.id, n]));
  const threatDeg = net.nodes
    .filter((n) => n.type === 'amenaza')
    .map((n) => a.metrics.get(n.id)!.degree);
  const maxDeg = Math.max(0, ...threatDeg);
  const leaderMin = Math.max(5, Math.ceil(maxDeg * 0.4));
  for (const n of net.nodes) {
    const deg = a.metrics.get(n.id)!.degree;
    let r: Role;
    if (n.type === 'estructura') r = structureRole(n.label);
    else if (n.type === 'amenaza') r = deg >= leaderMin ? 'lider' : 'operativo';
    else if (n.type === 'lugar' || n.type === 'vehiculo') r = 'bienes';
    else if (n.type === 'fuente') r = 'apoyo';
    else r = personRole(n.sub) ?? 'general';
    out.set(n.id, r);
  }
  // Pertenencia: los miembros de una estructura (salvo líderes) toman su rol.
  for (const e of net.edges) {
    if (e.kind !== 'pertenencia') continue;
    const [g, m] =
      byId.get(e.source)?.type === 'estructura' ? [e.source, e.target] : [e.target, e.source];
    if (out.get(m) !== 'lider') out.set(m, out.get(g)!);
  }
  // Contactos sueltos: heredan el rol de su único vecino (si no es un líder).
  const nb = new Map<string, string[]>();
  for (const e of net.edges) {
    nb.set(e.source, [...(nb.get(e.source) ?? []), e.target]);
    nb.set(e.target, [...(nb.get(e.target) ?? []), e.source]);
  }
  for (const n of net.nodes) {
    const list = nb.get(n.id) ?? [];
    if (out.get(n.id) !== 'general' || list.length !== 1) continue;
    const r = out.get(list[0]!)!;
    if (r !== 'lider') out.set(n.id, r);
  }
  return out;
}
