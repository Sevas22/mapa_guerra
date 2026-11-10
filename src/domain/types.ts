/**
 * Modelo de datos del escenario. El formato JSON es idéntico al del prototipo
 * (referencia/mapa-tactico-colombia.html) para que los archivos exportados
 * desde el HTML se puedan importar sin cambios.
 */

export type FactionId = 'azul' | 'roja' | 'verde' | 'amarilla';

export type UnitType =
  | 'infanteria'
  | 'mecanizada'
  | 'blindados'
  | 'reconocimiento'
  | 'artilleria'
  | 'antiaerea'
  | 'aviacion'
  | 'naval'
  | 'ingenieros'
  | 'comunicaciones'
  | 'sanidad'
  | 'logistica'
  | 'especiales'
  | 'policia'
  | 'pc';

export type PointType = 'objetivo' | 'base' | 'evento' | 'control' | 'punto' | 'texto';

export type LineType = 'frente' | 'eje' | 'ruta' | 'zona';

/** [lat, lng] */
export type LatLngTuple = [number, number];

export interface PointFrame {
  lat: number;
  lng: number;
}

export interface LineFrame {
  pts: LatLngTuple[];
}

export type Frame = PointFrame | LineFrame;

/** Frames indexados por número de fase. En JSON las claves son cadenas ("0", "1"…). */
export type Frames<F extends Frame> = Record<number, F>;

interface BaseObject {
  id: string;
  faction: FactionId;
  label: string;
  notes: string;
  /** Primera fase en la que aparece. */
  start: number;
  /** Última fase en la que es visible; `null` = hasta el final. */
  end: number | null;
}

export interface UnitObject extends BaseObject {
  kind: 'unit';
  type: UnitType;
  echelon: string;
  frames: Frames<PointFrame>;
}

export interface PointObject extends BaseObject {
  kind: 'point';
  type: PointType;
  /** El prototipo guarda `echelon: ""` también en puntos; se conserva si viene. */
  echelon?: string;
  frames: Frames<PointFrame>;
}

export interface LineObject extends BaseObject {
  kind: 'line';
  type: LineType;
  echelon?: string;
  frames: Frames<LineFrame>;
}

export type MapObject = UnitObject | PointObject | LineObject;
export type ObjectKind = MapObject['kind'];
export type PositionedObject = UnitObject | PointObject;

export interface PhaseView {
  /** Centro [lat, lng]. */
  c: LatLngTuple;
  z: number;
}

export interface Phase {
  id: string;
  title: string;
  date: string;
  desc: string;
  view: PhaseView | null;
}

export type Speed = 1 | 2 | 4 | 7;

export interface Scenario {
  v: 1;
  name: string;
  /** Duración de la transición entre fases, en segundos. */
  speed: number;
  phases: Phase[];
  objects: MapObject[];
}
