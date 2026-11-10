/**
 * Catálogo de mapas base y capas superpuestas. Solo usa servicios de mosaicos
 * públicos que no requieren clave (Esri, OpenTopoMap, OpenStreetMap, CARTO).
 */

export interface TileSpec {
  url: string;
  attribution: string;
  /** Zoom máximo que sirve el proveedor; por encima se amplían los mosaicos. */
  maxNativeZoom?: number;
  subdomains?: string;
  opacity?: number;
  /** Clase CSS del contenedor de mosaicos (p. ej. modo de fusión). */
  className?: string;
}

export type BaseMapGroup = 'Imágenes' | 'Relieve' | 'Mapas';

export interface BaseMapDef {
  id: string;
  name: string;
  group: BaseMapGroup;
  description: string;
  tiles: TileSpec;
}

export interface OverlayDef {
  id: string;
  name: string;
  description: string;
  tiles: TileSpec;
  zIndex: number;
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const esri = (service: string) => `${ESRI}/${service}/MapServer/tile/{z}/{y}/{x}`;
const ESRI_ATTR = 'Esri';
const CARTO_ATTR = '© OpenStreetMap, © CARTO';

export const BASEMAPS: readonly BaseMapDef[] = [
  {
    id: 'satelite',
    name: 'Satélite',
    group: 'Imágenes',
    description: 'Imágenes recientes (Esri World Imagery).',
    tiles: {
      url: esri('World_Imagery'),
      attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    },
  },
  {
    id: 'satelite-nitido',
    name: 'Satélite nítido',
    group: 'Imágenes',
    description: 'Imágenes algo más antiguas pero más nítidas (Esri Clarity).',
    tiles: {
      url: 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    },
  },
  {
    id: 'terreno',
    name: 'Terreno',
    group: 'Relieve',
    description: 'Relieve con vegetación y agua, sin texto.',
    tiles: {
      url: esri('World_Terrain_Base'),
      attribution: `Relieve © ${ESRI_ATTR}`,
      maxNativeZoom: 13,
    },
  },
  {
    id: 'relieve',
    name: 'Relieve sombreado',
    group: 'Relieve',
    description: 'Sombreado del terreno en tonos neutros.',
    tiles: {
      url: esri('World_Shaded_Relief'),
      attribution: `Relieve © ${ESRI_ATTR}`,
      maxNativeZoom: 13,
    },
  },
  {
    id: 'fisico',
    name: 'Físico',
    group: 'Relieve',
    description: 'Mapa físico a escala regional (detalle hasta zoom 8).',
    tiles: {
      url: esri('World_Physical_Map'),
      attribution: `© ${ESRI_ATTR}, US NPS`,
      maxNativeZoom: 8,
    },
  },
  {
    id: 'topografico',
    name: 'Topográfico',
    group: 'Mapas',
    description: 'Curvas de nivel y relieve (OpenTopoMap).',
    tiles: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap (CC-BY-SA), © OpenStreetMap',
      maxNativeZoom: 17,
      subdomains: 'abc',
    },
  },
  {
    id: 'topografico-esri',
    name: 'Topográfico Esri',
    group: 'Mapas',
    description: 'Mapa topográfico general de Esri.',
    tiles: { url: esri('World_Topo_Map'), attribution: `© ${ESRI_ATTR}` },
  },
  {
    id: 'natgeo',
    name: 'National Geographic',
    group: 'Mapas',
    description: 'Estilo cartográfico clásico.',
    tiles: {
      url: esri('NatGeo_World_Map'),
      attribution: `© ${ESRI_ATTR}, National Geographic`,
      maxNativeZoom: 16,
    },
  },
  {
    id: 'calles',
    name: 'Calles',
    group: 'Mapas',
    description: 'Callejero claro (CARTO Voyager).',
    tiles: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: CARTO_ATTR,
      subdomains: 'abcd',
    },
  },
  {
    id: 'calles-esri',
    name: 'Calles Esri',
    group: 'Mapas',
    description: 'Callejero detallado de Esri.',
    tiles: { url: esri('World_Street_Map'), attribution: `© ${ESRI_ATTR}` },
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    group: 'Mapas',
    description: 'Mapa estándar de OpenStreetMap.',
    tiles: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap',
    },
  },
  {
    id: 'oscuro',
    name: 'Oscuro',
    group: 'Mapas',
    description: 'Fondo oscuro de bajo contraste (CARTO).',
    tiles: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: CARTO_ATTR,
      subdomains: 'abcd',
    },
  },
  {
    id: 'claro',
    name: 'Claro',
    group: 'Mapas',
    description: 'Fondo claro de bajo contraste (CARTO).',
    tiles: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: CARTO_ATTR,
      subdomains: 'abcd',
    },
  },
];

export const OVERLAYS: readonly OverlayDef[] = [
  {
    id: 'sombreado',
    name: 'Sombreado de relieve',
    description: 'Realza montañas y valles sobre cualquier mapa.',
    zIndex: 2,
    tiles: {
      url: esri('Elevation/World_Hillshade'),
      attribution: `Sombreado © ${ESRI_ATTR}`,
      maxNativeZoom: 16,
      opacity: 0.45,
      className: 'blend-multiply',
    },
  },
  {
    id: 'vias',
    name: 'Carreteras',
    description: 'Vías principales y secundarias.',
    zIndex: 3,
    tiles: { url: esri('Reference/World_Transportation'), attribution: `Vías © ${ESRI_ATTR}` },
  },
  {
    id: 'etiquetas',
    name: 'Nombres y fronteras',
    description: 'Ciudades, departamentos y límites.',
    zIndex: 4,
    tiles: {
      url: esri('Reference/World_Boundaries_and_Places'),
      attribution: `Etiquetas © ${ESRI_ATTR}`,
    },
  },
];

/** Igual que el prototipo: satélite con nombres y fronteras. */
export const DEFAULT_BASEMAP = 'satelite';
export const DEFAULT_OVERLAYS: readonly string[] = ['etiquetas'];

export const basemapById = (id: string): BaseMapDef =>
  BASEMAPS.find((b) => b.id === id) ?? (BASEMAPS[0] as BaseMapDef);

/** Filtra ids desconocidos y conserva el orden del catálogo. */
export const validOverlays = (ids: readonly string[]): string[] =>
  OVERLAYS.filter((o) => ids.includes(o.id)).map((o) => o.id);

/** Mosaico de muestra de Colombia para la miniatura del selector. */
export const PREVIEW_TILE = { z: 6, x: 18, y: 31 } as const;

export function tileUrl(t: TileSpec, z: number, x: number, y: number): string {
  return t.url
    .replace('{s}', (t.subdomains ?? 'abc')[0] ?? 'a')
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{r}', '');
}

export const previewUrl = (t: TileSpec): string =>
  tileUrl(t, Math.min(PREVIEW_TILE.z, t.maxNativeZoom ?? 19), PREVIEW_TILE.x, PREVIEW_TILE.y);
