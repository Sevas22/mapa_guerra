/**
 * Escena de la vista 3D (MapLibre con relieve). Lógica pura: convierte el escenario en un
 * instante de la línea de tiempo en GeoJSON, posiciones de símbolos y rótulos, sin depender
 * de MapLibre ni del DOM.
 */
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';
import { isArcGIS, type LayerSource, type TileSpec } from './basemaps';
import { FACTIONS, LINES } from './catalog';
import { esc, lineStyle } from './symbols';
import { isTaskType, taskGeometry } from './tasks';
import { objectStateAt } from './timeline';
import { areaSummary, formatSide, isAreaType, polygonSides } from './measure';
import { hasTravel, pathKm, travelSummary } from './travel';
import type { LatLngTuple, LineObject, MapObject } from './types';

/**
 * Leaflet usa mosaicos de 256 px y MapLibre de 512 px: el mismo encuadre tiene en MapLibre
 * un nivel de zoom menos.
 */
export const toGlZoom = (leafletZoom: number): number => leafletZoom - 1;
export const toLeafletZoom = (glZoom: number): number => glZoom + 1;

/** Modelo digital de elevación abierto (Terrain Tiles de AWS, codificación Terrarium). */
export const DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const DEM_MAX_ZOOM = 15;
export const DEM_ATTRIBUTION = 'Relieve: Terrain Tiles (AWS, Mapzen)';

/** Exageraciones del relieve que ofrece el panel 3D. */
export const EXAGGERATIONS = [1, 1.5, 2, 3] as const;
export const DEFAULT_EXAGGERATION = 1.5;
/** Inclinación de la cámara al entrar en 3D, en grados. */
export const DEFAULT_PITCH = 60;

/** URLs de mosaicos para MapLibre: expande `{s}` en cada subdominio y quita `{r}`. */
export function glTileUrls(t: TileSpec): string[] {
  const url = t.url.replace('{r}', '');
  if (!url.includes('{s}')) return [url];
  return [...(t.subdomains ?? 'abc')].map((s) => url.replace('{s}', s));
}

/**
 * Capas del selector de estilo que se ven en 3D. Los servicios dinámicos del IGAC y el DANE
 * se omiten: el 3D pediría decenas de imágenes a la vez a servidores muy lentos. Si el mapa
 * base es uno de ellos, se usa el satélite.
 */
export function glLayers(
  base: { id: string; source: LayerSource },
  overlays: readonly { id: string; source: LayerSource }[],
  fallback: { id: string; source: LayerSource },
): { layers: { id: string; source: TileSpec }[]; skipped: number } {
  const all = [isArcGIS(base.source) ? fallback : base, ...overlays];
  const layers = all.filter((l): l is { id: string; source: TileSpec } => !isArcGIS(l.source));
  return {
    layers,
    skipped: overlays.filter((o) => isArcGIS(o.source)).length + (isArcGIS(base.source) ? 1 : 0),
  };
}

/** Fuente raster de MapLibre equivalente a una capa de mosaicos del selector de estilo. */
export function glRasterSource(src: TileSpec): {
  tiles: string[];
  tileSize: number;
  attribution: string;
  maxzoom?: number;
} {
  return {
    tiles: glTileUrls(src),
    tileSize: 256,
    attribution: src.attribution,
    ...(src.maxNativeZoom != null ? { maxzoom: src.maxNativeZoom } : {}),
  };
}

/** Propiedades de cada elemento GeoJSON de la escena (leídas por las capas de MapLibre). */
export interface SceneProps {
  id: string;
  /** `fill` se pinta como relleno; `line`, como línea continua o discontinua. */
  kind: 'fill' | 'line';
  color: string;
  width: number;
  opacity: number;
  dashed: boolean;
}

/** Símbolo de unidad o punto en el instante actual. */
export interface ScenePoint {
  id: string;
  lat: number;
  lng: number;
  opacity: number;
}

/** Rótulo HTML (etiqueta de trazo o letra de tarea táctica). */
export interface SceneLabel {
  key: string;
  id: string;
  lat: number;
  lng: number;
  opacity: number;
  html: string;
  /** Clase del contenedor: `gl-tip` para etiquetas de trazos, `task-lbl` para tareas. */
  className: 'gl-tip' | 'task-lbl' | 'seg-lbl';
  color?: string;
}

export interface Scene {
  shapes: FeatureCollection<LineString | Polygon, SceneProps>;
  points: ScenePoint[];
  labels: SceneLabel[];
}

const TASK_INK = '#ffffff';
const TASK_HALO = '#0b0f15';
const TASK_SELECTED = '#FFD23F';

/** [lat, lng] → [lng, lat] (GeoJSON). */
const lngLat = (p: LatLngTuple): [number, number] => [p[1], p[0]];

const line = (
  pts: LatLngTuple[],
  props: SceneProps,
  closed = false,
): Feature<LineString, SceneProps> => {
  const coords = pts.map(lngLat);
  if (closed && coords.length > 2) coords.push(coords[0]!);
  return {
    type: 'Feature',
    properties: props,
    geometry: { type: 'LineString', coordinates: coords },
  };
};

const polygon = (pts: LatLngTuple[], props: SceneProps): Feature<Polygon, SceneProps> => {
  const ring = pts.map(lngLat);
  ring.push(ring[0]!);
  return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } };
};

/**
 * Punta de flecha del eje de avance como triángulo geográfico, para que se apoye en el relieve
 * y gire con la cámara. Su tamaño es proporcional al trazo (entre 150 m y 3 km).
 */
export function arrowHead(pts: LatLngTuple[]): LatLngTuple[] | null {
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  if (!a || !b) return null;
  const kx = 111.32 * Math.cos((b[0] * Math.PI) / 180); // km por grado de longitud
  const ky = 110.57; // km por grado de latitud
  const dx = (b[1] - a[1]) * kx;
  const dy = (b[0] - a[0]) * ky;
  const seg = Math.hypot(dx, dy);
  if (seg === 0 || kx === 0) return null;
  const size = Math.min(3, Math.max(0.15, pathKm(pts) * 0.08), seg * 1.5);
  const ux = dx / seg;
  const uy = dy / seg;
  const at = (along: number, side: number): LatLngTuple => [
    b[0] + (uy * along + ux * side) / ky,
    b[1] + (ux * along - uy * side) / kx,
  ];
  return [at(size * 0.45, 0), at(-size * 0.55, size * 0.5), at(-size * 0.55, -size * 0.5)];
}

/** Punto donde va la etiqueta: centro de un área o mitad del recorrido de una línea. */
export function labelAnchor(pts: LatLngTuple[], closed: boolean): LatLngTuple | null {
  if (!pts.length) return null;
  if (closed) {
    const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return [lat, lng];
  }
  const total = pathKm(pts);
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const d = pathKm([a, b]);
    if (walked + d >= total / 2 && d > 0) {
      const t = (total / 2 - walked) / d;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    walked += d;
  }
  return pts[0]!;
}

/** Trazo, área o tarea táctica en el instante actual. */
function addLine(
  scene: Scene,
  o: LineObject,
  pts: LatLngTuple[],
  opacity: number,
  selected: boolean,
): void {
  const { shapes, labels } = scene;
  if (isTaskType(o.type)) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (!a || !b || pts.length < 2) return;
    const geo = taskGeometry(o.type, a, b);
    const ink = selected ? TASK_SELECTED : TASK_INK;
    for (const p of geo.paths) {
      const base = { id: o.id, kind: 'line', dashed: !!p.dashed } as const;
      shapes.features.push(
        line(
          p.pts,
          { ...base, color: TASK_HALO, width: selected ? 7 : 5.5, opacity: 0.75 * opacity },
          p.closed,
        ),
      );
    }
    for (const p of geo.paths) {
      const base = { id: o.id, kind: 'line', dashed: !!p.dashed } as const;
      shapes.features.push(
        line(p.pts, { ...base, color: ink, width: selected ? 3.2 : 2.4, opacity }, p.closed),
      );
    }
    geo.labels.forEach((l, i) =>
      labels.push({
        key: `${o.id}:t${i}`,
        id: o.id,
        lat: l.at[0],
        lng: l.at[1],
        opacity,
        html: esc(l.text),
        className: 'task-lbl',
        color: ink,
      }),
    );
    return;
  }

  const st = lineStyle(o, opacity, selected);
  const area = LINES[o.type]?.area;
  const closed = o.type === 'zona' || !!area;
  if (closed && pts.length >= 3 && st.fillColor)
    shapes.features.push(
      polygon(pts, {
        id: o.id,
        kind: 'fill',
        color: st.fillColor,
        width: 0,
        opacity: st.fillOpacity ?? 0,
        dashed: false,
      }),
    );
  shapes.features.push(
    line(
      pts,
      {
        id: o.id,
        kind: 'line',
        color: st.color,
        width: st.weight,
        opacity: st.opacity,
        dashed: !!st.dashArray,
      },
      closed,
    ),
  );
  if (o.type === 'eje') {
    const head = arrowHead(pts);
    if (head)
      shapes.features.push(
        polygon(head, {
          id: o.id,
          kind: 'fill',
          color: FACTIONS[o.faction].vivid,
          width: 0,
          opacity: 0.9 * opacity,
          dashed: false,
        }),
      );
  }

  const travel = hasTravel(o.type) ? o.travel : undefined;
  const measures = isAreaType(o.type) && !o.hideMeasures && pts.length >= 3;
  // Longitud de cada lado de un área, en el punto medio del lado.
  if (measures)
    for (const sd of polygonSides(pts))
      labels.push({
        key: `${o.id}:side${sd.n}`,
        id: o.id,
        lat: sd.mid[0],
        lng: sd.mid[1],
        opacity,
        className: 'seg-lbl',
        html: `<span>${formatSide(sd.km)}</span>`,
      });
  if (!o.label && !area && !travel && !measures) return;
  const at = labelAnchor(pts, closed);
  if (!at) return;
  const summary = travel ? travelSummary(pts, travel) : measures ? areaSummary(pts) : '';
  labels.push({
    key: `${o.id}:lbl`,
    id: o.id,
    lat: at[0],
    lng: at[1],
    opacity,
    className: 'gl-tip',
    html:
      (area ? `<span class="area-badge">${area}</span>` : '') +
      esc(o.label) +
      (summary ? `<span class="trip">${esc(summary)}</span>` : ''),
  });
}

/** Escena completa en el instante `time` de la línea de tiempo. */
export function sceneAt(
  objects: readonly MapObject[],
  time: number,
  phaseCount: number,
  selectedId: string | null,
): Scene {
  const scene: Scene = {
    shapes: { type: 'FeatureCollection', features: [] },
    points: [],
    labels: [],
  };
  // Áreas debajo, después trazos y tareas: como en el mapa 2D, el orden de dibujo es el de creación.
  for (const o of objects) {
    const st = objectStateAt(o, time, phaseCount);
    if (!st) continue;
    if (st.kind === 'point') {
      scene.points.push({ id: o.id, lat: st.lat, lng: st.lng, opacity: st.opacity });
    } else if (o.kind === 'line') {
      addLine(scene, o, st.pts, st.opacity, o.id === selectedId);
    }
  }
  return scene;
}
