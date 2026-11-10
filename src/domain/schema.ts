import { z } from 'zod';
import { uid } from './id';
import type { Scenario } from './types';

/**
 * Esquemas Zod equivalentes a `types.ts`. Son tolerantes igual que el prototipo:
 * rellenan campos opcionales con valores por defecto y sustituyen tipos o
 * bandos desconocidos por uno válido en lugar de rechazar el archivo.
 */

export const FACTION_IDS = ['azul', 'roja', 'verde', 'amarilla'] as const;
export const UNIT_TYPES = [
  'infanteria',
  'mecanizada',
  'blindados',
  'reconocimiento',
  'artilleria',
  'antiaerea',
  'aviacion',
  'naval',
  'ingenieros',
  'comunicaciones',
  'sanidad',
  'logistica',
  'especiales',
  'policia',
  'pc',
] as const;
export const POINT_TYPES = ['objetivo', 'base', 'evento', 'control', 'punto', 'texto'] as const;
export const LINE_TYPES = ['frente', 'eje', 'ruta', 'zona'] as const;

const coord = z.number().finite();
export const LatLngTupleSchema = z.tuple([coord, coord]);

export const PointFrameSchema = z.object({ lat: coord, lng: coord });
export const LineFrameSchema = z.object({ pts: z.array(LatLngTupleSchema).min(2) });

const phaseKey = z.string().regex(/^\d+$/, 'La clave de un frame debe ser un número de fase');

const framesOf = <T extends z.ZodType>(frame: T) =>
  z.record(phaseKey, frame).refine((f) => Object.keys(f).length > 0, {
    message: 'El objeto necesita al menos un frame',
  });

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
};

export const UnitObjectSchema = z.object({
  ...base,
  kind: z.literal('unit'),
  type: z.enum(UNIT_TYPES).catch('infanteria'),
  echelon: z.string().default(''),
  frames: framesOf(PointFrameSchema),
});

export const PointObjectSchema = z.object({
  ...base,
  kind: z.literal('point'),
  type: z.enum(POINT_TYPES).catch('punto'),
  echelon: z.string().optional(),
  frames: framesOf(PointFrameSchema),
});

export const LineObjectSchema = z.object({
  ...base,
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
});

export const ScenarioSchema = z.object({
  v: z.literal(1).default(1),
  name: z.string().default('Escenario sin título'),
  speed: z.number().positive().catch(2),
  phases: z.array(PhaseSchema).min(1),
  objects: z.array(MapObjectSchema),
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
