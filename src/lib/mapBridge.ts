import type { Map as LeafletMap } from 'leaflet';
import type { Map as GlMap } from 'maplibre-gl';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/domain/catalog';
import { scenarioBounds } from '@/domain/coords';
import { toGlZoom, toLeafletZoom } from '@/domain/scene3d';
import type { LatLngTuple, PhaseView, Scenario } from '@/domain/types';

/**
 * Referencia al mapa Leaflet activo, para que el store, la reproducción y los
 * paneles puedan mover la cámara sin pasar el mapa por props.
 */
let current: LeafletMap | null = null;
/** Mapa 3D (MapLibre) mientras la vista 3D está abierta. La cámara mueve los dos. */
let gl: GlMap | null = null;

export const setMap = (m: LeafletMap | null): void => {
  current = m;
};

export const getMap = (): LeafletMap | null => current;

export const setMap3d = (m: GlMap | null): void => {
  gl = m;
};

export const getMap3d = (): GlMap | null => gl;

export function flyToPoint(c: LatLngTuple, zoom: number, duration: number): void {
  if (current) {
    // Con el contenedor sin tamaño (pestaña oculta, panel colapsado) `flyTo` de Leaflet
    // calcula NaN y lanza un error: en ese caso se salta directamente a la vista.
    const size = current.getSize();
    if (size.x > 0 && size.y > 0) current.flyTo(c, zoom, { duration });
    else current.setView(c, zoom, { animate: false });
  }
  gl?.flyTo({ center: [c[1], c[0]], zoom: toGlZoom(zoom), duration: duration * 1000 });
}

export function flyToView(view: PhaseView | null, duration: number): void {
  if (view) flyToPoint(view.c, view.z, duration);
}

/** Encuadra todos los objetos del escenario (`fitAll` del prototipo). */
export function fitScenario(s: Scenario): void {
  const b = scenarioBounds(s);
  if (!b) return;
  const [[south, west], [north, east]] = b;
  const padLat = (north - south) * 0.2;
  const padLng = (east - west) * 0.2;
  current?.fitBounds([
    [south - padLat, west - padLng],
    [north + padLat, east + padLng],
  ]);
  gl?.fitBounds(
    [
      [west - padLng, south - padLat],
      [east + padLng, north + padLat],
    ],
    { duration: 0 },
  );
}

export function resetView(): void {
  flyToPoint(DEFAULT_CENTER, DEFAULT_ZOOM, 1);
}

/** Vista actual del mapa (la del 3D si está abierto), redondeada como en el prototipo. */
export function currentView(): PhaseView | null {
  if (gl) {
    const c = gl.getCenter();
    return {
      c: [+c.lat.toFixed(5), +c.lng.toFixed(5)],
      z: Math.round(toLeafletZoom(gl.getZoom())),
    };
  }
  if (!current) return null;
  const c = current.getCenter();
  return { c: [+c.lat.toFixed(5), +c.lng.toFixed(5)], z: current.getZoom() };
}

/** Distancia en píxeles de pantalla entre dos coordenadas. */
export function pixelDistance(a: LatLngTuple, b: LatLngTuple): number {
  if (!current) return Infinity;
  return current.latLngToContainerPoint(a).distanceTo(current.latLngToContainerPoint(b));
}
