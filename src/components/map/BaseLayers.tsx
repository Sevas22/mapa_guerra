'use client';

import { TileLayer } from 'react-leaflet';
import { OVERLAYS, basemapById, isArcGIS, type LayerSource } from '@/domain/basemaps';
import { useMapStyleStore } from '@/store/mapStyleStore';
import { DynamicImageLayer } from './DynamicImageLayer';

const MAX_ZOOM = 19;

function Layer({
  id,
  source,
  role,
  zIndex,
}: {
  id: string;
  source: LayerSource;
  role: 'base' | 'overlay';
  zIndex: number;
}) {
  if (isArcGIS(source))
    return <DynamicImageLayer id={id} spec={source} role={role} zIndex={zIndex} />;
  return (
    <TileLayer
      url={source.url}
      attribution={source.attribution}
      maxZoom={MAX_ZOOM}
      maxNativeZoom={source.maxNativeZoom}
      subdomains={source.subdomains ?? 'abc'}
      opacity={source.opacity ?? 1}
      className={source.className}
      zIndex={zIndex}
    />
  );
}

/** Mapa base elegido y capas superpuestas activas, según la preferencia guardada. */
export function BaseLayers() {
  const baseId = useMapStyleStore((s) => s.baseId);
  const overlays = useMapStyleStore((s) => s.overlays);
  const base = basemapById(baseId);
  return (
    <>
      {/* La clave fuerza a recrear la capa al cambiar de proveedor. */}
      <Layer key={base.id} id={base.id} source={base.source} role="base" zIndex={1} />
      {OVERLAYS.filter((o) => overlays.includes(o.id)).map((o) => (
        <Layer key={o.id} id={o.id} source={o.source} role="overlay" zIndex={o.zIndex} />
      ))}
    </>
  );
}
