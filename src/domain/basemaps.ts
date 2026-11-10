/**
 * Catálogo de mapas base y capas superpuestas. Solo usa servicios públicos que no
 * requieren clave: mosaicos XYZ (Esri, OpenTopoMap, OpenStreetMap, CARTO) y
 * servicios dinámicos oficiales de Colombia (IGAC y DANE, vía ArcGIS `export`).
 */
import { exportUrl, tileBBox3857, type ArcGISExportSpec } from './arcgis';

export interface TileSpec {
  kind?: 'xyz';
  url: string;
  attribution: string;
  /** Zoom máximo que sirve el proveedor; por encima se amplían los mosaicos. */
  maxNativeZoom?: number;
  subdomains?: string;
  opacity?: number;
  /** Clase CSS del contenedor de mosaicos (p. ej. modo de fusión). */
  className?: string;
}

/** Origen de una capa: mosaicos XYZ o imagen dinámica de ArcGIS Server. */
export type LayerSource = TileSpec | ArcGISExportSpec;

export const isArcGIS = (s: LayerSource): s is ArcGISExportSpec => s.kind === 'arcgis';

export type BaseMapGroup = 'Imágenes' | 'Relieve' | 'Mapas' | 'Colombia (IGAC)';
export type OverlayGroup = 'General' | 'Colombia (IGAC y DANE)';

export interface BaseMapDef {
  id: string;
  name: string;
  group: BaseMapGroup;
  description: string;
  source: LayerSource;
}

export interface OverlayDef {
  id: string;
  name: string;
  description: string;
  group: OverlayGroup;
  source: LayerSource;
  /** Orden de apilado dentro de su grupo (mayor = encima). */
  zIndex: number;
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const esri = (service: string) => `${ESRI}/${service}/MapServer/tile/{z}/{y}/{x}`;
const ESRI_ATTR = 'Esri';
const CARTO_ATTR = '© OpenStreetMap, © CARTO';

const IGAC = 'https://mapas.igac.gov.co/server/rest/services';
const IGAC2 = 'https://mapas2.igac.gov.co/server/rest/services';
const DANE = 'https://geoportal.dane.gov.co/mparcgis/rest/services';
const DANE_VEREDAS = `${DANE}/NIVEL_DE_REFERENCIA_DE_VEREDAS/Serv_CapasNivelReferenciaVeredas_2025/MapServer`;

export const BASEMAPS: readonly BaseMapDef[] = [
  {
    id: 'satelite',
    name: 'Satélite',
    group: 'Imágenes',
    description: 'Imágenes recientes (Esri World Imagery).',
    source: {
      url: esri('World_Imagery'),
      attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    },
  },
  {
    id: 'satelite-nitido',
    name: 'Satélite nítido',
    group: 'Imágenes',
    description: 'Imágenes algo más antiguas pero más nítidas (Esri Clarity).',
    source: {
      url: 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    },
  },
  {
    id: 'terreno',
    name: 'Terreno',
    group: 'Relieve',
    description: 'Relieve con vegetación y agua, sin texto.',
    source: {
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
    source: {
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
    source: {
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
    source: {
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
    source: { url: esri('World_Topo_Map'), attribution: `© ${ESRI_ATTR}` },
  },
  {
    id: 'natgeo',
    name: 'National Geographic',
    group: 'Mapas',
    description: 'Estilo cartográfico clásico.',
    source: {
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
    source: {
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
    source: { url: esri('World_Street_Map'), attribution: `© ${ESRI_ATTR}` },
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    group: 'Mapas',
    description: 'Mapa estándar de OpenStreetMap.',
    source: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap',
    },
  },
  {
    id: 'oscuro',
    name: 'Oscuro',
    group: 'Mapas',
    description: 'Fondo oscuro de bajo contraste (CARTO).',
    source: {
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
    source: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: CARTO_ATTR,
      subdomains: 'abcd',
    },
  },
  {
    id: 'igac-orto',
    name: 'Ortoimagen IGAC',
    group: 'Colombia (IGAC)',
    description:
      'Ortoimagen oficial de Colombia 2023 (IGAC). Servicio lento: cada vista tarda 10–30 s.',
    source: {
      kind: 'arcgis',
      url: `${IGAC}/otros/ortocolombia/MapServer`,
      attribution: 'Ortoimagen © IGAC',
      format: 'jpg',
      minZoom: 6,
    },
  },
];

export const OVERLAYS: readonly OverlayDef[] = [
  {
    id: 'sombreado',
    group: 'General',
    name: 'Sombreado de relieve',
    description: 'Realza montañas y valles sobre cualquier mapa.',
    zIndex: 2,
    source: {
      url: esri('Elevation/World_Hillshade'),
      attribution: `Sombreado © ${ESRI_ATTR}`,
      maxNativeZoom: 16,
      opacity: 0.45,
      className: 'blend-multiply',
    },
  },
  {
    id: 'vias',
    group: 'General',
    name: 'Carreteras',
    description: 'Vías principales y secundarias.',
    zIndex: 3,
    source: { url: esri('Reference/World_Transportation'), attribution: `Vías © ${ESRI_ATTR}` },
  },
  {
    id: 'etiquetas',
    group: 'General',
    name: 'Nombres y fronteras',
    description: 'Ciudades, departamentos y límites.',
    zIndex: 4,
    source: {
      url: esri('Reference/World_Boundaries_and_Places'),
      attribution: `Etiquetas © ${ESRI_ATTR}`,
    },
  },
  {
    id: 'igac-agua',
    name: 'Ríos y cuerpos de agua',
    group: 'Colombia (IGAC y DANE)',
    description: 'Drenajes, humedales y ciénagas a escala 1:500.000 (IGAC).',
    zIndex: 10,
    source: {
      kind: 'arcgis',
      url: `${IGAC}/Dato_Fundamental_Cuerpos_de_Agua_500k/MapServer`,
      attribution: 'Hidrografía © IGAC',
      minZoom: 7,
    },
  },
  {
    id: 'igac-curvas',
    name: 'Curvas de nivel',
    group: 'Colombia (IGAC y DANE)',
    description: 'Curvas de nivel 1:100.000 (IGAC). Desde zoom 12; servicio lento.',
    zIndex: 11,
    source: {
      kind: 'arcgis',
      url: `${IGAC}/Curvas_de_nivel_100k/MapServer`,
      attribution: 'Curvas de nivel © IGAC',
      minZoom: 12,
    },
  },
  {
    id: 'igac-100k',
    name: 'Cartografía 1:100.000',
    group: 'Colombia (IGAC y DANE)',
    description:
      'Vías, ríos y quebradas con nombre, poblados y puentes (IGAC 2019). Desde zoom 9; más detalle al acercarse. Lento.',
    zIndex: 12,
    source: {
      kind: 'arcgis',
      url: `${IGAC2}/carto/carto100000colombia2019/MapServer`,
      attribution: 'Cartografía básica © IGAC',
      minZoom: 9,
      className: 'igac-boost',
    },
  },
  {
    id: 'dane-veredas',
    name: 'Veredas',
    group: 'Colombia (IGAC y DANE)',
    description: 'Límites, nombres y códigos de veredas (DANE 2025). Desde zoom 11.',
    zIndex: 13,
    source: {
      kind: 'arcgis',
      url: DANE_VEREDAS,
      layers: 'show:1',
      attribution: 'Veredas © DANE',
      minZoom: 11,
      className: 'map-halo',
    },
  },
  {
    id: 'dane-municipios',
    name: 'Municipios y centros poblados',
    group: 'Colombia (IGAC y DANE)',
    description:
      'Departamentos, municipios, cabeceras y centros poblados (corregimientos, caseríos) del DANE 2025.',
    zIndex: 14,
    source: {
      kind: 'arcgis',
      url: DANE_VEREDAS,
      layers: 'show:305,317,319',
      attribution: 'División político-administrativa © DANE',
      minZoom: 7,
      className: 'map-halo',
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

export function previewUrl(src: LayerSource): string {
  if (isArcGIS(src)) {
    const { z, x, y } = PREVIEW_TILE;
    return exportUrl(src, tileBBox3857(z, x, y), [256, 256]);
  }
  return tileUrl(
    src,
    Math.min(PREVIEW_TILE.z, src.maxNativeZoom ?? 19),
    PREVIEW_TILE.x,
    PREVIEW_TILE.y,
  );
}

export const overlayById = (id: string): OverlayDef | undefined =>
  OVERLAYS.find((o) => o.id === id);
