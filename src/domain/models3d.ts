/**
 * Taller 3D: aeronaves, vehículos terrestres, embarcaciones e infantería paramétricos. Un
 * modelo es una receta pequeña (tipo base, variante, medidas, colores, cantidad, carga) que se
 * convierte en piezas geométricas (`model3d/parts`). Esta parte es pura: no depende de
 * three.js, así que se puede probar y guardar en el JSON.
 *
 * Ejes del modelo, en metros: x hacia el frente, y hacia arriba, z hacia la derecha. Las
 * aeronaves se centran en el origen; los vehículos y la infantería apoyan en y = 0 y las
 * embarcaciones tienen la línea de flotación en y = 0.
 */
import { uid } from './id';
import type { FacialHair, HairStyle, Sex, Somatotype } from './morphology';
import type { UnitType } from './types';
import { helicopterParts, jetParts, multirotorParts, planeParts } from './model3d/air';
import {
  apcParts,
  artilleryParts,
  lightVehicleParts,
  pickupParts,
  tankParts,
  truckParts,
} from './model3d/ground';
import { infantryParts } from './model3d/people';
import { boatParts, shipParts, submarineParts } from './model3d/sea';
import { partsBounds, type Part } from './model3d/parts';

export type { Part, Vec3 } from './model3d/parts';
export { partsBounds } from './model3d/parts';

export const MODEL_BASES = [
  'avion',
  'caza',
  'helicoptero',
  'dron-multirrotor',
  'dron-ala-fija',
  'tanque',
  'blindado',
  'camion',
  'camioneta',
  'vehiculo-ligero',
  'artilleria',
  'lancha',
  'buque',
  'submarino',
  'soldados',
] as const;
export type ModelBase = (typeof MODEL_BASES)[number];

export const TAIL_TYPES = ['convencional', 'en-t', 'en-v'] as const;
export type TailType = (typeof TAIL_TYPES)[number];

export const PAYLOADS = [
  'ninguna',
  'camara',
  'misiles',
  'carga',
  'ametralladora',
  'canon',
  'carpa',
  'cisterna',
  'lanzacohetes',
  'radar',
  'contenedor',
  'helipuerto',
  'fusil',
  'antitanque',
  'mortero',
] as const;
export type Payload = (typeof PAYLOADS)[number];

export interface Model3D {
  id: string;
  name: string;
  base: ModelBase;
  /** Variante del tipo (ver `BASE_DEFS[base].variants`); vacía si no tiene. */
  variant: string;
  /** Color principal: fuselaje, casco, carrocería o uniforme. */
  color: string;
  /** Color de detalles: motores, rines, lona, chaleco y casco. */
  accent: string;
  /** Largo, eslora o estatura, en metros. */
  length: number;
  /** Envergadura, diámetro del rotor, ancho, manga o separación entre soldados, en metros. */
  span: number;
  /** Cantidad según el tipo: motores, rotores, ejes, ruedas de rodaje o soldados. */
  engines: number;
  /** Palas por hélice o rotor (aeronaves). */
  blades: number;
  tail: TailType;
  /** Carga o armamento (las opciones dependen del tipo). */
  payload: Payload;
  /** Alas altas (transporte) o bajas (ataque). Solo aviones. */
  highWing: boolean;
  /** Matrícula o código pintado (solo informativo). */
  code: string;
  /**
   * Modelo propio (.glb / .gltf) que reemplaza a las piezas paramétricas. El archivo vive en el
   * almacén de adjuntos con este id; las medidas del modelo lo escalan.
   */
  mesh?: CustomMesh;
  /** Morfología de la figura (infantería): proporciones, piel, cabello y ropa. */
  body?: ModelBody;
}

/** Rasgos físicos de una figura humana; la estatura es `length`. */
export interface ModelBody {
  sexo: Sex | '';
  /** Peso en kg (0 = medio). */
  peso: number;
  somatotipo: Somatotype | '';
  piel: string;
  cabello: string;
  peinado: HairStyle;
  barba: FacialHair;
  /** Ropa civil en lugar de uniforme y equipo. */
  civil: boolean;
}

/** Archivo 3D propio: un modelo hecho en Blender, descargado de una biblioteca, etc. */
export interface CustomMesh {
  /**
   * Id del archivo en el almacén de adjuntos (IndexedDB), o ruta de un modelo incluido en la
   * app (empieza por «/», p. ej. `/models/humanos/hombre.glb`).
   */
  id: string;
  /** Nombre original del archivo. */
  name: string;
  /** Giro, en grados, para que el frente del archivo mire hacia la nariz o proa (+x). */
  yaw: number;
  /** Animación que se reproduce (vacía = la primera de caminar o reposo, si hay). */
  anim: string;
  /** Piezas que se suman al modelo, en su mismo sistema de coordenadas (cabello, barba…). */
  parts?: string[];
  /** Tono de piel medio de la textura del archivo, para teñirla al tono de cada persona. */
  skinRef?: string;
  /** Color medio de la textura del cabello, para teñirla. */
  hairRef?: string;
}

/** El archivo es un modelo incluido en la app (no un adjunto del usuario). */
export const isBuiltinMesh = (id: string): boolean => id.startsWith('/');

/** Extensiones de modelo 3D que se pueden cargar. */
export const MESH_ACCEPT = '.glb,.gltf,model/gltf-binary,model/gltf+json';

/** Dominio del modelo: define dónde se apoya y cómo se agrupa en el taller. */
export type ModelDomain = 'aire' | 'tierra' | 'mar' | 'personal';

export const DOMAIN_NAMES: Record<ModelDomain, string> = {
  aire: 'Aire',
  tierra: 'Tierra',
  mar: 'Mar y río',
  personal: 'Infantería',
};

interface Range {
  min: number;
  max: number;
  step: number;
}

export interface BaseDef {
  name: string;
  domain: ModelDomain;
  /** Rótulos de las medidas. */
  lengthLabel: string;
  spanLabel: string;
  length: Range;
  span: Range;
  /** Control de cantidad (`engines`); `null` si no aplica. */
  count: (Range & { label: string }) | null;
  /** Palas por hélice; solo aeronaves con hélices. */
  blades: boolean;
  tails: readonly TailType[] | null;
  wings: boolean;
  payloadLabel: string;
  payloads: readonly Payload[];
  variants: { label: string; options: Readonly<Record<string, string>> } | null;
  /** Unidad (símbolo) con la que se coloca en el mapa. */
  unit: UnitType;
  /** Altura de vuelo típica sobre el terreno, en metros (0 en superficie). */
  altitude: number;
}

const AIR_SMALL: Range = { min: 0.3, max: 8, step: 0.1 };
const AIR_BIG: Range = { min: 3, max: 70, step: 0.5 };

export const BASE_DEFS: Record<ModelBase, BaseDef> = {
  avion: {
    name: 'Avión de hélice',
    domain: 'aire',
    lengthLabel: 'Largo',
    spanLabel: 'Envergadura',
    length: AIR_BIG,
    span: AIR_BIG,
    count: { min: 1, max: 4, step: 1, label: 'Motores' },
    blades: true,
    tails: TAIL_TYPES,
    wings: true,
    payloadLabel: 'Carga',
    payloads: ['ninguna', 'camara', 'misiles', 'carga'],
    variants: null,
    unit: 'aviacion-fija',
    altitude: 600,
  },
  caza: {
    name: 'Avión a reacción',
    domain: 'aire',
    lengthLabel: 'Largo',
    spanLabel: 'Envergadura',
    length: AIR_BIG,
    span: AIR_BIG,
    count: { min: 1, max: 2, step: 1, label: 'Turbinas' },
    blades: false,
    tails: ['convencional', 'en-v'],
    wings: false,
    payloadLabel: 'Armamento',
    payloads: ['ninguna', 'misiles', 'carga'],
    variants: null,
    unit: 'aviacion-fija',
    altitude: 1500,
  },
  helicoptero: {
    name: 'Helicóptero',
    domain: 'aire',
    lengthLabel: 'Largo',
    spanLabel: 'Diámetro del rotor',
    length: AIR_BIG,
    span: AIR_BIG,
    count: { min: 1, max: 2, step: 1, label: 'Turbinas' },
    blades: true,
    tails: null,
    wings: false,
    payloadLabel: 'Carga',
    payloads: ['ninguna', 'camara', 'misiles', 'carga'],
    variants: { label: 'Tipo', options: { utilitario: 'Utilitario', ataque: 'De ataque' } },
    unit: 'aviacion',
    altitude: 150,
  },
  'dron-multirrotor': {
    name: 'Dron multirrotor',
    domain: 'aire',
    lengthLabel: 'Largo',
    spanLabel: 'Ancho',
    length: AIR_SMALL,
    span: AIR_SMALL,
    count: { min: 4, max: 8, step: 2, label: 'Rotores' },
    blades: true,
    tails: null,
    wings: false,
    payloadLabel: 'Carga',
    payloads: ['ninguna', 'camara', 'misiles', 'carga'],
    variants: null,
    unit: 'vigilancia',
    altitude: 80,
  },
  'dron-ala-fija': {
    name: 'Dron de ala fija',
    domain: 'aire',
    lengthLabel: 'Largo',
    spanLabel: 'Envergadura',
    length: { min: 0.5, max: 20, step: 0.1 },
    span: { min: 0.5, max: 30, step: 0.1 },
    count: { min: 1, max: 2, step: 1, label: 'Hélices' },
    blades: true,
    tails: TAIL_TYPES,
    wings: true,
    payloadLabel: 'Carga',
    payloads: ['ninguna', 'camara', 'misiles', 'carga'],
    variants: null,
    unit: 'vigilancia',
    altitude: 300,
  },
  tanque: {
    name: 'Carro de combate',
    domain: 'tierra',
    lengthLabel: 'Largo (con cañón)',
    spanLabel: 'Ancho',
    length: { min: 5, max: 13, step: 0.1 },
    span: { min: 2.5, max: 4.2, step: 0.05 },
    count: { min: 5, max: 7, step: 1, label: 'Ruedas de rodaje por lado' },
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Armamento adicional',
    payloads: ['ninguna', 'ametralladora', 'misiles'],
    variants: null,
    unit: 'blindados',
    altitude: 0,
  },
  blindado: {
    name: 'Blindado de transporte',
    domain: 'tierra',
    lengthLabel: 'Largo',
    spanLabel: 'Ancho',
    length: { min: 4.5, max: 10, step: 0.1 },
    span: { min: 2.2, max: 3.4, step: 0.05 },
    count: { min: 2, max: 4, step: 1, label: 'Ejes (o rodillos − 2 en orugas)' },
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Armamento',
    payloads: ['ninguna', 'ametralladora', 'canon', 'misiles'],
    variants: { label: 'Tren', options: { ruedas: 'Ruedas', orugas: 'Orugas' } },
    unit: 'mecanizada',
    altitude: 0,
  },
  camion: {
    name: 'Camión',
    domain: 'tierra',
    lengthLabel: 'Largo',
    spanLabel: 'Ancho',
    length: { min: 5, max: 14, step: 0.1 },
    span: { min: 2, max: 2.8, step: 0.05 },
    count: { min: 2, max: 4, step: 1, label: 'Ejes' },
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Carrocería',
    payloads: ['carpa', 'carga', 'cisterna', 'lanzacohetes', 'radar', 'contenedor'],
    variants: null,
    unit: 'transportes',
    altitude: 0,
  },
  camioneta: {
    name: 'Camioneta',
    domain: 'tierra',
    lengthLabel: 'Largo',
    spanLabel: 'Ancho',
    length: { min: 4, max: 6.5, step: 0.05 },
    span: { min: 1.6, max: 2.2, step: 0.05 },
    count: null,
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'En el platón',
    payloads: ['ninguna', 'ametralladora', 'carga'],
    variants: { label: 'Cabina', options: { doble: 'Doble cabina', sencilla: 'Sencilla' } },
    unit: 'transportes',
    altitude: 0,
  },
  'vehiculo-ligero': {
    name: 'Vehículo táctico ligero',
    domain: 'tierra',
    lengthLabel: 'Largo',
    spanLabel: 'Ancho',
    length: { min: 3.5, max: 6.5, step: 0.05 },
    span: { min: 1.6, max: 2.5, step: 0.05 },
    count: null,
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Armamento',
    payloads: ['ninguna', 'ametralladora', 'misiles'],
    variants: { label: 'Carrocería', options: { cerrado: 'Cerrada', abierto: 'Abierta' } },
    unit: 'reconocimiento',
    altitude: 0,
  },
  artilleria: {
    name: 'Artillería',
    domain: 'tierra',
    lengthLabel: 'Largo',
    spanLabel: 'Ancho',
    length: { min: 5, max: 14, step: 0.1 },
    span: { min: 2, max: 3.6, step: 0.05 },
    count: { min: 5, max: 7, step: 1, label: 'Ruedas de rodaje (autopropulsada)' },
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Armamento adicional',
    payloads: ['ninguna', 'ametralladora'],
    variants: {
      label: 'Tipo',
      options: { remolcada: 'Obús remolcado', autopropulsada: 'Obús autopropulsado' },
    },
    unit: 'artilleria',
    altitude: 0,
  },
  lancha: {
    name: 'Lancha',
    domain: 'mar',
    lengthLabel: 'Eslora',
    spanLabel: 'Manga',
    length: { min: 4, max: 30, step: 0.1 },
    span: { min: 1.5, max: 7, step: 0.05 },
    count: { min: 1, max: 3, step: 1, label: 'Motores fuera de borda' },
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Armamento',
    payloads: ['ninguna', 'ametralladora'],
    variants: {
      label: 'Tipo',
      options: { patrullera: 'Patrullera con cabina', rigida: 'Bote semirrígido' },
    },
    unit: 'naval',
    altitude: 0,
  },
  buque: {
    name: 'Buque',
    domain: 'mar',
    lengthLabel: 'Eslora',
    spanLabel: 'Manga',
    length: { min: 40, max: 200, step: 1 },
    span: { min: 6, max: 32, step: 0.5 },
    count: null,
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Armamento',
    payloads: ['canon', 'misiles', 'helipuerto'],
    variants: {
      label: 'Tipo',
      options: { combate: 'De combate (fragata)', desembarco: 'Anfibio de desembarco' },
    },
    unit: 'naval',
    altitude: 0,
  },
  submarino: {
    name: 'Submarino',
    domain: 'mar',
    lengthLabel: 'Eslora',
    spanLabel: 'Diámetro',
    length: { min: 20, max: 120, step: 1 },
    span: { min: 3, max: 12, step: 0.1 },
    count: null,
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Carga',
    payloads: ['ninguna'],
    variants: null,
    unit: 'naval',
    altitude: 0,
  },
  soldados: {
    name: 'Infantería',
    domain: 'personal',
    lengthLabel: 'Estatura',
    spanLabel: 'Separación',
    length: { min: 1.5, max: 2, step: 0.01 },
    span: { min: 1, max: 10, step: 0.5 },
    count: { min: 1, max: 12, step: 1, label: 'Soldados' },
    blades: false,
    tails: null,
    wings: false,
    payloadLabel: 'Armamento (especial: 1 de cada 3)',
    payloads: ['fusil', 'ametralladora', 'antitanque', 'mortero', 'ninguna'],
    variants: {
      label: 'Formación',
      options: { cuna: 'Cuña', linea: 'Línea', columna: 'Columna', fila: 'Fila india' },
    },
    unit: 'infanteria',
    altitude: 0,
  },
};

export const TAIL_NAMES: Record<TailType, string> = {
  convencional: 'Convencional',
  'en-t': 'En T',
  'en-v': 'En V (doble deriva)',
};

export const PAYLOAD_NAMES: Record<Payload, string> = {
  ninguna: 'Ninguna',
  camara: 'Cámara / sensor',
  misiles: 'Misiles',
  carga: 'Carga',
  ametralladora: 'Ametralladora',
  canon: 'Cañón',
  carpa: 'Carpa para tropas',
  cisterna: 'Cisterna',
  lanzacohetes: 'Lanzacohetes múltiple',
  radar: 'Radar',
  contenedor: 'Contenedor / taller',
  helipuerto: 'Misiles y helipuerto',
  fusil: 'Solo fusiles',
  antitanque: 'Lanzador antitanque',
  mortero: 'Mortero',
};

type Preset = Omit<Model3D, 'id'>;

const P = (p: Partial<Preset> & Pick<Preset, 'name' | 'base' | 'length' | 'span'>): Preset => {
  const def = BASE_DEFS[p.base];
  return {
    variant: def.variants ? Object.keys(def.variants.options)[0]! : '',
    color: '#5d6b4a',
    accent: '#2b3440',
    engines: def.count?.min ?? 1,
    blades: 2,
    tail: 'convencional',
    payload: def.payloads[0]!,
    highWing: false,
    code: '',
    ...p,
  };
};

/** Modelos de partida genéricos (no reproducen ningún equipo concreto). */
export const PRESETS: readonly Preset[] = [
  // Aire.
  P({
    name: 'Avión de transporte',
    base: 'avion',
    color: '#8a949c',
    length: 30,
    span: 33,
    engines: 4,
    blades: 4,
    tail: 'en-t',
    highWing: true,
  }),
  P({
    name: 'Avión de ataque ligero',
    base: 'avion',
    length: 11,
    span: 11,
    blades: 4,
    payload: 'misiles',
    accent: '#1c232b',
  }),
  P({
    name: 'Caza a reacción',
    base: 'caza',
    color: '#7d8791',
    length: 16,
    span: 10,
    engines: 1,
    payload: 'misiles',
  }),
  P({
    name: 'Caza bimotor',
    base: 'caza',
    color: '#6f7a80',
    length: 19,
    span: 13,
    engines: 2,
    tail: 'en-v',
    payload: 'misiles',
  }),
  P({
    name: 'Helicóptero utilitario',
    base: 'helicoptero',
    color: '#4f5d3f',
    accent: '#1a1f24',
    length: 19,
    span: 16,
    engines: 2,
    blades: 4,
  }),
  P({
    name: 'Helicóptero de ataque',
    base: 'helicoptero',
    variant: 'ataque',
    color: '#4b5340',
    accent: '#1a1f24',
    length: 17,
    span: 14,
    engines: 2,
    blades: 4,
    payload: 'misiles',
  }),
  P({
    name: 'Dron cuadricóptero',
    base: 'dron-multirrotor',
    color: '#30353b',
    accent: '#d8b46a',
    length: 1.2,
    span: 1.2,
    engines: 4,
    payload: 'camara',
  }),
  P({
    name: 'Dron hexacóptero de carga',
    base: 'dron-multirrotor',
    color: '#3a3f2e',
    accent: '#c9c2a0',
    length: 2.2,
    span: 2.2,
    engines: 6,
    payload: 'carga',
  }),
  P({
    name: 'Dron de ala fija',
    base: 'dron-ala-fija',
    color: '#c9ced3',
    accent: '#3a4048',
    length: 4,
    span: 7,
    tail: 'en-v',
    payload: 'camara',
    highWing: true,
  }),
  P({
    name: 'Dron de altura media (armado)',
    base: 'dron-ala-fija',
    color: '#aab1b8',
    accent: '#3a4048',
    length: 11,
    span: 20,
    blades: 3,
    tail: 'en-v',
    payload: 'misiles',
  }),
  // Tierra.
  P({
    name: 'Carro de combate',
    base: 'tanque',
    color: '#5a6345',
    accent: '#3a3f2e',
    length: 9.5,
    span: 3.6,
    engines: 6,
    payload: 'ametralladora',
  }),
  P({
    name: 'Blindado 8×8',
    base: 'blindado',
    color: '#5d6b4a',
    accent: '#3a3f2e',
    length: 8,
    span: 2.9,
    engines: 4,
    payload: 'canon',
  }),
  P({
    name: 'Blindado 4×4',
    base: 'blindado',
    color: '#6b6e52',
    accent: '#3a3f2e',
    length: 6,
    span: 2.5,
    engines: 2,
    payload: 'ametralladora',
  }),
  P({
    name: 'Transporte de orugas',
    base: 'blindado',
    variant: 'orugas',
    color: '#5d6b4a',
    accent: '#3a3f2e',
    length: 6.8,
    span: 2.9,
    engines: 3,
    payload: 'ametralladora',
  }),
  P({
    name: 'Camión de tropas',
    base: 'camion',
    color: '#55613f',
    accent: '#6b6a4c',
    length: 8,
    span: 2.5,
    engines: 3,
    payload: 'carpa',
  }),
  P({
    name: 'Camión cisterna',
    base: 'camion',
    color: '#55613f',
    accent: '#7f8670',
    length: 8.5,
    span: 2.5,
    engines: 3,
    payload: 'cisterna',
  }),
  P({
    name: 'Lanzacohetes múltiple',
    base: 'camion',
    color: '#5a6345',
    accent: '#4a5238',
    length: 9,
    span: 2.5,
    engines: 3,
    payload: 'lanzacohetes',
  }),
  P({
    name: 'Camión radar antiaéreo',
    base: 'camion',
    color: '#5a6345',
    accent: '#6e7552',
    length: 9,
    span: 2.5,
    engines: 3,
    payload: 'radar',
  }),
  P({
    name: 'Camioneta pick-up',
    base: 'camioneta',
    color: '#d9dcdf',
    accent: '#8a8f96',
    length: 5.3,
    span: 1.9,
  }),
  P({
    name: 'Camioneta artillada',
    base: 'camioneta',
    color: '#8a7a5c',
    accent: '#3a3a36',
    length: 5.3,
    span: 1.9,
    payload: 'ametralladora',
  }),
  P({
    name: 'Vehículo táctico ligero',
    base: 'vehiculo-ligero',
    color: '#6b6e52',
    accent: '#3a3f2e',
    length: 4.9,
    span: 2.2,
    payload: 'ametralladora',
  }),
  P({
    name: 'Obús remolcado',
    base: 'artilleria',
    color: '#5a6345',
    accent: '#3a3f2e',
    length: 9,
    span: 2.6,
  }),
  P({
    name: 'Obús autopropulsado',
    base: 'artilleria',
    variant: 'autopropulsada',
    color: '#5a6345',
    accent: '#3a3f2e',
    length: 10,
    span: 3.3,
    engines: 6,
    payload: 'ametralladora',
  }),
  // Mar y río.
  P({
    name: 'Lancha patrullera de río',
    base: 'lancha',
    color: '#4f5b4a',
    accent: '#2a3038',
    length: 12,
    span: 3,
    engines: 2,
    payload: 'ametralladora',
  }),
  P({
    name: 'Bote de asalto',
    base: 'lancha',
    variant: 'rigida',
    color: '#30353b',
    accent: '#4a5058',
    length: 8,
    span: 2.8,
    engines: 2,
  }),
  P({
    name: 'Fragata',
    base: 'buque',
    color: '#8c949b',
    accent: '#7a2f2f',
    length: 110,
    span: 14,
    payload: 'helipuerto',
  }),
  P({
    name: 'Buque de desembarco',
    base: 'buque',
    variant: 'desembarco',
    color: '#8c949b',
    accent: '#7a2f2f',
    length: 150,
    span: 24,
  }),
  P({
    name: 'Submarino',
    base: 'submarino',
    color: '#2b2f33',
    accent: '#1d2024',
    length: 60,
    span: 6.5,
  }),
  // Infantería.
  P({
    name: 'Soldado',
    base: 'soldados',
    color: '#5b6146',
    accent: '#3b3f2c',
    length: 1.75,
    span: 3,
    engines: 1,
  }),
  P({
    name: 'Escuadra de fusileros',
    base: 'soldados',
    color: '#5b6146',
    accent: '#3b3f2c',
    length: 1.75,
    span: 4,
    engines: 9,
    payload: 'ametralladora',
  }),
  P({
    name: 'Equipo antitanque',
    base: 'soldados',
    variant: 'linea',
    color: '#5b6146',
    accent: '#3b3f2c',
    length: 1.75,
    span: 3,
    engines: 3,
    payload: 'antitanque',
  }),
  P({
    name: 'Patrulla en fila',
    base: 'soldados',
    variant: 'fila',
    color: '#4d5a3c',
    accent: '#2f3526',
    length: 1.75,
    span: 5,
    engines: 6,
  }),
];

export const domainOf = (base: ModelBase): ModelDomain => BASE_DEFS[base].domain;

export function newModel(preset: Preset = PRESETS[0]!): Model3D {
  return { ...preset, id: 'md' + uid() };
}

/** Corrige valores fuera de rango (p. ej. al importar un JSON editado a mano). */
export function normalizeModel(m: Model3D): Model3D {
  const def = BASE_DEFS[m.base] ?? BASE_DEFS.avion;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
  let engines = def.count ? clamp(Math.round(m.engines), def.count.min, def.count.max) : 1;
  if (def.count?.step === 2) engines -= (engines - def.count.min) % 2;
  const variants = def.variants ? Object.keys(def.variants.options) : [];
  return {
    ...m,
    variant: variants.length ? (variants.includes(m.variant) ? m.variant : variants[0]!) : '',
    length: clamp(m.length, 0.2, 250),
    span: clamp(m.span, 0.2, 100),
    engines,
    blades: clamp(Math.round(m.blades), 2, 6),
    tail: def.tails && !def.tails.includes(m.tail) ? def.tails[0]! : m.tail,
    payload: def.payloads.includes(m.payload) ? m.payload : def.payloads[0]!,
  };
}

/** Piezas del modelo, en metros. */
export function modelParts(m: Model3D): Part[] {
  const n = normalizeModel(m);
  switch (n.base) {
    case 'avion':
      return planeParts(n, false);
    case 'dron-ala-fija':
      return planeParts(n, true);
    case 'caza':
      return jetParts(n);
    case 'helicoptero':
      return helicopterParts(n);
    case 'dron-multirrotor':
      return multirotorParts(n);
    case 'tanque':
      return tankParts(n);
    case 'blindado':
      return apcParts(n);
    case 'camion':
      return truckParts(n);
    case 'camioneta':
      return pickupParts(n);
    case 'vehiculo-ligero':
      return lightVehicleParts(n);
    case 'artilleria':
      return artilleryParts(n);
    case 'lancha':
      return boatParts(n);
    case 'buque':
      return shipParts(n);
    case 'submarino':
      return submarineParts(n);
    case 'soldados':
      return infantryParts(n);
  }
}

const sizeCache = new WeakMap<Model3D, number>();

/** Mayor dimensión horizontal del modelo (para encuadrar la cámara o escalarlo en el mapa). */
export function modelSize(m: Model3D): number {
  let s = sizeCache.get(m);
  if (s == null) {
    const b = partsBounds(modelParts(m));
    s = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2], b.max[1] - b.min[1], 0.1);
    sizeCache.set(m, s);
  }
  return s;
}

/** Altura de vuelo típica sobre el terreno, en metros, según el tipo (0 en superficie). */
export const DEFAULT_ALTITUDE = Object.fromEntries(
  MODEL_BASES.map((b) => [b, BASE_DEFS[b].altitude]),
) as Record<ModelBase, number>;

/**
 * Rumbo (radianes, 0 = norte, sentido horario) entre dos posiciones [lat, lng], o `null` si
 * no hay desplazamiento apreciable.
 */
export function headingBetween(a: [number, number], b: [number, number]): number | null {
  const dy = b[0] - a[0];
  const dx = (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180);
  if (Math.hypot(dx, dy) < 1e-7) return null;
  return Math.atan2(dx, dy);
}
