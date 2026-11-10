import type { Map as LeafletMap } from 'leaflet';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/domain/catalog';
import { scenarioBounds } from '@/domain/coords';
import type { LatLngTuple, PhaseView, Scenario } from '@/domain/types';

/**
 * Referencia al mapa Leaflet activo, para que el store, la reproducción y los
 * paneles puedan mover la cámara sin pasar el mapa por props.
 */
let current: LeafletMap | null = null;

export const setMap = (m: LeafletMap | null): void => {
  current = m;
};

export const getMap = (): LeafletMap | null => current;

export function flyToView(view: PhaseView | null, duration: number): void {
  if (view) current?.flyTo(view.c, view.z, { duration });
}

export function flyToPoint(c: LatLngTuple, zoom: number, duration: number): void {
  current?.flyTo(c, zoom, { duration });
}

/** Encuadra todos los objetos del escenario (`fitAll` del prototipo). */
export function fitScenario(s: Scenario): void {
  const b = scenarioBounds(s);
  if (!b || !current) return;
  const [[south, west], [north, east]] = b;
  const padLat = (north - south) * 0.2;
  const padLng = (east - west) * 0.2;
  current.fitBounds([
    [south - padLat, west - padLng],
    [north + padLat, east + padLng],
  ]);
}

export function resetView(): void {
  current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM);
}

/** Vista actual del mapa, redondeada como en el prototipo. */
export function currentView(): PhaseView | null {
  if (!current) return null;
  const c = current.getCenter();
  return { c: [+c.lat.toFixed(5), +c.lng.toFixed(5)], z: current.getZoom() };
}

/** Distancia en píxeles de pantalla entre dos coordenadas. */
export function pixelDistance(a: LatLngTuple, b: LatLngTuple): number {
  if (!current) return Infinity;
  return current.latLngToContainerPoint(a).distanceTo(current.latLngToContainerPoint(b));
}
