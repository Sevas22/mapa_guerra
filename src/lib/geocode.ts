import { z } from 'zod';

export interface GeocodeResult {
  /** Primer componente del nombre (p. ej. "Villavicencio"). */
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

const NominatimSchema = z.array(
  z.object({
    display_name: z.string(),
    lat: z.coerce.number(),
    lon: z.coerce.number(),
  }),
);

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export function geocodeUrl(q: string): string {
  const p = new URLSearchParams({
    format: 'json',
    limit: '6',
    countrycodes: 'co',
    'accept-language': 'es',
    q,
  });
  return `${NOMINATIM_URL}?${p.toString()}`;
}

/** Busca lugares en Colombia con Nominatim (OpenStreetMap). Lanza si no hay conexión. */
export async function geocode(q: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const r = await fetch(geocodeUrl(q), { signal, headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Nominatim respondió ${r.status}`);
  const data = NominatimSchema.parse(await r.json());
  return data.map((x) => ({
    name: x.display_name.split(',')[0]?.trim() ?? x.display_name,
    displayName: x.display_name,
    lat: x.lat,
    lng: x.lon,
  }));
}
