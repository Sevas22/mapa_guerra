/**
 * Generación de SVG/HTML de los símbolos, portada tal cual del prototipo.
 * Devuelve cadenas para poder usarlas en `L.divIcon` y en la paleta.
 */
import { FACTIONS, POINTS } from './catalog';
import type { FactionId, LineType, MapObject, PointType, UnitType } from './types';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;
const txt = (b: Box, s: string) =>
  `<text x="${cx(b)}" y="${cy(b) + (b.w < 20 ? 2.6 : 3.4)}" text-anchor="middle" font-size="${b.w < 20 ? 6.6 : 9}" font-weight="700" fill="#111" stroke="none" font-family="IBM Plex Sans,sans-serif">${s}</text>`;

const infanteria = (b: Box) =>
  `<path d="M${b.x} ${b.y}L${b.x + b.w} ${b.y + b.h}M${b.x} ${b.y + b.h}L${b.x + b.w} ${b.y}"/>`;
const blindados = (b: Box) =>
  `<ellipse cx="${cx(b)}" cy="${cy(b)}" rx="${b.w * 0.34}" ry="${b.h * 0.27}"/>`;

const UNIT_GLYPHS: Record<UnitType, (b: Box) => string> = {
  infanteria,
  mecanizada: (b) => infanteria(b) + blindados(b),
  blindados,
  reconocimiento: (b) => `<path d="M${b.x} ${b.y + b.h}L${b.x + b.w} ${b.y}"/>`,
  artilleria: (b) => `<circle cx="${cx(b)}" cy="${cy(b)}" r="3.6" fill="#111"/>`,
  antiaerea: (b) =>
    `<path d="M${b.x + b.w * 0.18} ${b.y + b.h}Q${cx(b)} ${b.y + b.h * 0.05} ${b.x + b.w * 0.82} ${b.y + b.h}"/>`,
  aviacion: (b) =>
    `<path d="M${b.x + b.w * 0.2} ${b.y + b.h * 0.25}L${b.x + b.w * 0.8} ${b.y + b.h * 0.75}L${b.x + b.w * 0.8} ${b.y + b.h * 0.25}L${b.x + b.w * 0.2} ${b.y + b.h * 0.75}Z" fill="#111"/>`,
  naval: (b) =>
    `<path d="M${cx(b)} ${b.y + b.h * 0.18}V${b.y + b.h * 0.8}M${b.x + b.w * 0.3} ${b.y + b.h * 0.55}Q${cx(b)} ${b.y + b.h * 1.02} ${b.x + b.w * 0.7} ${b.y + b.h * 0.55}M${b.x + b.w * 0.4} ${b.y + b.h * 0.32}H${b.x + b.w * 0.6}"/>`,
  ingenieros: (b) =>
    `<path d="M${b.x + b.w * 0.25} ${b.y + b.h * 0.68}V${b.y + b.h * 0.32}H${b.x + b.w * 0.75}V${b.y + b.h * 0.68}M${cx(b)} ${b.y + b.h * 0.32}V${b.y + b.h * 0.6}"/>`,
  comunicaciones: (b) =>
    `<path d="M${b.x + b.w * 0.15} ${b.y + b.h * 0.3}L${b.x + b.w * 0.47} ${b.y + b.h * 0.64}L${b.x + b.w * 0.53} ${b.y + b.h * 0.36}L${b.x + b.w * 0.85} ${b.y + b.h * 0.7}"/>`,
  sanidad: (b) =>
    `<path d="M${cx(b)} ${b.y + b.h * 0.2}V${b.y + b.h * 0.8}M${b.x + b.w * 0.32} ${cy(b)}H${b.x + b.w * 0.68}" stroke-width="2.6"/>`,
  logistica: (b) => txt(b, 'LOG'),
  especiales: (b) => txt(b, 'FE'),
  policia: (b) => txt(b, 'POL'),
  pc: (b) => txt(b, 'PC'),
};

export function starPts(cxv: number, cyv: number, R: number, r: number): string {
  const a: string[] = [];
  for (let i = 0; i < 16; i++) {
    const rr = i % 2 ? r : R;
    const t = ((i * 22.5 - 90) * Math.PI) / 180;
    a.push((cxv + rr * Math.cos(t)).toFixed(1) + ',' + (cyv + rr * Math.sin(t)).toFixed(1));
  }
  return a.join(' ');
}

/** Símbolo de unidad estilo OTAN (56×46). `size` permite reducirlo para la paleta. */
export function unitSVG(
  type: UnitType,
  faction: FactionId,
  echelon: string,
  size: [number, number] = [56, 46],
): string {
  const f = FACTIONS[faction];
  let frame: string;
  let b: Box;
  switch (f.shape) {
    case 'rect':
      frame = `<rect x="8" y="14" width="40" height="26"/>`;
      b = { x: 8, y: 14, w: 40, h: 26 };
      break;
    case 'diamond':
      frame = `<polygon points="28,11 44,27 28,43 12,27"/>`;
      b = { x: 20, y: 20, w: 16, h: 14 };
      break;
    case 'square':
      frame = `<rect x="15" y="14" width="26" height="26"/>`;
      b = { x: 15, y: 14, w: 26, h: 26 };
      break;
    default:
      frame = `<circle cx="28" cy="27" r="14"/>`;
      b = { x: 18.5, y: 20, w: 19, h: 14 };
  }
  const inner = (UNIT_GLYPHS[type] ?? UNIT_GLYPHS.infanteria)(b);
  const ech = echelon
    ? `<text x="28" y="9" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" stroke="#000" stroke-width="2.6" paint-order="stroke" font-family="IBM Plex Sans,sans-serif">${esc(echelon)}</text>`
    : '';
  return `<svg viewBox="0 0 56 46" width="${size[0]}" height="${size[1]}">${ech}<g fill="${f.fill}" stroke="#111" stroke-width="1.6">${frame}</g><g fill="none" stroke="#111" stroke-width="1.5">${inner}</g></svg>`;
}

const POINT_SVG: Record<PointType, (c: string) => string> = {
  objetivo: (c) =>
    `<svg viewBox="0 0 34 34" width="34" height="34"><circle cx="17" cy="17" r="11" fill="rgba(8,12,18,.45)" stroke="${c}" stroke-width="2.6"/><path d="M17 2V10M17 24V32M2 17H10M24 17H32" stroke="${c}" stroke-width="2.2"/><circle cx="17" cy="17" r="2.4" fill="${c}"/></svg>`,
  base: (c) =>
    `<svg viewBox="0 0 30 32" width="30" height="32"><path d="M7 31V3" stroke="#0b0f15" stroke-width="4"/><path d="M7 31V3" stroke="#fff" stroke-width="2"/><path d="M8 4L27 10L8 16Z" fill="${c}" stroke="#0b0f15" stroke-width="1.4"/></svg>`,
  evento: (c) =>
    `<svg viewBox="0 0 34 34" width="34" height="34"><polygon points="${starPts(17, 17, 16, 7)}" fill="${c}" stroke="#0b0f15" stroke-width="1.4"/></svg>`,
  control: (c) =>
    `<svg viewBox="0 0 28 26" width="28" height="26"><polygon points="14,2 26,24 2,24" fill="rgba(8,12,18,.45)" stroke="${c}" stroke-width="2.6"/></svg>`,
  punto: (c) =>
    `<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="6" fill="${c}" stroke="#fff" stroke-width="2"/></svg>`,
  texto: () => '',
};

export const pointSVG = (type: PointType, color: string): string =>
  (POINT_SVG[type] ?? POINT_SVG.punto)(color);

/** Vista previa de un rótulo de texto en la paleta. */
export const textPreviewSVG = (c: string): string =>
  `<svg width="44" height="34" viewBox="0 0 44 34"><text x="22" y="23" text-anchor="middle" font-size="17" font-weight="700" fill="${c}" font-family="Barlow Condensed,sans-serif">ABC</text></svg>`;

/** Vista previa de un trazo en la paleta. */
export function previewLine(type: LineType, c: string): string {
  if (type === 'zona')
    return `<svg width="44" height="34" viewBox="0 0 44 34"><polygon points="6,8 38,4 40,28 8,30" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="2" stroke-dasharray="5 3"/></svg>`;
  const st = {
    frente: `stroke="${c}" stroke-width="4"`,
    eje: `stroke="${c}" stroke-width="6"`,
    ruta: `stroke="${c}" stroke-width="3" stroke-dasharray="6 4"`,
  }[type];
  const head = type === 'eje' ? `<polygon points="30,8 42,14 33,22" fill="${c}"/>` : '';
  return `<svg width="44" height="34" viewBox="0 0 44 34"><path d="M3 28Q14 10 34 15" fill="none" ${st}/>${head}</svg>`;
}

/** Descripción de un `L.divIcon` sin depender de Leaflet. */
export interface IconSpec {
  className: string;
  html: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
}

/** Icono de un objeto con posición (unidad o punto). */
export function iconSpecFor(
  o: Extract<MapObject, { kind: 'unit' | 'point' }>,
  selected: boolean,
): IconSpec {
  const s = selected ? ' sel' : '';
  if (o.kind === 'unit') {
    return {
      className: 'symwrap',
      iconSize: [56, 46],
      iconAnchor: [28, 27],
      html: `<div class="sym${s}" style="width:56px;height:46px">${unitSVG(o.type, o.faction, o.echelon)}${o.label ? `<span class="lbl" style="left:28px;top:44px">${esc(o.label)}</span>` : ''}</div>`,
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
    html: `<div class="sym${s}" style="width:${P.size[0]}px;height:${P.size[1]}px">${pointSVG(o.type, c)}${o.label ? `<span class="lbl" style="left:${P.anchor[0]}px;top:${P.size[1] + 1}px">${esc(o.label)}</span>` : ''}</div>`,
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
