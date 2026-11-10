import type { FactionId, LineType, PointType, UnitType } from './types';

export type FactionShape = 'rect' | 'diamond' | 'square' | 'circle';

export interface FactionDef {
  name: string;
  /** Relleno del marco de unidad. */
  fill: string;
  /** Color vivo para puntos y trazos. */
  vivid: string;
  shape: FactionShape;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  azul: { name: 'Azul · propia', fill: '#9FD8FF', vivid: '#4DA8FF', shape: 'rect' },
  roja: { name: 'Roja · hostil', fill: '#FF9C9C', vivid: '#FF5252', shape: 'diamond' },
  verde: { name: 'Verde · neutral', fill: '#AAF0B6', vivid: '#3DDC84', shape: 'square' },
  amarilla: { name: 'Desconocida', fill: '#FFF08A', vivid: '#FFD23F', shape: 'circle' },
};

/** [símbolo, nombre] */
export const ECHELONS: ReadonlyArray<readonly [string, string]> = [
  ['', 'Sin escalón'],
  ['•', 'Escuadra'],
  ['••', 'Sección'],
  ['•••', 'Pelotón'],
  ['I', 'Compañía'],
  ['II', 'Batallón'],
  ['III', 'Regimiento'],
  ['X', 'Brigada'],
  ['XX', 'División'],
];

/** Guion suave: permite partir nombres largos en la paleta. */
const SHY = '­';

export const UNITS: Record<UnitType, { name: string }> = {
  infanteria: { name: 'Infantería' },
  mecanizada: { name: 'Mecanizada' },
  blindados: { name: 'Blindados' },
  reconocimiento: { name: `Reconoci${SHY}miento` },
  artilleria: { name: 'Artillería' },
  antiaerea: { name: 'Antiaérea' },
  aviacion: { name: 'Aviación' },
  naval: { name: 'Fluvial / naval' },
  ingenieros: { name: 'Ingenieros' },
  comunicaciones: { name: `Comunica${SHY}ciones` },
  sanidad: { name: 'Sanidad' },
  logistica: { name: 'Logística' },
  especiales: { name: 'Fuerzas especiales' },
  policia: { name: 'Policía' },
  pc: { name: 'Puesto de mando' },
};

export interface PointDef {
  name: string;
  size: [number, number];
  anchor: [number, number];
  /** Etiqueta por defecto al colocarlo. */
  label: string;
}

export const POINTS: Record<PointType, PointDef> = {
  objetivo: { name: 'Objetivo', size: [34, 34], anchor: [17, 17], label: 'OBJ' },
  base: { name: 'Base / puesto', size: [30, 32], anchor: [7, 30], label: '' },
  evento: { name: 'Combate / evento', size: [34, 34], anchor: [17, 17], label: '' },
  control: { name: 'Punto de control', size: [28, 26], anchor: [14, 16], label: 'PC-1' },
  punto: { name: 'Punto', size: [18, 18], anchor: [9, 9], label: '' },
  texto: { name: 'Rótulo de texto', size: [0, 0], anchor: [0, 0], label: 'Rótulo' },
};

export const LINES: Record<LineType, { name: string; min: number }> = {
  frente: { name: 'Línea de frente', min: 2 },
  eje: { name: 'Eje de avance', min: 2 },
  ruta: { name: 'Ruta', min: 2 },
  zona: { name: 'Zona / área', min: 3 },
};

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

const RAW_PLACES: ReadonlyArray<readonly [string, number, number]> = [
  ['Bogotá', 4.711, -74.0721],
  ['Medellín', 6.2442, -75.5812],
  ['Cali', 3.4516, -76.532],
  ['Barranquilla', 10.9685, -74.7813],
  ['Cartagena', 10.391, -75.4794],
  ['Santa Marta', 11.2408, -74.199],
  ['Bucaramanga', 7.1193, -73.1227],
  ['Cúcuta', 7.8939, -72.5078],
  ['Villavicencio', 4.142, -73.6266],
  ['Pasto', 1.2136, -77.2811],
  ['Popayán', 2.4448, -76.6147],
  ['Quibdó', 5.6947, -76.6611],
  ['Arauca', 7.0847, -70.7591],
  ['San José del Guaviare', 2.5729, -72.6459],
  ['Florencia', 1.6144, -75.6062],
  ['Leticia', -4.2153, -69.9406],
  ['Ibagué', 4.4389, -75.2322],
  ['Neiva', 2.9273, -75.2819],
  ['Montería', 8.7479, -75.8814],
  ['Riohacha', 11.5444, -72.9072],
];

export const PLACES: readonly Place[] = RAW_PLACES.map(([name, lat, lng]) => ({ name, lat, lng }));

/** Nombre sin guiones suaves, para selects y textos. */
export const plainName = (s: string): string => s.split(SHY).join('');

/** Vista inicial del mapa (todo el país). */
export const DEFAULT_CENTER: [number, number] = [4.3, -73.5];
export const DEFAULT_ZOOM = 6;

export const SPEEDS = [1, 2, 4, 7] as const;
/** Pausa en cada fase durante la reproducción. */
export const PHASE_HOLD_MS = 900;
/** Clave de `localStorage`, la misma del prototipo. */
export const STORE_KEY = 'mapa-tactico-co-v1';
