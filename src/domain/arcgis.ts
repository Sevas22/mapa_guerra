/**
 * Servicios dinámicos de ArcGIS Server (MapServer `export`), como los del IGAC y
 * el DANE. No tienen teselas cacheadas: se pide una imagen del tamaño de la vista
 * y el servidor dibuja vías, ríos y nombres. Funciones puras, sin Leaflet.
 */

export interface ArcGISExportSpec {
  kind: 'arcgis';
  /** URL del MapServer, sin `/export` (p. ej. `https://…/MapServer`). */
  url: string;
  attribution: string;
  /** Capas a mostrar en formato ArcGIS (`show:1,305`). Vacío = las del servicio. */
  layers?: string;
  format?: 'png32' | 'jpg';
  /** Por debajo de este zoom no se pide imagen (el servicio sería ilegible o muy lento). */
  minZoom?: number;
  opacity?: number;
  /** Clase CSS de la imagen (p. ej. realzar contraste). */
  className?: string;
}

/** [xmin, ymin, xmax, ymax] en metros Web Mercator (EPSG:3857). */
export type BBox3857 = [number, number, number, number];

export const EARTH_RADIUS = 6378137;
const ORIGIN = Math.PI * EARTH_RADIUS;

/** Proyecta lng/lat a Web Mercator. */
export function lngLatTo3857(lng: number, lat: number): [number, number] {
  const clamped = Math.max(-85.0511287798, Math.min(85.0511287798, lat));
  const x = (lng * Math.PI * EARTH_RADIUS) / 180;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
  return [x, y];
}

/** Caja de una tesela XYZ en Web Mercator. */
export function tileBBox3857(z: number, x: number, y: number): BBox3857 {
  const size = (2 * ORIGIN) / 2 ** z;
  const xmin = -ORIGIN + x * size;
  const ymax = ORIGIN - y * size;
  return [xmin, ymax - size, xmin + size, ymax];
}

/** URL de `export` para una caja y un tamaño de imagen en píxeles. */
export function exportUrl(
  spec: ArcGISExportSpec,
  bbox: BBox3857,
  size: [number, number],
  dpi = 96,
): string {
  const format = spec.format ?? 'png32';
  const p = new URLSearchParams({
    bbox: bbox.map((v) => v.toFixed(2)).join(','),
    bboxSR: '3857',
    imageSR: '3857',
    size: `${Math.round(size[0])},${Math.round(size[1])}`,
    dpi: String(dpi),
    format,
    transparent: String(format !== 'jpg'),
    f: 'image',
  });
  if (spec.layers) p.set('layers', spec.layers);
  return `${spec.url.replace(/\/+$/, '')}/export?${p.toString()}`;
}

/** ArcGIS limita el tamaño de imagen (normalmente 4096 px por lado). */
export const MAX_EXPORT_SIZE = 4096;

/** Ajusta el tamaño pedido al máximo del servidor conservando la proporción. */
export function clampExportSize(w: number, h: number, max = MAX_EXPORT_SIZE): [number, number] {
  const k = Math.min(1, max / Math.max(w, h));
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}
