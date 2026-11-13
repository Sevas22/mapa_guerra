/**
 * Ayudantes para escribir escenarios de ejemplo a mano: unidades, puntos, trazos y
 * fases con la forma exacta del JSON. Los usan los ejercicios ficticios.
 */
import { uid } from './id';
import type {
  FactionId,
  LatLngTuple,
  LineObject,
  LineType,
  MediaRef,
  Phase,
  PointObject,
  PointType,
  SymbolFields,
  Travel,
  UnitObject,
  UnitType,
} from './types';

export type P = LatLngTuple;
export type FramesIn = Record<number, P>;

export const pf = (fr: FramesIn) =>
  Object.fromEntries(Object.entries(fr).map(([k, [lat, lng]]) => [k, { lat, lng }]));

export const unit = (
  type: UnitType,
  label: string,
  frames: FramesIn,
  extra: Partial<
    SymbolFields & {
      echelon: string;
      faction: FactionId;
      start: number;
      end: number | null;
      media: MediaRef[];
      notes: string;
      model3d: string;
      altitude: number;
    }
  > = {},
): UnitObject => ({
  id: uid(),
  kind: 'unit',
  type,
  faction: extra.faction ?? 'azul',
  echelon: extra.echelon ?? 'I',
  label,
  notes: extra.notes ?? '',
  start: extra.start ?? 0,
  end: extra.end ?? null,
  ...(extra.faction === 'roja' ? {} : { force: extra.force ?? 'ejc' }),
  ...(extra.card ? { card: extra.card } : {}),
  ...(extra.mobility ? { mobility: extra.mobility } : {}),
  ...(extra.mod1 ? { mod1: extra.mod1 } : {}),
  ...(extra.iconText ? { iconText: extra.iconText } : {}),
  ...(extra.taskForce ? { taskForce: true } : {}),
  ...(extra.status ? { status: extra.status } : {}),
  ...(extra.media ? { media: extra.media } : {}),
  ...(extra.model3d ? { model3d: extra.model3d, altitude: extra.altitude ?? 0 } : {}),
  frames: pf(frames),
});

export const point = (
  type: PointType,
  label: string,
  at: P,
  start = 0,
  end: number | null = null,
  extra: { iconText?: string; faction?: FactionId; notes?: string } = {},
): PointObject => ({
  id: uid(),
  kind: 'point',
  type,
  faction: extra.faction ?? 'azul',
  label,
  notes: extra.notes ?? '',
  start,
  end,
  ...(extra.iconText ? { iconText: extra.iconText } : {}),
  frames: { [start]: { lat: at[0], lng: at[1] } },
});

export const line = (
  type: LineType,
  label: string,
  pts: P[],
  start = 0,
  end: number | null = null,
  extra: { faction?: FactionId; travel?: Travel; notes?: string } = {},
): LineObject => ({
  id: uid(),
  kind: 'line',
  type,
  faction: extra.faction ?? 'azul',
  label,
  notes: extra.notes ?? '',
  start,
  end,
  ...(extra.travel ? { travel: extra.travel } : {}),
  frames: { [start]: { pts } },
});

export const phase = (
  title: string,
  date: string,
  desc: string,
  c: P,
  z: number,
  media?: MediaRef[],
): Phase => ({ id: uid(), title, date, desc, view: { c, z }, ...(media ? { media } : {}) });

export const demoMedia = (file: string, caption: string): MediaRef => ({
  id: 'demo-' + file.replace(/\W+/g, '-'),
  kind: 'image',
  name: file,
  caption,
  url: `/demo/${file}`,
});

/** Desplaza un punto `dlat` y `dlng` grados, redondeado a 5 decimales (≈ 1 m). */
export const off = (p: P, dlat: number, dlng: number): P => [
  +(p[0] + dlat).toFixed(5),
  +(p[1] + dlng).toFixed(5),
];
