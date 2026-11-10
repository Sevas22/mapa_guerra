/**
 * Generación de los símbolos en SVG según el MFRE 1-02 «Términos y símbolos
 * militares» y la graficación estandarizada DIVFE. Devuelve cadenas para usarlas
 * en `L.divIcon` y en la paleta; no depende de React ni de Leaflet.
 */
import {
  EFFECTIVENESS,
  FACTIONS,
  LINES,
  POINTS,
  UNITS,
  symbolColors,
  type FactionShape,
} from './catalog';
import { isTaskType, previewTask } from './tasks';
import type {
  Effectiveness,
  FactionId,
  LineType,
  MapObject,
  Mobility,
  PointType,
  Reinforcement,
  SymbolStatus,
  UnitType,
} from './types';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

const n = (v: number) => +v.toFixed(2);

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FONT = 'Barlow Condensed,Arial Narrow,sans-serif';

/** Texto centrado que se ajusta al ancho de la caja. */
function fitText(b: Box, s: string, ink: string, maxRatio = 0.55, cy = b.y + b.h / 2): string {
  const t = s.trim();
  if (!t) return '';
  const size = Math.min(b.h * maxRatio, (b.w * 0.92) / (0.62 * Math.max(t.length, 1)));
  return `<text x="${n(b.x + b.w / 2)}" y="${n(cy + size * 0.36)}" text-anchor="middle" font-size="${n(size)}" font-weight="700" fill="${ink}" stroke="none" font-family="${FONT}">${esc(t)}</text>`;
}

// ---------------------------------------------------------------- marcos

interface FrameGeom {
  /** Forma del marco. */
  svg: string;
  /** Caja del ícono (octágono delimitador aproximado). */
  box: Box;
  top: number;
  bottom: number;
}

/** Lienzo de los símbolos de unidad: 60×64 con el centro del marco en (30, 34). */
export const UNIT_CANVAS = { w: 60, h: 64, cx: 30, cy: 34 } as const;

const FRAMES: Record<FactionShape, FrameGeom> = {
  rect: {
    svg: '<rect x="8" y="20" width="44" height="28"/>',
    box: { x: 8, y: 20, w: 44, h: 28 },
    top: 20,
    bottom: 48,
  },
  diamond: {
    svg: '<polygon points="30,12 52,34 30,56 8,34"/>',
    box: { x: 19, y: 25, w: 22, h: 18 },
    top: 12,
    bottom: 56,
  },
  square: {
    svg: '<rect x="16" y="20" width="28" height="28"/>',
    box: { x: 16, y: 20, w: 28, h: 28 },
    top: 20,
    bottom: 48,
  },
  quatrefoil: {
    svg: '<path d="M22 26a8 8 0 0 1 16 0a8 8 0 0 1 0 16a8 8 0 0 1-16 0a8 8 0 0 1 0-16Z"/>',
    box: { x: 20, y: 25, w: 20, h: 18 },
    top: 18,
    bottom: 50,
  },
};

// ---------------------------------------------------------------- íconos

function swordPair(b: Box, ink: string, top = 0.3): string {
  const x1 = b.x + b.w * 0.24;
  const x2 = b.x + b.w * 0.76;
  const y1 = b.y + b.h * top;
  const y2 = b.y + b.h * 0.92;
  const gy = y2 - (y2 - y1) * 0.28;
  const g = b.w * 0.1;
  return (
    `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}M${n(x2)} ${n(y1)}L${n(x1)} ${n(y2)}" stroke-width="2.2"/>` +
    `<path d="M${n(x2 - g * 1.6)} ${n(gy - g)}l${n(g * 1.4)} ${n(g * 1.4)}M${n(x1 + g * 1.6)} ${n(gy - g)}l${n(-g * 1.4)} ${n(g * 1.4)}" stroke-width="1.6"/>` +
    `<circle cx="${n(x1)}" cy="${n(y2)}" r="1.2" fill="${ink}"/><circle cx="${n(x2)}" cy="${n(y2)}" r="1.2" fill="${ink}"/>`
  );
}

function anchorIcon(cx: number, cy: number, r: number, ink: string): string {
  return `<g stroke-width="1.5"><circle cx="${n(cx)}" cy="${n(cy - r * 0.78)}" r="${n(r * 0.18)}"/><path d="M${n(cx)} ${n(cy - r * 0.6)}V${n(cy + r * 0.85)}M${n(cx - r * 0.35)} ${n(cy - r * 0.38)}H${n(cx + r * 0.35)}M${n(cx - r * 0.72)} ${n(cy + r * 0.2)}Q${n(cx - r * 0.6)} ${n(cy + r * 0.95)} ${n(cx)} ${n(cy + r * 0.85)}Q${n(cx + r * 0.6)} ${n(cy + r * 0.95)} ${n(cx + r * 0.72)} ${n(cy + r * 0.2)}"/></g><circle cx="${n(cx)}" cy="${n(cy + r * 0.85)}" r="0.8" fill="${ink}"/>`;
}

function personIcon(cx: number, cy: number, s: number): string {
  return `<g stroke-width="1.5"><circle cx="${n(cx)}" cy="${n(cy - s * 0.3)}" r="${n(s * 0.13)}"/><path d="M${n(cx)} ${n(cy - s * 0.17)}V${n(cy + s * 0.14)}M${n(cx - s * 0.22)} ${n(cy - s * 0.05)}H${n(cx + s * 0.22)}M${n(cx)} ${n(cy + s * 0.14)}L${n(cx - s * 0.18)} ${n(cy + s * 0.42)}M${n(cx)} ${n(cy + s * 0.14)}L${n(cx + s * 0.18)} ${n(cy + s * 0.42)}"/></g>`;
}

type Glyph = (b: Box, ink: string, text: string) => string;

const infanteria: Glyph = (b) =>
  `<path d="M${b.x} ${b.y}L${b.x + b.w} ${b.y + b.h}M${b.x} ${b.y + b.h}L${b.x + b.w} ${b.y}"/>`;
const blindados: Glyph = (b) => {
  const w = b.w * 0.6;
  const h = b.h * 0.4;
  return `<rect x="${n(b.x + (b.w - w) / 2)}" y="${n(b.y + (b.h - h) / 2)}" width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}"/>`;
};
const label =
  (s: string): Glyph =>
  (b, ink) =>
    fitText(b, s, ink);

const UNIT_GLYPHS: Record<UnitType, Glyph> = {
  infanteria,
  mecanizada: (b, i, t) => infanteria(b, i, t) + blindados(b, i, t),
  blindados,
  reconocimiento: (b) => `<path d="M${b.x} ${b.y + b.h}L${b.x + b.w} ${b.y}"/>`,
  artilleria: (b, ink) =>
    `<circle cx="${n(b.x + b.w / 2)}" cy="${n(b.y + b.h / 2)}" r="${n(Math.min(b.w, b.h) * 0.16)}" fill="${ink}"/>`,
  antiaerea: (b) =>
    `<path d="M${b.x} ${b.y + b.h}Q${n(b.x + b.w / 2)} ${n(b.y + b.h * 0.2)} ${b.x + b.w} ${b.y + b.h}"/>`,
  antitanque: (b) =>
    `<path d="M${b.x} ${b.y + b.h}L${n(b.x + b.w / 2)} ${b.y}L${b.x + b.w} ${b.y + b.h}"/>`,
  morteros: (b) => {
    const cx = b.x + b.w / 2;
    const top = b.y + b.h * 0.12;
    const r = b.h * 0.11;
    const cy = b.y + b.h * 0.78;
    return `<path d="M${n(cx)} ${n(cy - r)}V${n(top)}M${n(cx - 3)} ${n(top + 3)}L${n(cx)} ${n(top)}L${n(cx + 3)} ${n(top + 3)}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`;
  },
  ingenieros: (b) =>
    `<path d="M${n(b.x + b.w * 0.25)} ${n(b.y + b.h * 0.68)}V${n(b.y + b.h * 0.32)}H${n(b.x + b.w * 0.75)}V${n(b.y + b.h * 0.68)}M${n(b.x + b.w / 2)} ${n(b.y + b.h * 0.32)}V${n(b.y + b.h * 0.6)}"/>`,
  comunicaciones: (b) =>
    `<path d="M${b.x} ${b.y}L${n(b.x + b.w * 0.56)} ${n(b.y + b.h * 0.62)}L${n(b.x + b.w * 0.5)} ${n(b.y + b.h * 0.38)}L${b.x + b.w} ${b.y + b.h}"/>`,
  inteligencia: label('IMI'),
  aviacion: (b, ink) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const dx = b.w * 0.3;
    const dy = b.h * 0.22;
    return `<path d="M${n(cx - dx)} ${n(cy - dy)}L${n(cx)} ${n(cy)}L${n(cx - dx)} ${n(cy + dy)}ZM${n(cx + dx)} ${n(cy - dy)}L${n(cx)} ${n(cy)}L${n(cx + dx)} ${n(cy + dy)}Z" fill="${ink}"/>`;
  },
  'aviacion-fija': (b, ink) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const rx = b.w * 0.15;
    const ry = b.h * 0.17;
    return `<g fill="${ink}"><ellipse cx="${n(cx - rx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"/><ellipse cx="${n(cx + rx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"/></g>`;
  },
  sanidad: (b) =>
    `<path d="M${n(b.x + b.w / 2)} ${b.y}V${b.y + b.h}M${b.x} ${n(b.y + b.h / 2)}H${b.x + b.w}"/>`,
  logistica: label('ASPC'),
  mantenimiento: (b) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const a = b.w * 0.3;
    const e = b.w * 0.07;
    const v = b.h * 0.16;
    return `<path d="M${n(cx - a)} ${n(cy)}H${n(cx + a)}M${n(cx - a - e)} ${n(cy - v)}H${n(cx - a)}V${n(cy + v)}H${n(cx - a - e)}M${n(cx + a + e)} ${n(cy - v)}H${n(cx + a)}V${n(cy + v)}H${n(cx + a + e)}"/>`;
  },
  transportes: (b) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const r = Math.min(b.w, b.h) * 0.3;
    const d = r * 0.707;
    return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/><path d="M${n(cx - r)} ${n(cy)}H${n(cx + r)}M${n(cx)} ${n(cy - r)}V${n(cy + r)}M${n(cx - d)} ${n(cy - d)}L${n(cx + d)} ${n(cy + d)}M${n(cx - d)} ${n(cy + d)}L${n(cx + d)} ${n(cy - d)}" stroke-width="1"/>`;
  },
  'policia-militar': label('PM'),
  vigilancia: (b, ink) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    return `<path d="M${n(cx)} ${n(cy - b.h * 0.2)}L${n(cx + b.w * 0.13)} ${n(cy + b.h * 0.2)}H${n(cx - b.w * 0.13)}Z" fill="${ink}"/>`;
  },
  pc: label('PC'),
  especiales: label('FF.EE'),
  'alta-montana': (b, ink, t) => {
    const cx = b.x + b.w / 2;
    return (
      infanteria(b, ink, t) +
      `<path d="M${n(cx)} ${n(b.y + b.h * 0.58)}L${n(cx + b.w * 0.09)} ${b.y + b.h}H${n(cx - b.w * 0.09)}Z" fill="${ink}"/>`
    );
  },
  gaula: label('GAULA'),
  'energetico-vial': label('EV'),
  narcotrafico: (b, ink) =>
    fitText({ x: b.x, y: b.y, w: b.w, h: b.h * 0.34 }, 'DRUG', ink, 0.8) + swordPair(b, ink, 0.38),
  mineria: (b, ink) => {
    const cx = b.x + b.w / 2;
    const y = b.y + b.h * 0.1;
    const p = b.h * 0.2;
    return (
      `<path d="M${n(cx - p * 0.7)} ${n(y)}L${n(cx + p * 0.7)} ${n(y + p)}M${n(cx + p * 0.7)} ${n(y)}L${n(cx - p * 0.7)} ${n(y + p)}M${n(cx - p)} ${n(y + p * 0.15)}Q${n(cx - p * 0.6)} ${n(y - p * 0.2)} ${n(cx - p * 0.3)} ${n(y + p * 0.1)}M${n(cx + p)} ${n(y + p * 0.15)}Q${n(cx + p * 0.6)} ${n(y - p * 0.2)} ${n(cx + p * 0.3)} ${n(y + p * 0.1)}" stroke-width="1.2"/>` +
      swordPair(b, ink, 0.4)
    );
  },
  desminado: (b, ink) => {
    const cx = b.x + b.w / 2;
    const y0 = b.y + b.h * 0.1;
    const yb = b.y + b.h * 0.42;
    const a = b.w * 0.16;
    return (
      `<path d="M${n(cx)} ${n(y0)}V${n(yb + b.h * 0.12)}M${n(cx - a)} ${n(yb)}H${n(cx + a)}M${n(cx - a)} ${n(yb)}V${n(yb + b.h * 0.14)}M${n(cx + a)} ${n(yb)}V${n(yb + b.h * 0.14)}"/>` +
      fitText({ x: b.x, y: b.y + b.h * 0.62, w: b.w, h: b.h * 0.36 }, 'DH', ink, 0.85)
    );
  },
  'accion-integral': label('AID'),
  nombre: (b, ink, t) => fitText(b, t || 'DIVFE', ink, 0.6),
  naval: (b, ink) => anchorIcon(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.42, ink),
  'infanteria-marina': (b, ink, t) =>
    infanteria(b, ink, t) +
    anchorIcon(b.x + b.w / 2, b.y + b.h * 0.24, Math.min(b.w, b.h) * 0.2, ink),
  policia: (b) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const w = Math.min(b.w * 0.2, b.h * 0.36);
    const h = b.h * 0.34;
    return `<path d="M${n(cx - w)} ${n(cy - h)}Q${n(cx - w / 2)} ${n(cy - h * 0.55)} ${n(cx)} ${n(cy - h)}Q${n(cx + w / 2)} ${n(cy - h * 0.55)} ${n(cx + w)} ${n(cy - h)}V${n(cy)}Q${n(cx + w)} ${n(cy + h * 0.85)} ${n(cx)} ${n(cy + h * 1.05)}Q${n(cx - w)} ${n(cy + h * 0.85)} ${n(cx - w)} ${n(cy)}Z" stroke-width="2"/>`;
  },
  'organizacion-gubernamental': label('GO'),
  gao: (b, ink, t) => fitText(b, t || 'R', ink, 0.8),
  persona: (b) => personIcon(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.95),
};

/** Modificadores del sector 2 (movilidad), en la parte baja del octágono. */
function mobilityGlyph(m: Mobility, b: Box, ink: string): string {
  const cx = b.x + b.w / 2;
  const yb = b.y + b.h - 2;
  const s = Math.min(b.w, b.h) * 0.18;
  switch (m) {
    case 'asalto-aereo':
      return `<path d="M${n(cx - s * 1.4)} ${n(yb - s)}L${n(cx)} ${n(yb)}L${n(cx + s * 1.4)} ${n(yb - s)}" stroke-width="1.8"/>`;
    case 'aerotransportada':
      return `<path d="M${n(cx - s * 1.6)} ${n(yb)}a${n(s * 0.8)} ${n(s * 0.8)} 0 0 1 ${n(s * 1.6)} 0a${n(s * 0.8)} ${n(s * 0.8)} 0 0 1 ${n(s * 1.6)} 0"/>`;
    case 'anfibia': {
      let d = `M${n(b.x + 2)} ${n(yb - s * 0.4)}`;
      const step = (b.w - 4) / 6;
      for (let i = 0; i < 6; i++) d += `q${n(step / 2)} ${n(i % 2 ? s : -s)} ${n(step)} 0`;
      return `<path d="${d}"/>`;
    }
    case 'fluvial':
      return `<path d="M${n(cx - s * 1.6)} ${n(yb - s * 0.7)}H${n(cx + s * 1.6)}Q${n(cx)} ${n(yb + s * 0.5)} ${n(cx - s * 1.6)} ${n(yb - s * 0.7)}Z"/>`;
    case 'montana':
      return `<path d="M${n(cx)} ${n(yb - s * 1.4)}L${n(cx + s * 0.8)} ${n(yb + 1)}H${n(cx - s * 0.8)}Z" fill="${ink}"/>`;
    case 'motorizado':
      return `<path d="M${n(cx)} ${b.y}V${b.y + b.h}"/>`;
    case 'ruedas':
      return [-1, 0, 1]
        .map(
          (k) => `<circle cx="${n(cx + k * s * 1.1)}" cy="${n(yb - s * 0.5)}" r="${n(s * 0.5)}"/>`,
        )
        .join('');
    case 'orugas':
      return `<rect x="${n(cx - s * 1.5)}" y="${n(yb - s)}" width="${n(s * 3)}" height="${n(s)}" rx="${n(s / 2)}"/>`;
    case 'animal':
      return `<path d="M${n(cx - s * 1.4)} ${n(yb)}L${n(cx - s * 0.7)} ${n(yb - s)}L${n(cx)} ${n(yb)}L${n(cx + s * 0.7)} ${n(yb - s)}L${n(cx + s * 1.4)} ${n(yb)}"/>`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------- amplificadores

/** Escalón gráfico (campo B): puntos, barras, aspas o cruces. */
export function echelonSVG(e: string, bottomY: number, cx: number = UNIT_CANVAS.cx): string {
  const halo = 'stroke="#fff" stroke-width="1.1" paint-order="stroke"';
  const row = (count: number, gap: number, draw: (x: number) => string) => {
    const x0 = cx - ((count - 1) * gap) / 2;
    return Array.from({ length: count }, (_, i) => draw(x0 + i * gap)).join('');
  };
  if (!e) return '';
  if (/^•+$/.test(e))
    return row(
      e.length,
      6,
      (x) => `<circle cx="${n(x)}" cy="${n(bottomY - 3)}" r="2.3" fill="#000" ${halo}/>`,
    );
  if (/^I+$/.test(e))
    return row(
      e.length,
      4.6,
      (x) =>
        `<rect x="${n(x - 1.2)}" y="${n(bottomY - 8)}" width="2.4" height="8" fill="#000" ${halo}/>`,
    );
  if (/^X+$/.test(e))
    return row(
      e.length,
      7.5,
      (x) =>
        `<path d="M${n(x - 2.8)} ${n(bottomY - 6.6)}l5.6 5.6m0-5.6l-5.6 5.6" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/><path d="M${n(x - 2.8)} ${n(bottomY - 6.6)}l5.6 5.6m0-5.6l-5.6 5.6" stroke="#000" stroke-width="2" stroke-linecap="round"/>`,
    );
  if (/^\++$/.test(e))
    return row(
      e.length,
      8,
      (x) =>
        `<path d="M${n(x)} ${n(bottomY - 7.4)}v6.8m-3.4-3.4h6.8" stroke="#fff" stroke-width="3.8"/><path d="M${n(x)} ${n(bottomY - 7.4)}v6.8m-3.4-3.4h6.8" stroke="#000" stroke-width="2"/>`,
    );
  return `<text x="${n(cx)}" y="${n(bottomY - 1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#000" stroke="#fff" stroke-width="2.4" paint-order="stroke" font-family="IBM Plex Sans,sans-serif">${esc(e)}</text>`;
}

export interface UnitSymbolSpec {
  type: UnitType;
  faction: FactionId;
  echelon?: string;
  force?: string;
  iconText?: string;
  mod1?: string;
  mobility?: Mobility;
  taskForce?: boolean;
  reinforced?: Reinforcement;
  effectiveness?: Effectiveness;
  status?: SymbolStatus;
}

/** Símbolo enmarcado de una unidad (MFRE 1-02, figura 3-1). */
export function unitSVG(
  spec: UnitSymbolSpec,
  size: [number, number] = [UNIT_CANVAS.w, UNIT_CANVAS.h],
): string {
  const shape = FACTIONS[spec.faction].shape;
  const f = FRAMES[shape];
  const { fill, ink } = symbolColors(spec.faction, spec.force);
  const frameSvg =
    spec.status === 'planeado' ? f.svg.replace('/>', ' stroke-dasharray="3.5 2.5"/>') : f.svg;
  const text = spec.iconText ?? UNITS[spec.type]?.iconText ?? '';
  const glyph = (UNIT_GLYPHS[spec.type] ?? UNIT_GLYPHS.infanteria)(f.box, ink, text);
  const b = f.box;
  const mod1 = spec.mod1
    ? fitText({ x: b.x, y: b.y + 0.5, w: b.w, h: b.h * 0.3 }, spec.mod1, ink, 0.85)
    : '';
  const mob = spec.mobility ? mobilityGlyph(spec.mobility, b, ink) : '';

  const parts: string[] = [];
  const echelonBottom = f.top - 1.5;
  if (spec.taskForce) {
    const tfTop = f.top - 12;
    parts.push(
      `<path d="M17 ${f.top}V${tfTop}H43V${f.top}" fill="none" stroke="#fff" stroke-width="3.4"/><path d="M17 ${f.top}V${tfTop}H43V${f.top}" fill="none" stroke="#000" stroke-width="1.6"/>`,
    );
  }
  parts.push(echelonSVG(spec.echelon ?? '', echelonBottom));
  if (spec.reinforced)
    parts.push(
      `<text x="55" y="${f.top + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#000" stroke="#fff" stroke-width="2.6" paint-order="stroke" font-family="IBM Plex Sans,sans-serif">${esc(spec.reinforced)}</text>`,
    );
  const eff = EFFECTIVENESS.find(([id]) => id === spec.effectiveness);
  if (eff && eff[2])
    parts.push(
      `<rect x="16" y="${f.bottom + 2.5}" width="28" height="4.5" fill="${eff[2]}" stroke="#000" stroke-width="0.8"/>`,
    );

  return (
    `<svg viewBox="0 0 ${UNIT_CANVAS.w} ${UNIT_CANVAS.h}" width="${size[0]}" height="${size[1]}">` +
    `<g fill="${fill}" stroke="#000" stroke-width="2">${frameSvg}</g>` +
    `<g fill="none" stroke="${ink}" stroke-width="1.6">${glyph}${mod1}${mob}</g>` +
    parts.join('') +
    '</svg>'
  );
}

// ---------------------------------------------------------------- puntos

export function starPts(cxv: number, cyv: number, R: number, r: number, points = 8): string {
  const a: string[] = [];
  const step = 180 / points;
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r : R;
    const t = ((i * step - 90) * Math.PI) / 180;
    a.push((cxv + rr * Math.cos(t)).toFixed(1) + ',' + (cyv + rr * Math.sin(t)).toFixed(1));
  }
  return a.join(' ');
}

const RED = '#E31E24';
const BLACK = '#111';
const svgOpen = (w: number, h: number) =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;
const txt = (x: number, y: number, size: number, fill: string, s: string, weight = 700) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="${FONT}">${esc(s)}</text>`;
const fitSize = (s: string, max: number, width: number) =>
  n(Math.min(max, width / (0.56 * Math.max(s.length, 1))));

const redDiamond = (inner: string) =>
  `${svgOpen(34, 34)}<polygon points="17,1 33,17 17,33 1,17" fill="${RED}" stroke="#000" stroke-width="1.2"/>${inner}</svg>`;

const pennant = (t: string) =>
  `${svgOpen(26, 34)}<path d="M2 2H24V20L13 32L2 20Z" fill="${BLACK}" stroke="#fff" stroke-width="1.5"/>${txt(13, 15.5, fitSize(t, 14, 20), '#fff', t)}</svg>`;

const ellipseZone = (t: string, fill: string) =>
  `${svgOpen(40, 24)}<ellipse cx="20" cy="12" rx="18.5" ry="10.5" fill="${fill}" stroke="${BLACK}" stroke-width="1.4"/>${txt(20, 15.5, fitSize(t, 11, 30), BLACK, t)}</svg>`;

const boxed = (t: string) =>
  `${svgOpen(28, 28)}<rect x="2" y="2" width="24" height="24" fill="#fff" stroke="${BLACK}" stroke-width="2.6"/>${txt(14, 19, fitSize(t, 15, 21), BLACK, t)}</svg>`;

const installation = (fill: string, inner = '') =>
  `${svgOpen(36, 30)}<rect x="14" y="2" width="8" height="8" fill="#000"/><rect x="4" y="10" width="28" height="18" fill="${fill}" stroke="#000" stroke-width="1.8"/>${inner}</svg>`;

export interface PointSymbolOpts {
  /** Color de la identidad (medidas de control). */
  color: string;
  /** Relleno del marco para instalaciones. */
  fill?: string;
  iconText?: string;
}

const POINT_SVG: Record<PointType, (o: PointSymbolOpts) => string> = {
  objetivo: ({ iconText }) => {
    const t = (iconText ?? '').trim();
    const inner = t
      ? txt(17, 13.5, 7.5, '#fff', 'OBJ') + txt(17, 26, fitSize(t, 13, 22), '#fff', t)
      : txt(17, 21, 11, '#fff', 'OBJ');
    return `${svgOpen(34, 34)}<circle cx="17" cy="17" r="15" fill="${RED}" stroke="#fff" stroke-width="1.6"/>${inner}</svg>`;
  },
  evento: () =>
    redDiamond(
      `<polygon points="${starPts(17, 17.5, 9, 3.8, 5)}" fill="none" stroke="#fff" stroke-width="1.6"/>`,
    ),
  campamento: () => redDiamond(txt(17, 21, 11, '#fff', 'GB')),
  ied: () => redDiamond(txt(17, 20.5, 9.5, '#fff', 'IED')),
  drug: () => redDiamond(txt(17, 20, 7.5, '#fff', 'DRUG')),
  captura: () =>
    `${svgOpen(34, 34)}<polygon points="17,1 33,17 17,33 1,17" fill="#fff" stroke="${RED}" stroke-width="2.2"/><g fill="none" stroke="${RED}">${personIcon(17, 17.5, 15)}</g></svg>`,
  control: ({ iconText }) => pennant(iconText || '1'),
  seguridad: ({ iconText }) => pennant(iconText || 'PS'),
  insercion: ({ iconText }) => pennant(iconText || 'PI'),
  disloque: ({ iconText }) => pennant(iconText || 'PT'),
  decision: ({ iconText }) =>
    `${svgOpen(34, 34)}<polygon points="${starPts(17, 18, 16, 7.5, 5)}" fill="#fff" stroke="${BLACK}" stroke-width="1.6"/>${txt(17, 22, fitSize(iconText || 'PD', 9, 14), BLACK, iconText || 'PD')}</svg>`,
  vigilancia: () =>
    `${svgOpen(34, 30)}<path d="M17 2L32 28H2Z" fill="#fff" stroke="${BLACK}" stroke-width="1.8"/><g stroke="${BLACK}" stroke-width="1.3" fill="none"><circle cx="17" cy="14" r="2" fill="${BLACK}"/><path d="M17 16L12 24M17 16L22 24M17 16V24"/></g></svg>`,
  'vigilancia-tiro': () =>
    `${svgOpen(34, 34)}<path d="M17 2L32 26H2Z" fill="#fff" stroke="${BLACK}" stroke-width="1.8"/><g stroke="${BLACK}" stroke-width="1.3" fill="none"><circle cx="17" cy="13" r="2" fill="${BLACK}"/><path d="M17 15L12 22M17 15L22 22M17 15V22"/></g><rect x="3" y="26" width="28" height="7" fill="${BLACK}"/>${txt(17, 32, 6.5, '#fff', 'FO')}</svg>`,
  pca: ({ iconText }) =>
    `${svgOpen(32, 32)}<circle cx="16" cy="16" r="14" fill="${BLACK}" stroke="#fff" stroke-width="1.6"/>${txt(16, 13, 7.5, '#fff', 'PCA')}${txt(16, 25.5, fitSize(iconText || '1', 11, 16), '#fff', iconText || '1')}</svg>`,
  zd: ({ iconText, color }) => ellipseZone(iconText || 'ZD', color),
  ze: ({ iconText }) => ellipseZone(iconText || 'ZE', '#FF9900'),
  rp: ({ iconText }) => boxed(iconText || 'RP'),
  ip: ({ iconText }) => boxed(iconText || 'IP'),
  coordinacion: ({ iconText }) =>
    `${svgOpen(30, 30)}<circle cx="15" cy="15" r="13" fill="#fff" stroke="${BLACK}" stroke-width="2"/><path d="M6 6L24 24M24 6L6 24" stroke="${BLACK}" stroke-width="2"/><circle cx="15" cy="6.5" r="4.6" fill="#fff" stroke="${BLACK}" stroke-width="1"/>${txt(15, 9.2, 7, BLACK, iconText || '1')}</svg>`,
  base: ({ fill }) => installation(fill ?? '#00AEEF'),
  'base-fac': ({ fill }) =>
    installation(
      fill ?? '#80DFFF',
      `<g fill="#000"><ellipse cx="14" cy="19" rx="4.5" ry="4"/><ellipse cx="22" cy="19" rx="4.5" ry="4"/></g>`,
    ),
  aeropuerto: () =>
    `${svgOpen(30, 30)}<path d="M15 2C16.2 2 16.6 4 16.6 6V11L28 17V20L16.6 16.5V23L20 25.5V28L15 26.6L10 28V25.5L13.4 23V16.5L2 20V17L13.4 11V6C13.4 4 13.8 2 15 2Z" fill="${BLACK}" stroke="#fff" stroke-width="1"/></svg>`,
  antena: () =>
    `${svgOpen(30, 30)}<g fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"><path d="M15 12V27M9 5Q5.5 10 9 15M21 5Q24.5 10 21 15M5.5 2.5Q0.5 10 5.5 17.5M24.5 2.5Q29.5 10 24.5 17.5M10.5 27H19.5"/></g><g fill="none" stroke="${BLACK}" stroke-width="1.7" stroke-linecap="round"><path d="M15 12V27M9 5Q5.5 10 9 15M21 5Q24.5 10 21 15M5.5 2.5Q0.5 10 5.5 17.5M24.5 2.5Q29.5 10 24.5 17.5M10.5 27H19.5"/></g><circle cx="15" cy="10" r="2.6" fill="${BLACK}" stroke="#fff" stroke-width="1"/></svg>`,
  lugar: () =>
    `${svgOpen(18, 18)}<circle cx="9" cy="9" r="7" fill="${BLACK}" stroke="#fff" stroke-width="1.6"/></svg>`,
  punto: ({ color }) =>
    `${svgOpen(18, 18)}<circle cx="9" cy="9" r="6" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`,
  texto: () => '',
};

export const pointSVG = (type: PointType, opts: PointSymbolOpts): string =>
  (POINT_SVG[type] ?? POINT_SVG.punto)(opts);

/** Vista previa de un rótulo de texto en la paleta. */
export const textPreviewSVG = (c: string): string =>
  `<svg width="44" height="34" viewBox="0 0 44 34"><text x="22" y="23" text-anchor="middle" font-size="17" font-weight="700" fill="${c}" font-family="Barlow Condensed,sans-serif">ABC</text></svg>`;

/** Vista previa de un trazo en la paleta. */
export function previewLine(type: LineType, c: string): string {
  if (isTaskType(type)) return previewTask(type, '#fff');
  const area = LINES[type]?.area;
  if (area)
    return `<svg width="44" height="34" viewBox="0 0 44 34"><polygon points="4,8 38,3 41,29 7,31" fill="none" stroke="${RED}" stroke-width="2"/>${areaBadgeSVG(area, 9, 10)}</svg>`;
  if (type === 'zona')
    return `<svg width="44" height="34" viewBox="0 0 44 34"><polygon points="6,8 38,4 40,28 8,30" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="2" stroke-dasharray="5 3"/></svg>`;
  const st = {
    frente: `stroke="${c}" stroke-width="4"`,
    eje: `stroke="${c}" stroke-width="6"`,
    ruta: `stroke="${c}" stroke-width="3" stroke-dasharray="6 4"`,
  }[type as 'frente' | 'eje' | 'ruta'];
  const head = type === 'eje' ? `<polygon points="30,8 42,14 33,22" fill="${c}"/>` : '';
  return `<svg width="44" height="34" viewBox="0 0 44 34"><path d="M3 28Q14 10 34 15" fill="none" ${st}/>${head}</svg>`;
}

/** Insignia DIVFE de un área (AO, ANI, ABI): pentágono redondeado con borde rojo. */
export function areaBadgeSVG(text: string, x = 0, y = 0): string {
  const w = 10 + text.length * 7;
  return `<g transform="translate(${x},${y})"><path d="M2 0H${w - 6}L${w} 7L${w - 6} 14H2Q0 14 0 12V2Q0 0 2 0Z" fill="#fff" stroke="${RED}" stroke-width="1.6"/><text x="${(w - 3) / 2}" y="11" text-anchor="middle" font-size="11" font-weight="700" fill="${RED}" font-family="${FONT}">${esc(text)}</text></g>`;
}

/** Descripción de un `L.divIcon` sin depender de Leaflet. */
export interface IconSpec {
  className: string;
  html: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
}

/** Opciones de dibujo de un punto a partir del objeto. */
export function pointOpts(o: {
  type: PointType;
  faction: FactionId;
  force?: string;
  iconText?: string;
}): PointSymbolOpts {
  return {
    color: FACTIONS[o.faction].vivid,
    fill:
      o.type === 'base-fac' && !o.force
        ? '#80DFFF'
        : o.type === 'base' && !o.force && o.faction === 'azul'
          ? '#00AEEF'
          : symbolColors(o.faction, o.force).fill,
    iconText: o.iconText ?? POINTS[o.type]?.iconText,
  };
}

/** Icono de un objeto con posición (unidad o punto). */
export function iconSpecFor(
  o: Extract<MapObject, { kind: 'unit' | 'point' }>,
  selected: boolean,
): IconSpec {
  const s = selected ? ' sel' : '';
  if (o.kind === 'unit') {
    const { w, h, cx, cy } = UNIT_CANVAS;
    return {
      className: 'symwrap',
      iconSize: [w, h],
      iconAnchor: [cx, cy],
      html: `<div class="sym${s}" style="width:${w}px;height:${h}px">${unitSVG(o)}${o.label ? `<span class="lbl" style="left:${cx}px;top:${h - 4}px">${esc(o.label)}</span>` : ''}</div>`,
    };
  }
  const c = FACTIONS[o.faction].vivid;
  if (o.type === 'texto') {
    return {
      className: 'symwrap',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      html: `<div class="txt${s}" style="color:${c}">${esc(o.label || 'Rótulo')}</div>`,
    };
  }
  const P = POINTS[o.type] ?? POINTS.punto;
  return {
    className: 'symwrap',
    iconSize: P.size,
    iconAnchor: P.anchor,
    html: `<div class="sym${s}" style="width:${P.size[0]}px;height:${P.size[1]}px">${pointSVG(o.type, pointOpts(o))}${o.label ? `<span class="lbl" style="left:${P.size[0] / 2}px;top:${P.size[1] + 1}px">${esc(o.label)}</span>` : ''}</div>`,
  };
}

/** Punta de flecha del eje de avance; se rota con CSS. */
export const HEAD_ICON: IconSpec = {
  className: 'symwrap',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: `<div class="ahead"><svg viewBox="0 0 26 26" width="26" height="26"><polygon points="1,1 25,13 1,25" fill="currentColor" stroke="rgba(0,0,0,.45)"/></svg></div>`,
};

/** Marcador pulsante de "Ir a coordenadas". */
export const PULSE_ICON: IconSpec = {
  className: 'symwrap',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<div class="pulse"></div>',
};

/** Estilo de un trazo, compatible con `L.PathOptions`. */
export interface LineStyle {
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  lineCap?: 'butt' | 'round';
  lineJoin?: 'round';
  fillColor?: string;
  fillOpacity?: number;
}

export function lineStyle(
  o: Extract<MapObject, { kind: 'line' }>,
  op: number,
  selected: boolean,
): LineStyle {
  const c = FACTIONS[o.faction].vivid;
  const s = selected;
  if (LINES[o.type]?.area)
    return {
      color: RED,
      weight: s ? 4.5 : 2.6,
      opacity: op,
      lineJoin: 'round',
      fillColor: RED,
      fillOpacity: 0.06 * op,
    };
  switch (o.type) {
    case 'eje':
      return {
        color: c,
        weight: s ? 10 : 7,
        opacity: 0.85 * op,
        dashArray: undefined,
        lineCap: 'butt',
        lineJoin: 'round',
      };
    case 'ruta':
      return { color: c, weight: s ? 5 : 3, opacity: op, dashArray: '9 7', lineCap: 'round' };
    case 'zona':
      return {
        color: c,
        weight: s ? 4 : 2,
        opacity: op,
        dashArray: '7 5',
        fillColor: c,
        fillOpacity: 0.17 * op,
      };
    default:
      return {
        color: c,
        weight: s ? 6 : 4,
        opacity: op,
        dashArray: undefined,
        lineCap: 'round',
        lineJoin: 'round',
      };
  }
}

/** Ángulo (grados) de la punta de flecha a partir de dos puntos proyectados en píxeles. */
export const headAngle = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
