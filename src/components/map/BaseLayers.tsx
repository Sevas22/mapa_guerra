'use client';

import { TileLayer } from 'react-leaflet';
import { OVERLAYS, basemapById, type TileSpec } from '@/domain/basemaps';
import { useMapStyleStore } from '@/store/mapStyleStore';

const MAX_ZOOM = 19;

function Tiles({ spec, zIndex }: { spec: TileSpec; zIndex: number }) {
  return (
    <TileLayer
      url={spec.url}
      attribution={spec.attribution}
      maxZoom={MAX_ZOOM}
      maxNativeZoom={spec.maxNativeZoom}
      subdomains={spec.subdomains ?? 'abc'}
      opacity={spec.opacity ?? 1}
      className={spec.className}
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
      <Tiles key={base.id} spec={base.tiles} zIndex={1} />
      {OVERLAYS.filter((o) => overlays.includes(o.id)).map((o) => (
        <Tiles key={o.id} spec={o.tiles} zIndex={o.zIndex} />
      ))}
    </>
  );
}
