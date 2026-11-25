/**
 * Medidas de áreas demarcadas en el mapa (zona, AO, ANI, ABI): área, perímetro, longitud de
 * cada lado y extensión norte-sur y este-oeste. Cálculo sobre la esfera terrestre. Lógica pura.
 */
import { LINES } from './catalog';
import { haversineKm, pathKm } from './travel';
import type { LatLngTuple, LineType } from './types';

const R_KM = 6371.0088;
const RAD = Math.PI / 180;

/** El trazo es un área cerrada (zona o área nombrada). */
export const isAreaType = (type: LineType): boolean => type === 'zona' || !!LINES[type]?.area;

/** Área de un polígono sobre la esfera, en km² (fórmula del exceso esférico por trapecios). */
export function polygonAreaKm2(pts: readonly LatLngTuple[]): number {
  if (pts.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    total += (b[1] - a[1]) * RAD * (2 + Math.sin(a[0] * RAD) + Math.sin(b[0] * RAD));
  }
  return Math.abs((total * R_KM * R_KM) / 2);
}

/** Perímetro del polígono cerrado, en km. */
export const perimeterKm = (pts: readonly LatLngTuple[]): number =>
  pts.length < 2
    ? 0
    : pathKm(pts) + (pts.length > 2 ? haversineKm(pts[pts.length - 1]!, pts[0]!) : 0);

export interface Side {
  /** Número del lado (1 = del primer al segundo vértice). */
  n: number;
  km: number;
  /** Punto medio, para rotularlo. */
  mid: LatLngTuple;
  /** Rumbo del lado en grados (0 = norte, sentido horario). */
  bearing: number;
}

function bearingDeg(a: LatLngTuple, b: LatLngTuple): number {
  const y = Math.sin((b[1] - a[1]) * RAD) * Math.cos(b[0] * RAD);
  const x =
    Math.cos(a[0] * RAD) * Math.sin(b[0] * RAD) -
    Math.sin(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.cos((b[1] - a[1]) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** Lados del polígono cerrado, con su longitud y punto medio. */
export function polygonSides(pts: readonly LatLngTuple[]): Side[] {
  if (pts.length < 2) return [];
  const n = pts.length > 2 ? pts.length : 1;
  return Array.from({ length: n }, (_, i) => {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    return {
      n: i + 1,
      km: haversineKm(a, b),
      mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as LatLngTuple,
      bearing: bearingDeg(a, b),
    };
  });
}

/** Extensión máxima norte-sur y este-oeste (caja que contiene el área), en km. */
export function extentKm(pts: readonly LatLngTuple[]): { ns: number; ew: number } {
  if (!pts.length) return { ns: 0, ew: 0 };
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const lat0 = Math.min(...lats);
  const lat1 = Math.max(...lats);
  const midLat = (lat0 + lat1) / 2;
  const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  return {
    ns: haversineKm([lat0, midLng], [lat1, midLng]),
    ew: haversineKm([midLat, Math.min(...lngs)], [midLat, Math.max(...lngs)]),
  };
}

const fmt = (v: number, d: number) =>
  v.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });

/** "850 m²", "35,2 ha", "12,4 km² (1.240 ha)". */
export function formatArea(km2: number): string {
  const ha = km2 * 100;
  if (ha < 1) return `${fmt(km2 * 1e6, 0)} m²`;
  if (km2 < 1) return `${fmt(ha, ha < 10 ? 2 : 1)} ha`;
  return `${fmt(km2, km2 < 100 ? 2 : 0)} km² (${fmt(ha, 0)} ha)`;
}

/** Longitud de un lado con más precisión que `formatKm`: "1,24 km", "380 m". */
export function formatSide(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${fmt(km, km < 10 ? 2 : 1)} km`;
}

/** Resumen para la etiqueta del área: "Área 12,4 km² (1.240 ha) · Perímetro 14 km". */
export function areaSummary(pts: readonly LatLngTuple[]): string {
  if (pts.length < 3) return '';
  return `Área ${formatArea(polygonAreaKm2(pts))} · Perímetro ${formatSide(perimeterKm(pts))}`;
}

/**
 * Medidas en vivo mientras se dibuja: el tramo hasta el cursor y el total; en las áreas,
 * además el perímetro y el área cerrando el polígono en el cursor.
 */
export function draftMeasure(draft: readonly LatLngTuple[], cursor: LatLngTuple, area: boolean) {
  const last = draft[draft.length - 1];
  if (!last) return '';
  const pts = [...draft, cursor];
  const rows = [`Tramo ${formatSide(haversineKm(last, cursor))}`];
  if (area && pts.length >= 3)
    rows.push(
      `Perímetro ${formatSide(perimeterKm(pts))}`,
      `Área ${formatArea(polygonAreaKm2(pts))}`,
    );
  else if (draft.length > 1) rows.push(`Total ${formatSide(pathKm(pts))}`);
  return rows.join('<br>');
}
