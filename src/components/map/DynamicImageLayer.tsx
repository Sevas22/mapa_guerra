'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { clampExportSize, exportUrl, lngLatTo3857, type ArcGISExportSpec } from '@/domain/arcgis';
import { useLayerLoadingStore } from '@/store/layerLoadingStore';

/** Panes propios: la ortoimagen bajo los mosaicos XYZ y los servicios temáticos encima. */
export const DYNAMIC_BASE_PANE = 'dyn-base';
export const DYNAMIC_OVERLAY_PANE = 'dyn-overlay';

function ensurePane(map: L.Map, name: string, zIndex: number): void {
  if (map.getPane(name)) return;
  const pane = map.createPane(name);
  pane.style.zIndex = String(zIndex);
  pane.style.pointerEvents = 'none';
}

interface Props {
  id: string;
  spec: ArcGISExportSpec;
  /** Base (bajo los mosaicos) u overlay (sobre ellos, bajo los objetos tácticos). */
  role: 'base' | 'overlay';
  zIndex: number;
}

/** Retardo tras mover el mapa antes de pedir otra imagen. */
const DEBOUNCE_MS = 300;
/** Tiempo tras el que una petición sin respuesta se marca como fallida. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Capa de ArcGIS Server dinámico (MapServer `export`), como `dynamicMapLayer` de
 * esri-leaflet: pide una sola imagen del tamaño de la vista cada vez que el mapa
 * se detiene, así el servidor rotula sin cortes y se hacen pocas peticiones.
 * Mantiene la imagen anterior hasta que llega la nueva y descarta respuestas viejas.
 */
export function DynamicImageLayer({ id, spec, role, zIndex }: Props) {
  const map = useMap();

  useEffect(() => {
    const pane = role === 'base' ? DYNAMIC_BASE_PANE : DYNAMIC_OVERLAY_PANE;
    ensurePane(map, DYNAMIC_BASE_PANE, 150);
    ensurePane(map, DYNAMIC_OVERLAY_PANE, 250);
    const setState = useLayerLoadingStore.getState().set;
    const attribution = map.attributionControl;
    attribution?.addAttribution(spec.attribution);

    let overlay: L.ImageOverlay | null = null;
    let request = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    let pending: HTMLImageElement | null = null;

    const clear = () => {
      overlay?.remove();
      overlay = null;
    };

    const refresh = () => {
      const req = ++request;
      if (pending) pending.src = '';
      if (spec.minZoom != null && map.getZoom() < spec.minZoom) {
        clear();
        setState(id, 'zoom');
        return;
      }
      const b = map.getBounds();
      const sw = lngLatTo3857(b.getWest(), b.getSouth());
      const ne = lngLatTo3857(b.getEast(), b.getNorth());
      const px = map.getSize();
      const [w, h] = clampExportSize(px.x, px.y);
      const url = exportUrl(spec, [sw[0], sw[1], ne[0], ne[1]], [w, h]);
      const bounds = L.latLngBounds(b.getSouthWest(), b.getNorthEast());

      setState(id, 'loading');
      const img = new Image();
      pending = img;
      // Los servidores oficiales a veces se cuelgan: tras un tiempo se avisa del fallo
      // (si la imagen llega después, igualmente se muestra).
      clearTimeout(slowTimer);
      slowTimer = setTimeout(() => {
        if (req === request && pending === img) setState(id, 'error');
      }, REQUEST_TIMEOUT_MS);
      img.onload = () => {
        if (req !== request) return;
        clearTimeout(slowTimer);
        pending = null;
        const next = L.imageOverlay(url, bounds, {
          pane,
          opacity: spec.opacity ?? 1,
          className: spec.className,
          interactive: false,
          zIndex,
        }).addTo(map);
        // Quitar la anterior cuando la nueva ya está en pantalla evita parpadeos.
        const prev = overlay;
        overlay = next;
        prev?.remove();
        setState(id, null);
      };
      img.onerror = () => {
        if (req !== request) return;
        clearTimeout(slowTimer);
        pending = null;
        setState(id, 'error');
      };
      img.src = url;
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, DEBOUNCE_MS);
    };

    refresh();
    map.on('moveend zoomend resize', schedule);
    return () => {
      request++;
      clearTimeout(timer);
      clearTimeout(slowTimer);
      if (pending) pending.src = '';
      map.off('moveend zoomend resize', schedule);
      attribution?.removeAttribution(spec.attribution);
      clear();
      setState(id, null);
    };
  }, [map, id, spec, role, zIndex]);

  return null;
}
