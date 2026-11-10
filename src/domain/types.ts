/**
 * Modelo de datos del escenario. El formato JSON es idéntico al del prototipo
 * (referencia/mapa-tactico-colombia.html) para que los archivos exportados
 * desde el HTML se puedan importar sin cambios.
 */

import type {
  EFFECTIVENESS_IDS,
  FACTION_IDS,
  MEDIA_KINDS,
  TRAVEL_MODES,
  LINE_TYPES,
  MOBILITY_IDS,
  POINT_TYPES,
  REINFORCEMENT_IDS,
  STATUS_IDS,
  UNIT_TYPES,
} from './ids';

/** Identidad estándar: amigo (azul), hostil (roja), neutral (verde), desconocida (amarilla). */
export type FactionId = (typeof FACTION_IDS)[number];
export type UnitType = (typeof UNIT_TYPES)[number];
export type PointType = (typeof POINT_TYPES)[number];
export type LineType = (typeof LINE_TYPES)[number];
export type Mobility = (typeof MOBILITY_IDS)[number];
export type Reinforcement = (typeof REINFORCEMENT_IDS)[number];
export type Effectiveness = (typeof EFFECTIVENESS_IDS)[number];
export type SymbolStatus = (typeof STATUS_IDS)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];
export type TravelMode = (typeof TRAVEL_MODES)[number];

/**
 * Adjunto multimedia (imagen o video). El archivo se guarda aparte (IndexedDB)
 * con el mismo `id`; `url` solo se usa para recursos incluidos en la app.
 */
export interface MediaRef {
  id: string;
  kind: MediaKind;
  name: string;
  caption: string;
  url?: string;
}

/** Ficha de una unidad o instalación: efectivos, medios y misión. */
export interface UnitCard {
  /** Efectivos (PAX). */
  pax?: number;
  /** Medios: aeronaves, vehículos, embarcaciones… (texto libre). */
  medios?: string;
  /** Misión o tarea asignada. */
  mision?: string;
}

/** Medio y velocidad de desplazamiento de un trazo. */
export interface Travel {
  mode: TravelMode;
  /** Velocidad en km/h; si falta se usa la típica del medio. */
  speed?: number;
}

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
  /** Imágenes y videos adjuntos. */
  media?: MediaRef[];
}

/**
 * Información opcional del símbolo según el MFRE 1-02 (todos los campos son
 * opcionales para seguir leyendo los archivos del prototipo).
 */
export interface SymbolFields {
  /** Fuerza (EJC, ARC, FAC, PONAL…) o estructura GAO; define el color de relleno. */
  force?: string;
  /** Texto del ícono: nombre de la unidad, número de punto de control, ZD… */
  iconText?: string;
  /** Modificador del sector 1 en texto (ASLT, SAR, DRUG, CBT…). */
  mod1?: string;
  /** Modificador del sector 2: movilidad. */
  mobility?: Mobility;
  /** Amplificador de fuerza de tarea (campo D). */
  taskForce?: boolean;
  /** Reforzada (+), reducida (-) o ambas (±) (campo F). */
  reinforced?: Reinforcement;
  /** Eficacia de combate (campo AL). */
  effectiveness?: Effectiveness;
  /** Presente o planeada (marco punteado). */
  status?: SymbolStatus;
  /** Ficha de efectivos y medios. */
  card?: UnitCard;
}

export interface UnitObject extends BaseObject, SymbolFields {
  kind: 'unit';
  type: UnitType;
  echelon: string;
  frames: Frames<PointFrame>;
}

export interface PointObject extends BaseObject, SymbolFields {
  kind: 'point';
  type: PointType;
  /** El prototipo guarda `echelon: ""` también en puntos; se conserva si viene. */
  echelon?: string;
  frames: Frames<PointFrame>;
}

export interface LineObject extends BaseObject {
  kind: 'line';
  force?: string;
  /** Medio de desplazamiento, para calcular distancia y tiempo. */
  travel?: Travel;
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
  /** Imágenes y videos que acompañan la narración de la fase. */
  media?: MediaRef[];
}

export type Speed = 1 | 2 | 4 | 7;

export interface Scenario {
  v: 1;
  name: string;
  /** Duración de la transición entre fases, en segundos. */
  speed: number;
  phases: Phase[];
  objects: MapObject[];
  /**
   * Solo en archivos exportados: contenido de los adjuntos como data URL, por id.
   * Al importar se mueve a IndexedDB y desaparece del escenario.
   */
  mediaData?: Record<string, string>;
}
