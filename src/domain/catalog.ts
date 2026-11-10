import type {
  Effectiveness,
  FactionId,
  LineType,
  Mobility,
  PointType,
  Reinforcement,
  UnitType,
} from './types';
import { TASKS, TASK_IDS, type TaskGroup } from './tasks';

/**
 * Catálogos de simbología según el MFRE 1-02 «Términos y símbolos militares»
 * (Ejército Nacional, 2017) y la graficación estandarizada DIVFE (01MAR22).
 */

/** Marco de identidad estándar (MFRE 1-02, tabla 3-1). */
export type FactionShape = 'rect' | 'diamond' | 'square' | 'quatrefoil';

export interface FactionDef {
  name: string;
  /** Relleno del marco «a mano o computarizado» (tabla 3-3). */
  fill: string;
  /** Color de las medidas de control (puntos y trazos) sobre el mapa. */
  vivid: string;
  shape: FactionShape;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  azul: { name: 'Amigo', fill: '#00AEEF', vivid: '#2E9BFF', shape: 'rect' },
  roja: { name: 'Hostil', fill: '#ED1C24', vivid: '#FF3B3B', shape: 'diamond' },
  verde: { name: 'Neutral', fill: '#20896B', vivid: '#2FD07F', shape: 'square' },
  amarilla: { name: 'Desconocido', fill: '#FFF200', vivid: '#FFE23F', shape: 'quatrefoil' },
};

/**
 * Fuerzas propias y estructuras hostiles (graficación DIVFE). Cambian el color
 * de relleno del marco; la forma la sigue dando la identidad estándar.
 */
export interface ForceDef {
  id: string;
  name: string;
  /** Identidad a la que pertenece. */
  faction: FactionId;
  fill: string;
  /** Color del ícono dentro del marco. */
  ink: string;
}

export const FORCES: readonly ForceDef[] = [
  { id: 'ejc', name: 'Ejército Nacional (EJC)', faction: 'azul', fill: '#00AEEF', ink: '#000' },
  { id: 'arc', name: 'Armada Nacional (ARC)', faction: 'azul', fill: '#00FFFF', ink: '#000' },
  { id: 'fac', name: 'Fuerza Aérea (FAC)', faction: 'azul', fill: '#80DFFF', ink: '#000' },
  { id: 'ponal', name: 'Policía Nacional', faction: 'azul', fill: '#3366FF', ink: '#fff' },
  { id: 'go', name: 'Organización gubernamental', faction: 'azul', fill: '#3366FF', ink: '#fff' },
  { id: 'gao-residual', name: 'GAO residual', faction: 'roja', fill: '#FFFF00', ink: '#000' },
  { id: 'eln', name: 'ELN', faction: 'roja', fill: '#FF0000', ink: '#000' },
  { id: 'clan-golfo', name: 'Clan del Golfo', faction: 'roja', fill: '#0000FF', ink: '#fff' },
  { id: 'caparros', name: 'Caparros', faction: 'roja', fill: '#CC00CC', ink: '#000' },
  { id: 'pelusos', name: 'Pelusos', faction: 'roja', fill: '#00FF00', ink: '#000' },
];

export const forceById = (id: string | undefined): ForceDef | undefined =>
  id ? FORCES.find((f) => f.id === id) : undefined;

/** Fuerzas válidas para una identidad. */
export const forcesFor = (faction: FactionId): ForceDef[] =>
  FORCES.filter((f) => f.faction === faction);

/** Colores de relleno e ícono de un símbolo enmarcado. */
export function symbolColors(faction: FactionId, force?: string): { fill: string; ink: string } {
  const f = forceById(force);
  if (f && f.faction === faction) return { fill: f.fill, ink: f.ink };
  return { fill: FACTIONS[faction].fill, ink: '#000' };
}

/**
 * Escalones (campo B, tabla 4-9). Los valores son los del prototipo más los que
 * añade el manual: equipo o tripulación (Ø), cuerpo (XXX) y comando (++).
 */
export const ECHELONS: ReadonlyArray<readonly [string, string]> = [
  ['', 'Sin escalón'],
  ['Ø', 'Equipo o tripulación'],
  ['•', 'Escuadra'],
  ['••', 'Sección'],
  ['•••', 'Pelotón o destacamento'],
  ['I', 'Compañía, batería o tropa'],
  ['II', 'Batallón'],
  ['III', 'Regimiento o comando operativo'],
  ['X', 'Brigada'],
  ['XX', 'División'],
  ['XXX', 'Cuerpo'],
  ['++', 'Comando'],
];

/** Guion suave: permite partir nombres largos en la paleta. */
const SHY = '­';

export type UnitGroup = 'Armas y servicios' | 'Unidades especiales' | 'Otras fuerzas y GAO';

export interface UnitDef {
  name: string;
  group: UnitGroup;
  /** Texto por defecto del ícono para los tipos que lo usan. */
  iconText?: string;
}

export const UNITS: Record<UnitType, UnitDef> = {
  infanteria: { name: 'Infantería', group: 'Armas y servicios' },
  mecanizada: { name: 'Mecanizada', group: 'Armas y servicios' },
  blindados: { name: 'Blindados', group: 'Armas y servicios' },
  reconocimiento: { name: `Caballería / reconoci${SHY}miento`, group: 'Armas y servicios' },
  artilleria: { name: 'Artillería de campaña', group: 'Armas y servicios' },
  antiaerea: { name: 'Defensa antiaérea', group: 'Armas y servicios' },
  antitanque: { name: 'Antitanque', group: 'Armas y servicios' },
  morteros: { name: 'Morteros', group: 'Armas y servicios' },
  ingenieros: { name: 'Ingenieros', group: 'Armas y servicios' },
  comunicaciones: { name: `Comunica${SHY}ciones`, group: 'Armas y servicios' },
  inteligencia: { name: 'Inteligencia militar', group: 'Armas y servicios' },
  aviacion: { name: 'Aviación (ala rotatoria)', group: 'Armas y servicios' },
  'aviacion-fija': { name: 'Aviación (ala fija)', group: 'Armas y servicios' },
  sanidad: { name: 'Sanidad', group: 'Armas y servicios' },
  logistica: { name: 'Apoyo y servicios (ASPC)', group: 'Armas y servicios' },
  mantenimiento: { name: `Manteni${SHY}miento`, group: 'Armas y servicios' },
  transportes: { name: 'Transportes', group: 'Armas y servicios' },
  'policia-militar': { name: 'Policía militar', group: 'Armas y servicios' },
  vigilancia: { name: 'Vigilancia', group: 'Armas y servicios' },
  pc: { name: 'Puesto de mando', group: 'Armas y servicios' },
  especiales: { name: 'Fuerzas especiales', group: 'Unidades especiales' },
  'alta-montana': { name: 'Alta montaña', group: 'Unidades especiales' },
  gaula: { name: 'GAULA', group: 'Unidades especiales' },
  'energetico-vial': { name: 'Energético y vial', group: 'Unidades especiales' },
  narcotrafico: { name: `Contra narco${SHY}tráfico`, group: 'Unidades especiales' },
  mineria: { name: 'Contra minería ilegal', group: 'Unidades especiales' },
  desminado: { name: 'Desminado humanitario', group: 'Unidades especiales' },
  'accion-integral': { name: 'Acción integral (AID)', group: 'Unidades especiales' },
  nombre: { name: 'Unidad por nombre', group: 'Unidades especiales', iconText: 'DIVFE' },
  naval: { name: 'Fuerza naval (ARC)', group: 'Otras fuerzas y GAO' },
  'infanteria-marina': { name: 'Infantería de marina', group: 'Otras fuerzas y GAO' },
  policia: { name: 'Policía Nacional', group: 'Otras fuerzas y GAO' },
  'organizacion-gubernamental': {
    name: `Organización guberna${SHY}mental`,
    group: 'Otras fuerzas y GAO',
  },
  gao: { name: 'Estructura GAO', group: 'Otras fuerzas y GAO', iconText: 'R' },
  persona: { name: 'Persona / cabecilla', group: 'Otras fuerzas y GAO' },
};

/** Tipos cuyo ícono es un texto editable (campo «Texto del ícono»). */
export const usesIconText = (kind: 'unit' | 'point', type: string): boolean =>
  kind === 'unit'
    ? type === 'nombre' || type === 'gao'
    : POINTS[type as PointType]?.iconText !== undefined;

export const MOBILITY: ReadonlyArray<readonly [Mobility, string]> = [
  ['', 'Sin modificador'],
  ['asalto-aereo', 'Asalto aéreo'],
  ['aerotransportada', 'Aerotransportada'],
  ['anfibia', 'Anfibia'],
  ['fluvial', 'Fluvial'],
  ['montana', 'Montaña'],
  ['motorizado', 'Motorizado'],
  ['ruedas', 'Ruedas'],
  ['orugas', 'Autopropulsado / orugas'],
  ['animal', 'Animal de carga'],
];

export const REINFORCEMENT: ReadonlyArray<readonly [Reinforcement, string]> = [
  ['', 'Ninguno'],
  ['+', 'Reforzada (+)'],
  ['-', 'Reducida (−)'],
  ['±', 'Reforzada y reducida (±)'],
];

export const EFFECTIVENESS: ReadonlyArray<readonly [Effectiveness, string, string]> = [
  ['', 'Sin indicar', ''],
  ['FO', 'Completamente operacional', '#20896B'],
  ['BO', 'Básicamente operacional', '#FFF200'],
  ['EO', 'Escasamente operacional', '#ED1C24'],
  ['NO', 'No operacional', '#000000'],
];

export type PointGroup =
  'Objetivos y hechos' | 'Puntos de control' | 'Aéreos' | 'Instalaciones y lugares';

export interface PointDef {
  name: string;
  group: PointGroup;
  size: [number, number];
  anchor: [number, number];
  /** Etiqueta por defecto al colocarlo. */
  label: string;
  /** Texto por defecto dentro del símbolo; si existe, el texto es editable. */
  iconText?: string;
}

export const POINTS: Record<PointType, PointDef> = {
  objetivo: {
    name: 'Objetivo',
    group: 'Objetivos y hechos',
    size: [34, 34],
    anchor: [17, 17],
    label: '',
    iconText: '',
  },
  evento: {
    name: 'Combate',
    group: 'Objetivos y hechos',
    size: [34, 34],
    anchor: [17, 17],
    label: '',
  },
  campamento: {
    name: 'Campamento',
    group: 'Objetivos y hechos',
    size: [34, 34],
    anchor: [17, 17],
    label: '',
  },
  ied: {
    name: 'Artefacto explosivo (IED)',
    group: 'Objetivos y hechos',
    size: [34, 34],
    anchor: [17, 17],
    label: '',
  },
  drug: {
    name: 'Narcotráfico',
    group: 'Objetivos y hechos',
    size: [34, 34],
    anchor: [17, 17],
    label: '',
  },
  captura: {
    name: 'Captura',
    group: 'Objetivos y hechos',
    size: [34, 34],
    anchor: [17, 17],
    label: '',
  },
  control: {
    name: 'Punto de control',
    group: 'Puntos de control',
    size: [26, 34],
    anchor: [13, 34],
    label: '',
    iconText: '1',
  },
  seguridad: {
    name: 'Punto de seguridad',
    group: 'Puntos de control',
    size: [26, 34],
    anchor: [13, 34],
    label: '',
    iconText: 'PS',
  },
  insercion: {
    name: 'Punto de inserción',
    group: 'Puntos de control',
    size: [26, 34],
    anchor: [13, 34],
    label: '',
    iconText: 'PI',
  },
  decision: {
    name: 'Punto de decisión',
    group: 'Puntos de control',
    size: [34, 34],
    anchor: [17, 17],
    label: '',
    iconText: 'PD',
  },
  disloque: {
    name: 'Punto de disloque',
    group: 'Puntos de control',
    size: [26, 34],
    anchor: [13, 34],
    label: '',
    iconText: 'PT',
  },
  vigilancia: {
    name: 'Puesto de vigilancia',
    group: 'Puntos de control',
    size: [34, 30],
    anchor: [17, 28],
    label: '',
  },
  'vigilancia-tiro': {
    name: 'Puesto de vigilancia y tiro',
    group: 'Puntos de control',
    size: [34, 34],
    anchor: [17, 32],
    label: '',
  },
  pca: {
    name: 'Punto de control aéreo',
    group: 'Aéreos',
    size: [32, 32],
    anchor: [16, 16],
    label: '',
    iconText: '1',
  },
  zd: {
    name: 'Zona de desembarco',
    group: 'Aéreos',
    size: [40, 24],
    anchor: [20, 12],
    label: '',
    iconText: 'ZD1',
  },
  ze: {
    name: 'Zona de extracción',
    group: 'Aéreos',
    size: [40, 24],
    anchor: [20, 12],
    label: '',
    iconText: 'ZE',
  },
  rp: {
    name: 'Relief point (RP)',
    group: 'Aéreos',
    size: [28, 28],
    anchor: [14, 14],
    label: '',
    iconText: 'RP',
  },
  ip: {
    name: 'Punto inicial (IP)',
    group: 'Aéreos',
    size: [28, 28],
    anchor: [14, 14],
    label: '',
    iconText: 'IP',
  },
  coordinacion: {
    name: 'Punto de coordinación',
    group: 'Aéreos',
    size: [30, 30],
    anchor: [15, 15],
    label: '',
    iconText: '1',
  },
  base: {
    name: 'Base militar',
    group: 'Instalaciones y lugares',
    size: [36, 30],
    anchor: [18, 18],
    label: '',
  },
  'base-fac': {
    name: 'Base FAC',
    group: 'Instalaciones y lugares',
    size: [36, 30],
    anchor: [18, 18],
    label: '',
  },
  aeropuerto: {
    name: 'Aeropuerto',
    group: 'Instalaciones y lugares',
    size: [30, 30],
    anchor: [15, 15],
    label: '',
  },
  antena: {
    name: 'Antena / repetidor',
    group: 'Instalaciones y lugares',
    size: [30, 30],
    anchor: [15, 26],
    label: '',
  },
  lugar: {
    name: 'Lugar',
    group: 'Instalaciones y lugares',
    size: [18, 18],
    anchor: [9, 9],
    label: '',
  },
  punto: {
    name: 'Punto',
    group: 'Instalaciones y lugares',
    size: [18, 18],
    anchor: [9, 9],
    label: '',
  },
  texto: {
    name: 'Rótulo de texto',
    group: 'Instalaciones y lugares',
    size: [0, 0],
    anchor: [0, 0],
    label: 'Rótulo',
  },
};

export type LineGroup = 'Trazos' | 'Áreas' | TaskGroup;

export interface LineDef {
  name: string;
  group: LineGroup;
  /** Mínimo de vértices para terminar el trazo. */
  min: number;
  /** Máximo de vértices: al alcanzarlo el trazo se termina solo. */
  max?: number;
  /** Sigla del área (AO, ANI, ABI). */
  area?: string;
}

const BASE_LINES = {
  frente: { name: 'Línea de frente', group: 'Trazos', min: 2 },
  eje: { name: 'Eje de avance', group: 'Trazos', min: 2 },
  ruta: { name: 'Ruta', group: 'Trazos', min: 2 },
  zona: { name: 'Zona / área', group: 'Áreas', min: 3 },
  ao: { name: 'Área de operaciones', group: 'Áreas', min: 3, area: 'AO' },
  ani: { name: 'Área nombrada de interés', group: 'Áreas', min: 3, area: 'ANI' },
  abi: { name: 'Área blanco de interés', group: 'Áreas', min: 3, area: 'ABI' },
} satisfies Record<string, LineDef>;

export const LINES = {
  ...BASE_LINES,
  ...Object.fromEntries(
    TASK_IDS.map((id) => [id, { name: TASKS[id].name, group: TASKS[id].group, min: 2, max: 2 }]),
  ),
} as Record<LineType, LineDef>;

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
