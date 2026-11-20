/**
 * Modelo de datos del escenario. El formato JSON es idéntico al del prototipo
 * (referencia/mapa-tactico-colombia.html) para que los archivos exportados
 * desde el HTML se puedan importar sin cambios.
 */

import type { LinkChart } from './linkChart';
import type { CustomMesh, Model3D } from './models3d';
import type { Profile } from './profiles';
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
  /** Altura de vuelo sobre el terreno en esta fase, en metros (solo para modelos 3D). */
  alt?: number;
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

/** Modelo 3D (aeronave o dron) que acompaña a la unidad en la vista 3D. */
export interface ModelFields {
  /** Id de un modelo de `Scenario.models`. */
  model3d?: string;
  /** Altura de vuelo sobre el terreno, en metros. */
  altitude?: number;
}

/**
 * Fichas que se colocan en el mapa: perfiles de operación (`perfil`) o un grafo de vínculos
 * (`grafo`). El contenido vive en el escenario y el punto solo lo referencia.
 */
export interface DocFields {
  /** Perfiles que muestra la ficha `perfil`, en orden. */
  profileIds?: string[];
  /** Grafo que muestra la ficha `grafo`. */
  chartId?: string;
  /** Ancho de la ficha en pantalla, en píxeles. */
  cardWidth?: number;
}

export interface UnitObject extends BaseObject, SymbolFields, ModelFields {
  kind: 'unit';
  type: UnitType;
  echelon: string;
  frames: Frames<PointFrame>;
}

export interface PointObject extends BaseObject, SymbolFields, DocFields {
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
  /** Perfiles de operación: personas relacionadas con la operación. */
  profiles?: Profile[];
  /** Grafos de análisis de vínculos. */
  charts?: LinkChart[];
  /** Aeronaves y drones modelados en el taller 3D. */
  models?: Model3D[];
  /**
   * Cuerpo humano realista (.glb) para las figuras de los perfiles: se adapta a la estatura,
   * el peso, el somatotipo y la piel de cada persona.
   */
  humanMesh?: CustomMesh;
  /**
   * Solo en archivos exportados: contenido de los adjuntos como data URL, por id.
   * Al importar se mueve a IndexedDB y desaparece del escenario.
   */
  mediaData?: Record<string, string>;
}
