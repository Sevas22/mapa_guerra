/** Distancias, tiempos de desplazamiento y resumen de fuerzas. Lógica pura. */
import { frameAt, visibleAt } from './timeline';
import type { FactionId, LatLngTuple, LineType, Scenario, Travel, TravelMode } from './types';

/** Solo las rutas y los ejes de avance tienen medio de desplazamiento, distancia y tiempo. */
export const hasTravel = (type: LineType): boolean => type === 'ruta' || type === 'eje';

export const TRAVEL_DEFS: Record<TravelMode, { name: string; speed: number }> = {
  pie: { name: 'A pie', speed: 2.5 },
  'motorizado-pavimentado': { name: 'Motorizado · pavimentado', speed: 45 },
  'motorizado-destapado': { name: 'Motorizado · destapado', speed: 20 },
  fluvial: { name: 'Fluvial', speed: 25 },
  aereo: { name: 'Aéreo (ala rotatoria)', speed: 220 },
};

const R_KM = 6371.0088;
export const KM_PER_NM = 1.852;

/** Distancia ortodrómica entre dos puntos [lat, lng], en km. */
export function haversineKm(a: LatLngTuple, b: LatLngTuple): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Longitud de una polilínea en km. */
export function pathKm(pts: readonly LatLngTuple[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversineKm(pts[i - 1]!, pts[i]!);
  return d;
}

export const travelSpeed = (t: Travel): number => t.speed ?? TRAVEL_DEFS[t.mode].speed;

/** Tiempo estimado en minutos. */
export const travelMinutes = (km: number, t: Travel): number => (km / travelSpeed(t)) * 60;

/** "3 h 05 min", "42 min". */
export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/** "134 km", "8,4 km", "850 m". */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`;
}

/** Resumen de un trazo: "134 km · 72 MN · 3 h 00 min". */
export function travelSummary(pts: readonly LatLngTuple[], t?: Travel): string {
  const km = pathKm(pts);
  const parts = [formatKm(km)];
  if (t?.mode === 'aereo') parts.push(`${Math.round(km / KM_PER_NM)} MN`);
  if (t) parts.push(formatMinutes(travelMinutes(km, t)));
  return parts.join(' · ');
}

export interface ForceSummary {
  faction: FactionId;
  units: number;
  pax: number;
}

/** Unidades y efectivos (PAX) visibles en la fase `p`, por identidad. */
export function forceSummary(s: Scenario, p: number): ForceSummary[] {
  const acc = new Map<FactionId, ForceSummary>();
  for (const o of s.objects) {
    if (o.kind !== 'unit' || !visibleAt(o, p)) continue;
    const e = acc.get(o.faction) ?? { faction: o.faction, units: 0, pax: 0 };
    e.units += 1;
    e.pax += o.card?.pax ?? 0;
    acc.set(o.faction, e);
  }
  return [...acc.values()];
}

/** Posición actual de una unidad o punto en la fase `p` (para fichas y listados). */
export const positionAt = (o: Scenario['objects'][number], p: number): LatLngTuple | null => {
  if (o.kind === 'line') return null;
  const f = frameAt(o, p);
  return [f.lat, f.lng];
};
