/**
 * Grafo de análisis de vínculos: integrantes de la amenaza (rombos), personas y fuentes
 * (siluetas con anillo de color), lugares, vehículos o propiedades (triángulos) y cuadros
 * de estructura con su pestaña (mando y control, finanzas, logística…), unidos por vínculos
 * confirmados o por confirmar. Incluye el cuadro de convenciones.
 *
 * Todo es puro: el grafo se dibuja como una cadena SVG que usan el editor, la ficha en el
 * mapa (2D y 3D) y la exportación.
 */
import { uid } from './id';
import { SOURCE_DEFS, profileTitle, type Profile, type SourceType } from './profiles';

export const NODE_KINDS = ['amenaza', 'persona', 'fuente', 'propio', 'lugar', 'vehiculo'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = [
  'confirmado',
  'por-confirmar',
  'fuente-confirmado',
  'fuente-por-confirmar',
] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export const TAB_SIDES = ['top', 'bottom', 'left', 'right'] as const;
export type TabSide = (typeof TAB_SIDES)[number];

export interface ChartNode {
  id: string;
  kind: NodeKind;
  /** Centro del símbolo. */
  x: number;
  y: number;
  /** Rótulo principal; si falta y hay perfil, se usa el del perfil. */
  label: string;
  /** Segunda línea (cargo, estructura…); si falta y hay perfil, su cargo. */
  sub: string;
  profileId?: string;
  /** Tipo de fuente (anillo de color) para `fuente`. */
  source?: SourceType;
  /** Foto propia del nodo (data URL); si falta, la del perfil. */
  photo?: string;
}

/** Cuadro de estructura o lugar con pestaña de título. */
export interface ChartGroup {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tab: TabSide;
}

export interface ChartEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  /** Flecha en el extremo `to`. */
  arrow: boolean;
  label: string;
}

export interface LinkChart {
  id: string;
  title: string;
  nodes: ChartNode[];
  groups: ChartGroup[];
  edges: ChartEdge[];
  /** Mostrar el cuadro de convenciones. */
  legend: boolean;
}

export const NODE_DEFS: Record<NodeKind, { name: string; w: number; h: number }> = {
  amenaza: { name: 'Integrante de la amenaza', w: 64, h: 64 },
  persona: { name: 'Persona', w: 50, h: 50 },
  fuente: { name: 'Fuente', w: 50, h: 50 },
  propio: { name: 'Propio', w: 50, h: 50 },
  lugar: { name: 'Lugar', w: 96, h: 50 },
  vehiculo: { name: 'Vehículo o propiedad', w: 130, h: 110 },
};

export const EDGE_DEFS: Record<EdgeKind, { name: string; color: string; dashed: boolean }> = {
  confirmado: {
    name: 'Vínculo confirmado dentro de la organización',
    color: '#111111',
    dashed: false,
  },
  'por-confirmar': {
    name: 'Vínculo por confirmar dentro de la organización',
    color: '#111111',
    dashed: true,
  },
  'fuente-confirmado': { name: 'Vínculo confirmado de la fuente', color: '#1f3fd6', dashed: false },
  'fuente-por-confirmar': {
    name: 'Vínculo por confirmar de la fuente',
    color: '#1f3fd6',
    dashed: true,
  },
};

export const TAB_NAMES: Record<TabSide, string> = {
  top: 'Arriba',
  bottom: 'Abajo',
  left: 'Izquierda',
  right: 'Derecha',
};

const THREAT_RED = '#ff0000';
const TAB_RED = '#a00d12';
const PROPIO_BLUE = '#2f6fd0';

export function newChart(title = 'Red de vínculos'): LinkChart {
  return { id: 'gr' + uid(), title, nodes: [], groups: [], edges: [], legend: true };
}

export const newNode = (kind: NodeKind, x: number, y: number, patch: Partial<ChartNode> = {}) =>
  ({ id: 'n' + uid(), kind, x, y, label: '', sub: '', ...patch }) satisfies ChartNode;

export const newGroup = (x: number, y: number, patch: Partial<ChartGroup> = {}): ChartGroup => ({
  id: 'g' + uid(),
  title: 'ESTRUCTURA',
  x,
  y,
  w: 320,
  h: 150,
  tab: 'bottom',
  ...patch,
});

export const newEdge = (from: string, to: string, kind: EdgeKind = 'confirmado'): ChartEdge => ({
  id: 'e' + uid(),
  from,
  to,
  kind,
  arrow: true,
  label: '',
});

/** Nodo que corresponde a un perfil (rombo, silueta o fuente según su rol). */
export function nodeForProfile(p: Profile, x: number, y: number): ChartNode {
  const kind: NodeKind =
    p.rol === 'amenaza'
      ? 'amenaza'
      : p.rol === 'fuente'
        ? 'fuente'
        : p.rol === 'propio'
          ? 'propio'
          : 'persona';
  return newNode(kind, x, y, {
    profileId: p.id,
    ...(p.rol === 'fuente' ? { source: p.fuente ?? 'estudio' } : {}),
  });
}

// ---------------------------------------------------------------- edición

/** Quita un nodo o cuadro y sus vínculos. */
export function removeElement(c: LinkChart, id: string): LinkChart {
  return {
    ...c,
    nodes: c.nodes.filter((n) => n.id !== id),
    groups: c.groups.filter((g) => g.id !== id),
    edges: c.edges.filter((e) => e.id !== id && e.from !== id && e.to !== id),
  };
}

/** Mueve un nodo o un cuadro. Al mover un cuadro se mueven los nodos que contiene. */
export function moveElement(c: LinkChart, id: string, dx: number, dy: number): LinkChart {
  const g = c.groups.find((x) => x.id === id);
  if (g) {
    const inside = new Set(c.nodes.filter((n) => insideGroup(n, g)).map((n) => n.id));
    return {
      ...c,
      groups: c.groups.map((x) => (x.id === id ? { ...x, x: x.x + dx, y: x.y + dy } : x)),
      nodes: c.nodes.map((n) => (inside.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
    };
  }
  return {
    ...c,
    nodes: c.nodes.map((n) => (n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
  };
}

export const insideGroup = (n: ChartNode, g: ChartGroup): boolean =>
  n.x >= g.x && n.x <= g.x + g.w && n.y >= g.y && n.y <= g.y + g.h;

/** Ya existe un vínculo entre esos dos elementos (en cualquier sentido). */
export const hasEdge = (c: LinkChart, a: string, b: string): boolean =>
  c.edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));

// ---------------------------------------------------------------- geometría

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export function elementBox(c: LinkChart, id: string): Box | null {
  const n = c.nodes.find((x) => x.id === id);
  if (n) {
    const d = NODE_DEFS[n.kind];
    return { cx: n.x, cy: n.y, w: d.w, h: d.h };
  }
  const g = c.groups.find((x) => x.id === id);
  if (g) return { cx: g.x + g.w / 2, cy: g.y + g.h / 2, w: g.w, h: g.h };
  return null;
}

export type Pt = [number, number];

/**
 * Ruta ortogonal (codos de 90°) entre los bordes de dos cajas, como los conectores de un
 * organigrama. Si las cajas se solapan en un eje, el vínculo es una recta.
 */
export function routeEdge(a: Box, b: Box): Pt[] {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const overlapY = [
    Math.max(a.cy - a.h / 2, b.cy - b.h / 2),
    Math.min(a.cy + a.h / 2, b.cy + b.h / 2),
  ];
  const overlapX = [
    Math.max(a.cx - a.w / 2, b.cx - b.w / 2),
    Math.min(a.cx + a.w / 2, b.cx + b.w / 2),
  ];
  const gapX = Math.abs(dx) - (a.w + b.w) / 2;
  const gapY = Math.abs(dy) - (a.h + b.h) / 2;
  const sx = Math.sign(dx) || 1;
  const sy = Math.sign(dy) || 1;
  let pts: Pt[];
  if (gapX >= gapY) {
    const x1 = a.cx + (sx * a.w) / 2;
    const x2 = b.cx - (sx * b.w) / 2;
    if (overlapY[1]! - overlapY[0]! > 8 && (a.h > 70 || b.h > 70)) {
      const y = (overlapY[0]! + overlapY[1]!) / 2;
      pts = [
        [x1, y],
        [x2, y],
      ];
    } else {
      const mx = (x1 + x2) / 2;
      pts = [
        [x1, a.cy],
        [mx, a.cy],
        [mx, b.cy],
        [x2, b.cy],
      ];
    }
  } else {
    const y1 = a.cy + (sy * a.h) / 2;
    const y2 = b.cy - (sy * b.h) / 2;
    if (overlapX[1]! - overlapX[0]! > 8 && (a.w > 70 || b.w > 70)) {
      const x = (overlapX[0]! + overlapX[1]!) / 2;
      pts = [
        [x, y1],
        [x, y2],
      ];
    } else {
      const my = (y1 + y2) / 2;
      pts = [
        [a.cx, y1],
        [a.cx, my],
        [b.cx, my],
        [b.cx, y2],
      ];
    }
  }
  return pts
    .map(([x, y]): Pt => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])
    .filter((p, i, arr) => i === 0 || p[0] !== arr[i - 1]![0] || p[1] !== arr[i - 1]![1]);
}

/** Parte un texto en líneas de hasta `max` caracteres (respeta los saltos de línea). */
export function wrapText(text: string, max = 24): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length > max) {
        out.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) out.push(line);
  }
  return out;
}

/** Rótulo y segunda línea de un nodo (los del perfil si el nodo no tiene propios). */
export function nodeText(
  n: ChartNode,
  profiles: ReadonlyMap<string, Profile>,
): { label: string; sub: string; photo?: string } {
  const p = n.profileId ? profiles.get(n.profileId) : undefined;
  return {
    label: n.label || (p ? profileTitle(p) : ''),
    sub: n.sub || (p?.cargo ?? ''),
    photo: n.photo ?? p?.foto,
  };
}

const LINE_H = 12;

/** Caja que ocupa un nodo con su rótulo (para los límites del dibujo). */
function nodeExtent(n: ChartNode, profiles: ReadonlyMap<string, Profile>) {
  const d = NODE_DEFS[n.kind];
  const t = nodeText(n, profiles);
  const lines = labelLines(n, t).length;
  const inside = n.kind === 'lugar';
  const textW = Math.max(...labelLines(n, t).map((l) => l.length * 5.6), 0);
  return {
    x0: n.x - Math.max(d.w, textW) / 2,
    x1: n.x + Math.max(d.w, textW) / 2,
    y0: n.y - d.h / 2,
    y1: n.y + d.h / 2 + (inside ? 0 : 6 + lines * LINE_H),
  };
}

function labelLines(n: ChartNode, t: { label: string; sub: string }): string[] {
  const max = n.kind === 'lugar' ? 16 : 19;
  return [...wrapText(t.label, max), ...wrapText(t.sub, max)];
}

export const LEGEND_W = 236;

function legendRows(): number {
  return EDGE_KINDS.length + 4 + Object.keys(SOURCE_DEFS).length;
}

const legendH = () => 40 + legendRows() * 22;

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Límites del dibujo (contenido, título y convenciones), con margen. */
export function chartBounds(c: LinkChart, profiles: ReadonlyMap<string, Profile>): Bounds {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (a: number, b: number, cc: number, d: number) => {
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, cc);
    y1 = Math.max(y1, d);
  };
  for (const n of c.nodes) {
    const e = nodeExtent(n, profiles);
    add(e.x0, e.y0, e.x1, e.y1);
  }
  for (const g of c.groups) {
    const t = g.tab === 'left' ? 14 : 0;
    const r = g.tab === 'right' ? 14 : 0;
    add(g.x - t, g.y - 12, g.x + g.w + r, g.y + g.h + 12);
  }
  if (!Number.isFinite(x0)) {
    x0 = 0;
    y0 = 0;
    x1 = 400;
    y1 = 240;
  }
  const pad = 24;
  const top = c.title ? 34 : 0;
  x0 -= pad;
  y0 -= pad + top;
  x1 += pad;
  y1 += pad;
  if (c.legend) {
    x1 += LEGEND_W + 8;
    y1 = Math.max(y1, y0 + top + pad + legendH() + pad);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------------------------------------------------------------- SVG

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );

/** Silueta de persona centrada en (0,0), radio `r`. */
const silhouette = (r: number) =>
  `<circle cx="0" cy="${-r * 0.22}" r="${r * 0.3}" fill="#111"/><path d="M${-r * 0.62} ${r * 0.62}Q${-r * 0.6} ${r * 0.08} 0 ${r * 0.1}Q${r * 0.6} ${r * 0.08} ${r * 0.62} ${r * 0.62}Z" fill="#111"/>`;

let clipSeq = 0;

function nodeSymbol(n: ChartNode, photo: string | undefined, sel: boolean): string {
  const d = NODE_DEFS[n.kind];
  const hl = sel ? '#f5a400' : null;
  const id = `c${n.id}${clipSeq++}`;
  switch (n.kind) {
    case 'amenaza': {
      const r = d.w / 2;
      const pts = `0,${-r} ${r},0 0,${r} ${-r},0`;
      const img = photo
        ? `<clipPath id="${id}"><polygon points="${pts}"/></clipPath><image href="${esc(photo)}" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
        : '';
      return `<polygon points="${pts}" fill="${THREAT_RED}" stroke="${hl ?? '#5a0000'}" stroke-width="${hl ? 3 : 1.2}"/>${img}${photo ? `<polygon points="${pts}" fill="none" stroke="${THREAT_RED}" stroke-width="3"/>` : ''}`;
    }
    case 'persona':
    case 'fuente':
    case 'propio': {
      const r = d.w / 2;
      const ring =
        n.kind === 'fuente'
          ? SOURCE_DEFS[n.source ?? 'estudio'].color
          : n.kind === 'propio'
            ? PROPIO_BLUE
            : '#111';
      const inner = photo
        ? `<clipPath id="${id}"><circle r="${r - 2}"/></clipPath><image href="${esc(photo)}" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
        : silhouette(r);
      return `<circle r="${r}" fill="#fff"/>${inner}<circle r="${r - 1.5}" fill="none" stroke="${ring}" stroke-width="${n.kind === 'persona' ? 1.5 : 4}"/>${hl ? `<circle r="${r + 4}" fill="none" stroke="${hl}" stroke-width="2.5"/>` : ''}`;
    }
    case 'lugar':
      return `<rect x="${-d.w / 2}" y="${-d.h / 2}" width="${d.w}" height="${d.h}" fill="#fff" stroke="${hl ?? '#111'}" stroke-width="${hl ? 3 : 1.4}"/>`;
    case 'vehiculo': {
      const w = d.w / 2;
      const h = d.h / 2;
      const pts = `0,${-h} ${w},${h} ${-w},${h}`;
      const img = photo
        ? `<clipPath id="${id}"><polygon points="0,${-h + 26} ${w - 20},${h - 6} ${-w + 20},${h - 6}"/></clipPath><image href="${esc(photo)}" x="${-w}" y="${-h + 20}" width="${2 * w}" height="${2 * h - 24}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
        : `<path d="M-22 ${h - 22}h44l-6 -12h-32z M-26 ${h - 22}h52v10h-52z" fill="#111"/><circle cx="-14" cy="${h - 11}" r="5" fill="#111"/><circle cx="14" cy="${h - 11}" r="5" fill="#111"/>`;
      return `<polygon points="${pts}" fill="#fff" stroke="${hl ?? '#111'}" stroke-width="${hl ? 3 : 1.4}"/>${img}`;
    }
  }
}

function textBlock(lines: string[], x: number, y: number, size = 10.5, weight = 400): string {
  if (!lines.length) return '';
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="#111">${lines
    .map((l, i) => `<tspan x="${x}" dy="${i ? LINE_H : 0}">${esc(l)}</tspan>`)
    .join('')}</text>`;
}

function renderNode(
  n: ChartNode,
  profiles: ReadonlyMap<string, Profile>,
  sel: boolean,
  editing: boolean,
): string {
  const d = NODE_DEFS[n.kind];
  const t = nodeText(n, profiles);
  const labelL = wrapText(t.label, n.kind === 'lugar' ? 16 : 19);
  const subL = wrapText(t.sub, n.kind === 'lugar' ? 16 : 19);
  const attrs = editing ? ` data-id="${n.id}" data-type="node" style="cursor:move"` : '';
  let text: string;
  if (n.kind === 'lugar') {
    const all = [...labelL, ...subL];
    text = textBlock(all, n.x, n.y - ((all.length - 1) * LINE_H) / 2 + 4, 10.5, 700);
  } else {
    const y = n.y + d.h / 2 + 14;
    text =
      textBlock(labelL, n.x, y, 10.5, 600) + textBlock(subL, n.x, y + labelL.length * LINE_H, 10);
  }
  return `<g${attrs}><g transform="translate(${n.x} ${n.y})">${nodeSymbol(n, t.photo, sel)}</g>${text}</g>`;
}

function renderGroup(g: ChartGroup, sel: boolean, editing: boolean): string {
  const attrs = editing ? ` data-id="${g.id}" data-type="group" style="cursor:move"` : '';
  const title = g.title.toUpperCase();
  const len = Math.max(40, title.length * 7.6 + 26);
  let tab = '';
  if (title) {
    if (g.tab === 'top' || g.tab === 'bottom') {
      const tw = Math.min(g.w - 10, len);
      const ty = g.tab === 'top' ? g.y - 10 : g.y + g.h - 10;
      tab = `<rect x="${g.x + g.w / 2 - tw / 2}" y="${ty}" width="${tw}" height="20" fill="${TAB_RED}"/><text x="${g.x + g.w / 2}" y="${ty + 14}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" letter-spacing=".5">${esc(title)}</text>`;
    } else {
      const th = Math.min(g.h - 10, len);
      const tx = g.tab === 'left' ? g.x - 12 : g.x + g.w - 10;
      const cy = g.y + g.h / 2;
      tab = `<rect x="${tx}" y="${cy - th / 2}" width="22" height="${th}" fill="${TAB_RED}"/><text transform="translate(${tx + 15} ${cy}) rotate(-90)" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" letter-spacing=".5">${esc(title)}</text>`;
    }
  }
  const handle =
    editing && sel
      ? `<rect data-id="${g.id}" data-type="resize" x="${g.x + g.w - 7}" y="${g.y + g.h - 7}" width="14" height="14" fill="#f5a400" stroke="#fff" style="cursor:nwse-resize"/>`
      : '';
  return `<g${attrs}><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" fill="#fff" fill-opacity="${editing ? 0.001 : 0}" stroke="${sel ? '#f5a400' : '#111'}" stroke-width="${sel ? 3 : 1.3}"/>${tab}</g>${handle}`;
}

function renderEdge(c: LinkChart, e: ChartEdge, sel: boolean, editing: boolean): string {
  const a = elementBox(c, e.from);
  const b = elementBox(c, e.to);
  if (!a || !b) return '';
  const pts = routeEdge(a, b);
  const def = EDGE_DEFS[e.kind];
  const color = sel ? '#f5a400' : def.color;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('');
  const marker = e.arrow ? ` marker-end="url(#ah-${sel ? 'sel' : e.kind})"` : '';
  const hit = editing
    ? `<path d="${d}" fill="none" stroke="transparent" stroke-width="12" data-id="${e.id}" data-type="edge" style="cursor:pointer"/>`
    : '';
  let label = '';
  if (e.label) {
    const mid = Math.floor((pts.length - 1) / 2);
    const p = pts[mid]!;
    const q = pts[mid + 1] ?? p;
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const w = e.label.length * 5.6 + 10;
    label = `<rect x="${mx - w / 2}" y="${my - 8}" width="${w}" height="15" fill="#fff"/><text x="${mx}" y="${my + 3.5}" text-anchor="middle" font-size="9.5" fill="${def.color}">${esc(e.label)}</text>`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sel ? 2.6 : 1.4}"${def.dashed ? ' stroke-dasharray="6 4"' : ''}${marker}/>${hit}${label}`;
}

function markers(): string {
  const mk = (id: string, color: string) =>
    `<marker id="ah-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker>`;
  return `<defs>${EDGE_KINDS.map((k) => mk(k, EDGE_DEFS[k].color)).join('')}${mk('sel', '#f5a400')}</defs>`;
}

function renderLegend(x: number, y: number): string {
  const rows: string[] = [];
  let ry = y + 40;
  const row = (icon: string, text: string) => {
    rows.push(
      `<g transform="translate(${x + 22} ${ry})">${icon}</g><text x="${x + 44}" y="${ry + 3.5}" font-size="9" fill="#111">${esc(text.toUpperCase())}</text>`,
    );
    ry += 22;
  };
  for (const k of EDGE_KINDS) {
    const d = EDGE_DEFS[k];
    row(
      `<line x1="-12" y1="0" x2="12" y2="0" stroke="${d.color}" stroke-width="1.5"${d.dashed ? ' stroke-dasharray="4 3"' : ''}/>`,
      d.name,
    );
  }
  row(
    `<polygon points="0,-9 9,0 0,9 -9,0" fill="${THREAT_RED}" stroke="#5a0000"/>`,
    'Integrantes de la amenaza',
  );
  row(
    `<rect x="-10" y="-7" width="20" height="14" fill="#fff" stroke="#111" stroke-width="1.3"/>`,
    'Lugares o estructuras',
  );
  row(
    `<g transform="scale(.36)"><circle r="25" fill="#fff" stroke="#111" stroke-width="3"/>${silhouette(25)}</g>`,
    'Personas',
  );
  row(
    `<polygon points="0,-8 10,8 -10,8" fill="#fff" stroke="#111" stroke-width="1.3"/>`,
    'Vehículos o propiedades',
  );
  for (const s of Object.values(SOURCE_DEFS))
    row(
      `<g transform="scale(.36)"><circle r="25" fill="#fff"/>${silhouette(25)}<circle r="23" fill="none" stroke="${s.color}" stroke-width="7"/></g>`,
      s.name,
    );
  const h = ry - y - 4;
  return `<g><rect x="${x}" y="${y}" width="${LEGEND_W}" height="${h}" rx="14" fill="#fff" stroke="${TAB_RED}" stroke-width="1.4"/><text x="${x + LEGEND_W / 2}" y="${y + 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${TAB_RED}" letter-spacing="1">CONVENCIONES</text>${rows.join('')}</g>`;
}

export interface RenderOptions {
  selectedId?: string | null;
  /** Atributos `data-id` y asas para el editor. */
  editing?: boolean;
  /** Ancho en píxeles del `<svg>` (por defecto, el del dibujo). */
  width?: number;
  /** Encuadre fijo (el editor lo congela mientras se arrastra para que nada salte). */
  bounds?: Bounds;
}

/** Dibuja el grafo completo como SVG (fondo blanco, como una lámina). */
export function renderChartSVG(
  c: LinkChart,
  profiles: ReadonlyMap<string, Profile>,
  opts: RenderOptions = {},
): string {
  const fit = chartBounds(c, profiles);
  const b = opts.bounds ?? fit;
  const sel = opts.selectedId ?? null;
  const editing = !!opts.editing;
  const width = opts.width ?? b.w;
  const height = (width / b.w) * b.h;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${Math.round(width)}" height="${Math.round(height)}" font-family="Arial, Helvetica, sans-serif">`,
    markers(),
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#fff"${editing ? ' data-type="bg"' : ''}/>`,
  ];
  if (c.title)
    parts.push(
      `<text x="${fit.x + fit.w / 2}" y="${fit.y + 26}" text-anchor="middle" font-size="15" font-weight="700" fill="${TAB_RED}" letter-spacing=".5">${esc(c.title.toUpperCase())}</text><line x1="${fit.x + 20}" y1="${fit.y + 36}" x2="${fit.x + fit.w - 20}" y2="${fit.y + 36}" stroke="${TAB_RED}" stroke-width="2"/>`,
    );
  for (const g of c.groups) parts.push(renderGroup(g, g.id === sel, editing));
  for (const e of c.edges) parts.push(renderEdge(c, e, e.id === sel, editing));
  for (const n of c.nodes) parts.push(renderNode(n, profiles, n.id === sel, editing));
  if (c.legend) {
    parts.push(renderLegend(fit.x + fit.w - LEGEND_W - 24, fit.y + (c.title ? 50 : 24)));
  }
  parts.push('</svg>');
  return parts.join('');
}

export const profileMap = (profiles: readonly Profile[] | undefined): Map<string, Profile> =>
  new Map((profiles ?? []).map((p) => [p.id, p]));
