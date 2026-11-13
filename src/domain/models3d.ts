/**
 * Taller 3D: aeronaves y drones paramétricos. Un modelo es una receta pequeña (tipo base,
 * medidas, colores, motores, cola, carga) que se convierte en piezas geométricas simples.
 * Esta parte es pura: no depende de three.js, así que se puede probar y guardar en el JSON.
 *
 * Ejes del modelo, en metros: x hacia la nariz, y hacia arriba, z hacia el ala derecha.
 */
import { uid } from './id';

export const MODEL_BASES = ['avion', 'helicoptero', 'dron-multirrotor', 'dron-ala-fija'] as const;
export type ModelBase = (typeof MODEL_BASES)[number];

export const TAIL_TYPES = ['convencional', 'en-t', 'en-v'] as const;
export type TailType = (typeof TAIL_TYPES)[number];

export const PAYLOADS = ['ninguna', 'camara', 'misiles', 'carga'] as const;
export type Payload = (typeof PAYLOADS)[number];

export interface Model3D {
  id: string;
  name: string;
  base: ModelBase;
  /** Color del fuselaje. */
  color: string;
  /** Color de detalles: cabina, motores, rotores. */
  accent: string;
  /** Longitud total, en metros. */
  length: number;
  /** Envergadura (alas) o diámetro del rotor principal, en metros. */
  span: number;
  /** Motores del avión (1 a 4) o rotores del multirrotor (4, 6 u 8). */
  engines: number;
  /** Palas del rotor principal del helicóptero (2 a 6). */
  blades: number;
  tail: TailType;
  payload: Payload;
  /** Alas altas (transporte) o bajas (ataque). */
  highWing: boolean;
  /** Matrícula o código pintado (solo informativo). */
  code: string;
}

export const BASE_DEFS: Record<
  ModelBase,
  { name: string; engines: { min: number; max: number; step: number; label: string } }
> = {
  avion: { name: 'Avión', engines: { min: 1, max: 4, step: 1, label: 'Motores' } },
  helicoptero: { name: 'Helicóptero', engines: { min: 1, max: 2, step: 1, label: 'Turbinas' } },
  'dron-multirrotor': {
    name: 'Dron multirrotor',
    engines: { min: 4, max: 8, step: 2, label: 'Rotores' },
  },
  'dron-ala-fija': {
    name: 'Dron de ala fija',
    engines: { min: 1, max: 2, step: 1, label: 'Hélices' },
  },
};

export const TAIL_NAMES: Record<TailType, string> = {
  convencional: 'Convencional',
  'en-t': 'En T',
  'en-v': 'En V',
};

export const PAYLOAD_NAMES: Record<Payload, string> = {
  ninguna: 'Ninguna',
  camara: 'Cámara / sensor',
  misiles: 'Armamento bajo las alas',
  carga: 'Contenedor de carga',
};

/** Modelos de partida genéricos (no reproducen ninguna aeronave concreta). */
export const PRESETS: ReadonlyArray<Omit<Model3D, 'id'>> = [
  {
    name: 'Avión de transporte',
    base: 'avion',
    color: '#8a949c',
    accent: '#2b3440',
    length: 30,
    span: 33,
    engines: 4,
    blades: 4,
    tail: 'en-t',
    payload: 'ninguna',
    highWing: true,
    code: '',
  },
  {
    name: 'Avión de ataque ligero',
    base: 'avion',
    color: '#5d6b4a',
    accent: '#1c232b',
    length: 11,
    span: 11,
    engines: 1,
    blades: 4,
    tail: 'convencional',
    payload: 'misiles',
    highWing: false,
    code: '',
  },
  {
    name: 'Helicóptero utilitario',
    base: 'helicoptero',
    color: '#4f5d3f',
    accent: '#1a1f24',
    length: 19,
    span: 16,
    engines: 2,
    blades: 4,
    tail: 'convencional',
    payload: 'ninguna',
    highWing: false,
    code: '',
  },
  {
    name: 'Dron cuadricóptero',
    base: 'dron-multirrotor',
    color: '#30353b',
    accent: '#d8b46a',
    length: 1.2,
    span: 1.2,
    engines: 4,
    blades: 2,
    tail: 'convencional',
    payload: 'camara',
    highWing: false,
    code: '',
  },
  {
    name: 'Dron de ala fija',
    base: 'dron-ala-fija',
    color: '#c9ced3',
    accent: '#3a4048',
    length: 4,
    span: 7,
    engines: 1,
    blades: 2,
    tail: 'en-v',
    payload: 'camara',
    highWing: true,
    code: '',
  },
];

export function newModel(preset: Omit<Model3D, 'id'> = PRESETS[0]!): Model3D {
  return { ...preset, id: 'md' + uid() };
}

/** Corrige valores fuera de rango (p. ej. al importar un JSON editado a mano). */
export function normalizeModel(m: Model3D): Model3D {
  const e = BASE_DEFS[m.base].engines;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  let engines = clamp(Math.round(m.engines), e.min, e.max);
  if (e.step === 2) engines -= (engines - e.min) % 2;
  return {
    ...m,
    length: clamp(m.length, 0.2, 80),
    span: clamp(m.span, 0.2, 80),
    engines,
    blades: clamp(Math.round(m.blades), 2, 6),
  };
}

// ---------------------------------------------------------------- piezas

export type Vec3 = [number, number, number];

interface PartBase {
  pos: Vec3;
  /** Giro en radianes (orden XYZ). */
  rot?: Vec3;
  color: string;
  opacity?: number;
}

/**
 * Piezas geométricas:
 * - `box`: caja de medidas `size`.
 * - `cyl`: cilindro (o cono si `r2` es 0) de largo `len` a lo largo de `axis`.
 * - `ellipsoid`: esfera escalada a los diámetros `size`.
 * - `rotor`: disco translúcido con `blades` palas que gira sobre `axis`.
 */
export type Part =
  | (PartBase & { shape: 'box'; size: Vec3 })
  | (PartBase & { shape: 'cyl'; r: number; r2?: number; len: number; axis: 'x' | 'y' | 'z' })
  | (PartBase & { shape: 'ellipsoid'; size: Vec3 })
  | (PartBase & { shape: 'rotor'; r: number; blades: number; axis: 'x' | 'y' | 'z' });

const GLASS = '#1d2a36';
const PROP = '#20252b';

function planeParts(m: Model3D, drone: boolean): Part[] {
  const L = m.length;
  const S = m.span;
  const r = L * (drone ? 0.045 : 0.06);
  const parts: Part[] = [];
  // Fuselaje, nariz y cono de cola.
  parts.push({ shape: 'cyl', r, len: L * 0.7, axis: 'x', pos: [0.02 * L, 0, 0], color: m.color });
  parts.push({
    shape: 'cyl',
    r,
    r2: r * 0.25,
    len: L * 0.16,
    axis: 'x',
    pos: [0.45 * L, 0, 0],
    color: m.color,
  });
  parts.push({
    shape: 'cyl',
    r,
    r2: r * 0.3,
    len: L * 0.14,
    axis: 'x',
    pos: [-0.4 * L, r * 0.15, 0],
    rot: [0, 0, Math.PI],
    color: m.color,
  });
  if (!drone)
    parts.push({
      shape: 'ellipsoid',
      size: [L * 0.14, r * 1.1, r * 1.3],
      pos: [0.33 * L, r * 0.65, 0],
      color: m.accent === m.color ? GLASS : m.accent,
    });

  // Alas.
  const chord = Math.max(L * 0.14, S * 0.07);
  const thick = Math.max(r * 0.22, 0.02);
  const wingY = m.highWing ? r * 0.85 : -r * 0.45;
  parts.push({ shape: 'box', size: [chord, thick, S], pos: [0.04 * L, wingY, 0], color: m.color });

  // Empenaje.
  const tx = -0.43 * L;
  const finH = L * 0.16;
  if (m.tail === 'en-v') {
    for (const s of [1, -1])
      parts.push({
        shape: 'box',
        size: [L * 0.11, finH, thick],
        pos: [tx, r + finH * 0.35, s * finH * 0.32],
        rot: [s * 0.75, 0, 0],
        color: m.color,
      });
  } else {
    parts.push({
      shape: 'box',
      size: [L * 0.13, finH, thick],
      pos: [tx, r + finH / 2 - r * 0.2, 0],
      color: m.color,
    });
    parts.push({
      shape: 'box',
      size: [L * 0.1, thick, S * 0.34],
      pos: [tx - L * 0.01, m.tail === 'en-t' ? r + finH - r * 0.2 : r * 0.2, 0],
      color: m.color,
    });
  }

  // Motores y hélices.
  const n = m.engines;
  const propR = drone ? S * 0.07 : Math.max(L * 0.08, S * 0.06);
  if (drone) {
    // Hélice propulsora detrás (o dos en el ala si son dos).
    if (n === 1)
      parts.push({
        shape: 'rotor',
        r: propR,
        blades: m.blades,
        axis: 'x',
        pos: [-0.48 * L, 0, 0],
        color: PROP,
      });
    else
      for (const s of [1, -1]) {
        parts.push({
          shape: 'cyl',
          r: r * 0.6,
          len: L * 0.18,
          axis: 'x',
          pos: [0.04 * L, wingY, s * S * 0.22],
          color: m.accent,
        });
        parts.push({
          shape: 'rotor',
          r: propR,
          blades: m.blades,
          axis: 'x',
          pos: [-0.06 * L, wingY, s * S * 0.22],
          color: PROP,
        });
      }
  } else if (n === 1) {
    parts.push({
      shape: 'rotor',
      r: propR,
      blades: m.blades,
      axis: 'x',
      pos: [0.54 * L, 0, 0],
      color: PROP,
    });
  } else {
    const zs = n === 2 ? [0.22] : n === 3 ? [0, 0.3] : [0.18, 0.36];
    const offsets = zs.flatMap((z) => (z === 0 ? [0] : [z, -z]));
    for (const z of offsets) {
      const onNose = z === 0;
      const ex = onNose ? 0.54 * L : 0.04 * L + chord * 0.9;
      if (!onNose)
        parts.push({
          shape: 'cyl',
          r: r * 0.45,
          len: chord * 1.2,
          axis: 'x',
          pos: [0.04 * L + chord * 0.25, wingY - r * 0.3, z * S],
          color: m.accent,
        });
      parts.push({
        shape: 'rotor',
        r: onNose ? propR : propR * 0.9,
        blades: m.blades,
        axis: 'x',
        pos: [ex, onNose ? 0 : wingY - r * 0.3, z * S],
        color: PROP,
      });
    }
  }

  // Carga.
  if (m.payload === 'camara')
    parts.push({
      shape: 'ellipsoid',
      size: [r * 1.4, r * 1.4, r * 1.4],
      pos: [0.3 * L, -r * 1.05, 0],
      color: m.accent,
    });
  if (m.payload === 'misiles')
    for (const s of [1, -1])
      for (const z of [0.28, 0.4])
        parts.push({
          shape: 'cyl',
          r: Math.max(r * 0.18, 0.03),
          len: chord * 1.3,
          axis: 'x',
          pos: [0.05 * L, wingY - thick - r * 0.25, s * z * S],
          color: '#d9d9d9',
        });
  if (m.payload === 'carga')
    parts.push({
      shape: 'box',
      size: [L * 0.22, r * 0.9, r * 1.2],
      pos: [0, -r * 1.1, 0],
      color: m.accent,
    });
  return parts;
}

function helicopterParts(m: Model3D): Part[] {
  const L = m.length;
  const R = m.span / 2;
  const parts: Part[] = [
    // Cabina y fuselaje.
    {
      shape: 'ellipsoid',
      size: [L * 0.42, L * 0.2, L * 0.17],
      pos: [0.12 * L, 0, 0],
      color: m.color,
    },
    {
      shape: 'ellipsoid',
      size: [L * 0.14, L * 0.11, L * 0.15],
      pos: [0.3 * L, L * 0.02, 0],
      color: GLASS,
    },
    // Botalón de cola, deriva y rotor de cola.
    {
      shape: 'cyl',
      r: L * 0.035,
      r2: L * 0.02,
      len: L * 0.55,
      axis: 'x',
      pos: [-0.3 * L, L * 0.04, 0],
      rot: [0, 0, Math.PI],
      color: m.color,
    },
    {
      shape: 'box',
      size: [L * 0.07, L * 0.13, L * 0.012],
      pos: [-0.56 * L, L * 0.1, 0],
      color: m.color,
    },
    {
      shape: 'box',
      size: [L * 0.05, L * 0.01, L * 0.12],
      pos: [-0.5 * L, L * 0.05, 0],
      color: m.color,
    },
    {
      shape: 'rotor',
      r: Math.max(R * 0.18, L * 0.07),
      blades: 2,
      axis: 'z',
      pos: [-0.57 * L, L * 0.12, L * 0.03],
      color: PROP,
    },
    // Mástil y rotor principal.
    {
      shape: 'cyl',
      r: L * 0.015,
      len: L * 0.07,
      axis: 'y',
      pos: [0.1 * L, L * 0.13, 0],
      color: m.accent,
    },
    {
      shape: 'rotor',
      r: R,
      blades: m.blades,
      axis: 'y',
      pos: [0.1 * L, L * 0.17, 0],
      color: PROP,
    },
  ];
  // Turbinas sobre el fuselaje.
  for (let i = 0; i < m.engines; i++)
    parts.push({
      shape: 'cyl',
      r: L * 0.03,
      len: L * 0.16,
      axis: 'x',
      pos: [0.04 * L, L * 0.1, m.engines === 1 ? 0 : (i ? -1 : 1) * L * 0.04],
      color: m.accent,
    });
  // Patines.
  for (const s of [1, -1]) {
    parts.push({
      shape: 'box',
      size: [L * 0.42, L * 0.012, L * 0.02],
      pos: [0.1 * L, -L * 0.13, s * L * 0.08],
      color: m.accent,
    });
    for (const x of [0, 0.2])
      parts.push({
        shape: 'box',
        size: [L * 0.012, L * 0.06, L * 0.012],
        pos: [x * L, -L * 0.1, s * L * 0.075],
        color: m.accent,
      });
  }
  if (m.payload === 'camara')
    parts.push({
      shape: 'ellipsoid',
      size: [L * 0.05, L * 0.05, L * 0.05],
      pos: [0.33 * L, -L * 0.08, 0],
      color: m.accent,
    });
  if (m.payload === 'misiles')
    for (const s of [1, -1]) {
      parts.push({
        shape: 'box',
        size: [L * 0.06, L * 0.01, L * 0.14],
        pos: [0.08 * L, -L * 0.02, s * L * 0.13],
        color: m.color,
      });
      parts.push({
        shape: 'cyl',
        r: L * 0.022,
        len: L * 0.16,
        axis: 'x',
        pos: [0.1 * L, -L * 0.04, s * L * 0.19],
        color: '#9aa0a6',
      });
    }
  if (m.payload === 'carga')
    parts.push({
      shape: 'box',
      size: [L * 0.12, L * 0.08, L * 0.1],
      pos: [0.1 * L, -L * 0.24, 0],
      color: m.accent,
    });
  return parts;
}

function multirotorParts(m: Model3D): Part[] {
  const L = m.length;
  const n = m.engines;
  const armLen = L * 0.48;
  const propR = Math.min(L * 0.19, (Math.PI * armLen) / n) * 0.95;
  const parts: Part[] = [
    { shape: 'box', size: [L * 0.28, L * 0.1, L * 0.22], pos: [0, 0, 0], color: m.color },
    {
      shape: 'ellipsoid',
      size: [L * 0.14, L * 0.06, L * 0.12],
      pos: [0.08 * L, L * 0.06, 0],
      color: m.accent,
    },
  ];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n + Math.PI / n;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    parts.push({
      shape: 'box',
      size: [armLen, L * 0.035, L * 0.035],
      pos: [(cx * armLen) / 2, 0, (cz * armLen) / 2],
      rot: [0, -a, 0],
      color: m.color,
    });
    parts.push({
      shape: 'cyl',
      r: L * 0.035,
      len: L * 0.07,
      axis: 'y',
      pos: [cx * armLen, L * 0.035, cz * armLen],
      color: m.accent,
    });
    parts.push({
      shape: 'rotor',
      r: propR,
      blades: m.blades,
      axis: 'y',
      pos: [cx * armLen, L * 0.08, cz * armLen],
      color: PROP,
    });
  }
  for (const s of [1, -1])
    parts.push({
      shape: 'box',
      size: [L * 0.3, L * 0.012, L * 0.02],
      pos: [0, -L * 0.12, s * L * 0.1],
      color: m.accent,
    });
  if (m.payload === 'camara')
    parts.push({
      shape: 'ellipsoid',
      size: [L * 0.09, L * 0.09, L * 0.09],
      pos: [0.06 * L, -L * 0.09, 0],
      color: m.accent,
    });
  if (m.payload === 'carga' || m.payload === 'misiles')
    parts.push({
      shape: 'box',
      size: [L * 0.16, L * 0.08, L * 0.12],
      pos: [0, -L * 0.1, 0],
      color: m.payload === 'misiles' ? '#9aa0a6' : m.accent,
    });
  return parts;
}

/** Piezas del modelo, en metros, centradas en el origen. */
export function modelParts(m: Model3D): Part[] {
  const n = normalizeModel(m);
  switch (n.base) {
    case 'avion':
      return planeParts(n, false);
    case 'dron-ala-fija':
      return planeParts(n, true);
    case 'helicoptero':
      return helicopterParts(n);
    case 'dron-multirrotor':
      return multirotorParts(n);
  }
}

/** Mayor dimensión del modelo (para encuadrar la cámara o escalarlo en el mapa). */
export const modelSize = (m: Model3D): number => Math.max(m.length, m.span);

/** Altura de vuelo típica sobre el terreno, en metros, según el tipo. */
export const DEFAULT_ALTITUDE: Record<ModelBase, number> = {
  avion: 600,
  helicoptero: 150,
  'dron-multirrotor': 80,
  'dron-ala-fija': 300,
};

/** Unidades a las que conviene ofrecer un modelo 3D. */
export const AIR_UNIT_TYPES = [
  'aviacion',
  'aviacion-fija',
  'vigilancia',
  'reconocimiento',
] as const;

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
