import { z } from 'zod';
import { uid } from './id';
import {
  EFFECTIVENESS_IDS,
  FACTION_IDS,
  LINE_TYPES,
  MEDIA_KINDS,
  MOBILITY_IDS,
  POINT_TYPES,
  REINFORCEMENT_IDS,
  STATUS_IDS,
  TRAVEL_MODES,
  UNIT_TYPES,
} from './ids';
import { EDGE_KINDS, NODE_KINDS, TAB_SIDES } from './linkChart';
import { FACIAL_HAIR, HAIR_STYLES, SEXES, SOMATOTYPES } from './morphology';
import { MODEL_BASES, PAYLOADS, TAIL_TYPES, normalizeModel } from './models3d';
import { PROFILE_ROLES, SOURCE_TYPES } from './profiles';
import type { Scenario } from './types';

/**
 * Esquemas Zod equivalentes a `types.ts`. Son tolerantes igual que el prototipo:
 * rellenan campos opcionales con valores por defecto y sustituyen tipos o
 * bandos desconocidos por uno válido en lugar de rechazar el archivo.
 */

export { FACTION_IDS, LINE_TYPES, POINT_TYPES, UNIT_TYPES } from './ids';

const coord = z.number().finite();
export const LatLngTupleSchema = z.tuple([coord, coord]);

export const PointFrameSchema = z.object({
  lat: coord,
  lng: coord,
  alt: z.number().finite().min(0).max(20000).optional().catch(undefined),
});
export const LineFrameSchema = z.object({ pts: z.array(LatLngTupleSchema).min(2) });

const phaseKey = z.string().regex(/^\d+$/, 'La clave de un frame debe ser un número de fase');

const framesOf = <T extends z.ZodType>(frame: T) =>
  z.record(phaseKey, frame).refine((f) => Object.keys(f).length > 0, {
    message: 'El objeto necesita al menos un frame',
  });

export const MediaRefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(MEDIA_KINDS),
  name: z.string().default(''),
  caption: z.string().default(''),
  url: z.string().optional(),
});

/** Lista de adjuntos: los elementos mal formados se descartan sin rechazar el archivo. */
const mediaList = z
  .array(z.unknown())
  .optional()
  .catch(undefined)
  .transform((arr) => {
    if (!arr) return undefined;
    const ok = arr.flatMap((m) => {
      const r = MediaRefSchema.safeParse(m);
      return r.success ? [r.data] : [];
    });
    return ok.length ? ok : undefined;
  });

const cardSchema = z
  .object({
    pax: z.number().int().min(0).optional().catch(undefined),
    medios: z.string().optional().catch(undefined),
    mision: z.string().optional().catch(undefined),
  })
  .optional()
  .catch(undefined);

const travelSchema = z
  .object({
    mode: z.enum(TRAVEL_MODES),
    speed: z.number().positive().optional().catch(undefined),
  })
  .optional()
  .catch(undefined);

const base = {
  id: z
    .string()
    .min(1)
    .default(() => uid()),
  faction: z.enum(FACTION_IDS).catch('azul'),
  label: z.string().default(''),
  notes: z.string().default(''),
  start: z.number().int().min(0).default(0),
  end: z.number().int().min(0).nullable().default(null),
  media: mediaList,
};

/** Campos opcionales del MFRE 1-02. Un valor no válido se descarta en vez de rechazar el archivo. */
const symbolFields = {
  force: z.string().optional().catch(undefined),
  iconText: z.string().optional().catch(undefined),
  mod1: z.string().optional().catch(undefined),
  mobility: z.enum(MOBILITY_IDS).optional().catch(undefined),
  taskForce: z.boolean().optional().catch(undefined),
  reinforced: z.enum(REINFORCEMENT_IDS).optional().catch(undefined),
  effectiveness: z.enum(EFFECTIVENESS_IDS).optional().catch(undefined),
  status: z.enum(STATUS_IDS).optional().catch(undefined),
  card: cardSchema,
};

export const UnitObjectSchema = z.object({
  ...base,
  ...symbolFields,
  model3d: z.string().min(1).optional().catch(undefined),
  altitude: z.number().finite().min(0).max(20000).optional().catch(undefined),
  kind: z.literal('unit'),
  type: z.enum(UNIT_TYPES).catch('infanteria'),
  echelon: z.string().default(''),
  frames: framesOf(PointFrameSchema),
});

export const PointObjectSchema = z.object({
  ...base,
  ...symbolFields,
  profileIds: z.array(z.string()).optional().catch(undefined),
  chartId: z.string().optional().catch(undefined),
  cardWidth: z.number().min(120).max(2000).optional().catch(undefined),
  kind: z.literal('point'),
  type: z.enum(POINT_TYPES).catch('punto'),
  echelon: z.string().optional(),
  frames: framesOf(PointFrameSchema),
});

export const LineObjectSchema = z.object({
  ...base,
  force: symbolFields.force,
  travel: travelSchema,
  kind: z.literal('line'),
  type: z.enum(LINE_TYPES).catch('frente'),
  echelon: z.string().optional(),
  frames: framesOf(LineFrameSchema),
});

export const MapObjectSchema = z.discriminatedUnion('kind', [
  UnitObjectSchema,
  PointObjectSchema,
  LineObjectSchema,
]);

export const PhaseViewSchema = z.object({ c: LatLngTupleSchema, z: z.number().finite() });

export const PhaseSchema = z.object({
  id: z
    .string()
    .min(1)
    .default(() => uid()),
  title: z.string().default(''),
  date: z.string().default(''),
  desc: z.string().default(''),
  view: PhaseViewSchema.nullable().default(null),
  media: mediaList,
});

const str = z.string().catch('').default('');
const num = z.number().finite();

export const ProfileSchema = z.object({
  id: z
    .string()
    .min(1)
    .default(() => 'pf' + uid()),
  nombre: str,
  alias: str,
  grado: str,
  cargo: str,
  organizacion: str,
  estructura: str,
  rol: z.enum(PROFILE_ROLES).catch('persona'),
  fuente: z.enum(SOURCE_TYPES).optional().catch(undefined),
  telefono: str,
  documento: str,
  ubicacion: str,
  notas: str,
  foto: z.string().optional().catch(undefined),
  fisico: z
    .object({
      sexo: z.enum(SEXES).or(z.literal('')).catch(''),
      edad: num.min(0).catch(0).default(0),
      estatura: num.min(0).catch(0).default(0),
      peso: num.min(0).catch(0).default(0),
      somatotipo: z.enum(SOMATOTYPES).or(z.literal('')).catch(''),
      piel: z.string().catch('#a87653').default('#a87653'),
      cabello: z.string().catch('#1c1916').default('#1c1916'),
      peinado: z.enum(HAIR_STYLES).catch('corto'),
      barba: z.enum(FACIAL_HAIR).catch('ninguno'),
      ojos: str,
      senas: str,
    })
    .optional()
    .catch(undefined),
});

export const LinkChartSchema = z.object({
  id: z
    .string()
    .min(1)
    .default(() => 'gr' + uid()),
  title: str,
  legend: z.boolean().catch(true).default(true),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(NODE_KINDS).catch('persona'),
        x: num,
        y: num,
        label: str,
        sub: str,
        profileId: z.string().optional().catch(undefined),
        source: z.enum(SOURCE_TYPES).optional().catch(undefined),
        photo: z.string().optional().catch(undefined),
      }),
    )
    .default([]),
  groups: z
    .array(
      z.object({
        id: z.string().min(1),
        title: str,
        x: num,
        y: num,
        w: num.min(20),
        h: num.min(20),
        tab: z.enum(TAB_SIDES).catch('bottom'),
      }),
    )
    .default([]),
  edges: z
    .array(
      z.object({
        id: z.string().min(1),
        from: z.string(),
        to: z.string(),
        kind: z.enum(EDGE_KINDS).catch('confirmado'),
        arrow: z.boolean().catch(true).default(true),
        label: str,
      }),
    )
    .default([]),
});

const MeshSchema = z.object({
  id: z.string().min(1),
  name: str,
  yaw: num.catch(0).default(0),
  rotX: num.optional().catch(undefined),
  anim: str,
  parts: z.array(z.string()).optional().catch(undefined),
  skinRef: z.string().optional().catch(undefined),
  hairRef: z.string().optional().catch(undefined),
  credit: z.string().optional().catch(undefined),
});

export const Model3DSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .default(() => 'md' + uid()),
    name: z.string().catch('Modelo').default('Modelo'),
    base: z.enum(MODEL_BASES).catch('avion'),
    variant: z.string().catch('').default(''),
    color: z.string().catch('#8a949c').default('#8a949c'),
    accent: z.string().catch('#2b3440').default('#2b3440'),
    length: num.positive().catch(10),
    span: num.positive().catch(10),
    engines: num.catch(1).default(1),
    blades: num.catch(2).default(2),
    tail: z.enum(TAIL_TYPES).catch('convencional'),
    payload: z.enum(PAYLOADS).catch('ninguna'),
    highWing: z.boolean().catch(false).default(false),
    code: str,
    mesh: MeshSchema.optional().catch(undefined),
    body: z
      .object({
        sexo: z.enum(SEXES).or(z.literal('')).catch(''),
        peso: num.min(0).catch(0).default(0),
        somatotipo: z.enum(SOMATOTYPES).or(z.literal('')).catch(''),
        piel: z.string().catch('#a87653').default('#a87653'),
        cabello: z.string().catch('#1c1916').default('#1c1916'),
        peinado: z.enum(HAIR_STYLES).catch('corto'),
        barba: z.enum(FACIAL_HAIR).catch('ninguno'),
        civil: z.boolean().catch(false).default(false),
      })
      .optional()
      .catch(undefined),
  })
  .transform(normalizeModel);

/** Lista tolerante: los elementos mal formados se descartan; vacía = sin la clave. */
const listOf = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .optional()
    .catch(undefined)
    .transform((arr) => {
      if (!arr) return undefined;
      const ok = arr.flatMap((x) => {
        const r = item.safeParse(x);
        return r.success ? [r.data as z.output<T>] : [];
      });
      return ok.length ? ok : undefined;
    });

export const ScenarioSchema = z.object({
  profiles: listOf(ProfileSchema),
  charts: listOf(LinkChartSchema),
  models: listOf(Model3DSchema),
  humanMesh: MeshSchema.optional().catch(undefined),
  v: z.literal(1).default(1),
  name: z.string().default('Escenario sin título'),
  speed: z.number().positive().catch(2),
  phases: z.array(PhaseSchema).min(1),
  objects: z.array(MapObjectSchema),
  mediaData: z.record(z.string(), z.string()).optional().catch(undefined),
});

export type ParseResult = { ok: true; scenario: Scenario } | { ok: false; error: string };

/** Valida un valor ya parseado de JSON. */
export function parseScenario(data: unknown): ParseResult {
  const r = ScenarioSchema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    const where = first?.path.length ? ` (${first.path.join('.')})` : '';
    return { ok: false, error: `${first?.message ?? 'Escenario inválido'}${where}` };
  }
  const scenario: Scenario = r.data;
  return { ok: true, scenario };
}

/** Valida texto JSON. */
export function parseScenarioJSON(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es JSON válido' };
  }
  return parseScenario(data);
}
