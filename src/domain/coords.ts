import type { Frame, LatLngTuple, Scenario } from './types';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Interpreta coordenadas en decimal ("4.7110, -74.0721") o en grados-minutos-segundos
 * ("4°42′40″N 74°04′20″O", "4 42 40 N 74 4 20 W"). Acepta O (oeste) además de W.
 * Devuelve `null` si el texto no parece una coordenada (p. ej. el nombre de un lugar).
 */
export function parseCoords(input: string): LatLng | null {
  const s = input.trim().replace(/\s+/g, ' ');
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  const re =
    /(\d+(?:\.\d+)?)\s*[°º ]\s*(?:(\d+(?:\.\d+)?)\s*['′ ]\s*)?(?:(\d+(?:\.\d+)?)\s*["″]?\s*)?([NSEWOnsewo])/g;
  const parts = [...s.matchAll(re)];
  if (parts.length !== 2) return null;
  const value = (p: RegExpMatchArray): number => {
    const d = Number(p[1]) + (Number(p[2]) || 0) / 60 + (Number(p[3]) || 0) / 3600;
    return /[SWOswo]/.test(p[4] ?? '') ? -d : d;
  };
  const [a, b] = parts as [RegExpMatchArray, RegExpMatchArray];
  const aIsLat = /[NSns]/.test(a[4] ?? '');
  return aIsLat ? { lat: value(a), lng: value(b) } : { lat: value(b), lng: value(a) };
}

/** Latitud en [-90, 90] y longitud en [-180, 180]. */
export const isValidLatLng = ({ lat, lng }: LatLng): boolean =>
  Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Caja aproximada de Colombia usada por el prototipo. */
export const COLOMBIA_BOUNDS = { south: -4.4, north: 13.6, west: -82, east: -66.7 } as const;

export const isInColombia = ({ lat, lng }: LatLng): boolean =>
  lat > COLOMBIA_BOUNDS.south &&
  lat < COLOMBIA_BOUNDS.north &&
  lng > COLOMBIA_BOUNDS.west &&
  lng < COLOMBIA_BOUNDS.east;

/** Formatea un valor en grados-minutos-segundos: 4°42′40″N. */
export function formatDMS(v: number, pos: string, neg: string): string {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = Math.round(((a - d) * 60 - m) * 60);
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″${v >= 0 ? pos : neg}`;
}

/** Lectura del cursor: "4°42′40″N 74°04′20″O · 4.71110, -74.07222 · z12". */
export const formatCursor = (lat: number, lng: number, zoom: number): string =>
  `${formatDMS(lat, 'N', 'S')} ${formatDMS(lng, 'E', 'O')} · ${lat.toFixed(5)}, ${lng.toFixed(5)} · z${zoom}`;

/** Redondea a 6 decimales, como hace el prototipo al guardar posiciones. */
export const round6 = (v: number): number => +v.toFixed(6);

/** Caja que contiene todos los frames de todos los objetos, o `null` si no hay. */
export function scenarioBounds(s: Scenario): [LatLngTuple, LatLngTuple] | null {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  const add = (lat: number, lng: number) => {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  };
  for (const o of s.objects) {
    for (const f of Object.values(o.frames as Record<number, Frame>)) {
      if ('pts' in f) f.pts.forEach(([la, ln]) => add(la, ln));
      else add(f.lat, f.lng);
    }
  }
  if (!Number.isFinite(south)) return null;
  return [
    [south, west],
    [north, east],
  ];
}
