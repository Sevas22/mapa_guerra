/** Operaciones puras sobre objetos del escenario. */
import { POINTS, forceById } from './catalog';
import { uid } from './id';
import type {
  DocFields,
  FactionId,
  ModelFields,
  LineFrame,
  LineType,
  MapObject,
  PointFrame,
  PointType,
  Scenario,
  MediaRef,
  SymbolFields,
  Travel,
  UnitType,
} from './types';

export type NewObjectSpec =
  | { kind: 'unit'; type: UnitType; frame: PointFrame }
  | { kind: 'point'; type: PointType; frame: PointFrame }
  | { kind: 'line'; type: LineType; frame: LineFrame };

/**
 * Crea un objeto nuevo en la fase `phase`, igual que `addObject` del prototipo.
 * `force` (fuerza o estructura GAO) solo se guarda si corresponde a la identidad.
 */
export function createObject(
  spec: NewObjectSpec,
  faction: FactionId,
  phase: number,
  force?: string,
): MapObject {
  const f = forceById(force);
  const common = {
    id: uid(),
    faction,
    notes: '',
    start: phase,
    end: null,
    ...(f && f.faction === faction ? { force: f.id } : {}),
  };
  switch (spec.kind) {
    case 'unit':
      return {
        ...common,
        kind: 'unit',
        type: spec.type,
        echelon: 'I',
        label: '',
        frames: { [phase]: spec.frame },
      };
    case 'point':
      return {
        ...common,
        kind: 'point',
        type: spec.type,
        echelon: '',
        label: POINTS[spec.type].label,
        frames: { [phase]: spec.frame },
      };
    case 'line':
      return {
        ...common,
        kind: 'line',
        type: spec.type,
        echelon: '',
        label: '',
        frames: { [phase]: spec.frame },
      };
  }
}

/** Desplazamiento del duplicado respecto al original, en grados. */
export const DUPLICATE_OFFSET = 0.004;

/** Copia profunda con id nuevo, desplazada al sureste. */
export function duplicateObject(o: MapObject): MapObject {
  const c = structuredClone(o);
  c.id = uid();
  const d = DUPLICATE_OFFSET;
  if (c.kind === 'line') {
    for (const f of Object.values(c.frames)) f.pts = f.pts.map(([la, ln]) => [la - d, ln + d]);
  } else {
    for (const f of Object.values(c.frames)) {
      f.lat -= d;
      f.lng += d;
    }
  }
  return c;
}

/** Fija el frame del objeto en la fase `phase`. */
export function setObjectFrame(
  s: Scenario,
  id: string,
  phase: number,
  frame: PointFrame | LineFrame,
): Scenario {
  return {
    ...s,
    objects: s.objects.map((o) => {
      if (o.id !== id) return o;
      const isLine = 'pts' in frame;
      if (isLine !== (o.kind === 'line')) return o;
      // Al arrastrar un símbolo se conserva la altura de vuelo que tuviera en esa fase.
      if (!isLine && o.kind !== 'line' && !('alt' in frame)) {
        const prev = o.frames[phase]?.alt;
        if (prev != null) frame = { ...frame, alt: prev };
      }
      return { ...o, frames: { ...o.frames, [phase]: frame } } as MapObject;
    }),
  };
}

/** Distribuye `Partial` sobre la unión para poder parchear cualquier variante. */
export type ObjectPatch = Partial<
  Pick<MapObject, 'label' | 'notes' | 'faction' | 'start' | 'end'> & {
    type: MapObject['type'];
    echelon: string;
    media: MediaRef[];
    travel: Travel;
  } & SymbolFields &
    ModelFields &
    DocFields
>;

/** Aplica cambios de propiedades a un objeto. Ignora tipos que no correspondan a su `kind`. */
export function patchObject(s: Scenario, id: string, patch: ObjectPatch): Scenario {
  return {
    ...s,
    objects: s.objects.map((o) => {
      if (o.id !== id) return o;
      const next = { ...o, ...patch } as MapObject;
      if (next.end != null && next.end < next.start) next.end = next.start;
      // La fuerza o estructura debe pertenecer a la identidad del objeto.
      const f = forceById(next.force);
      if (next.force !== undefined && (!f || f.faction !== next.faction)) delete next.force;
      // Los campos vacíos no se guardan, para que el JSON siga limpio.
      for (const k of ['iconText', 'mod1', 'mobility', 'reinforced', 'effectiveness'] as const)
        if (k in next && (next as SymbolFields)[k] === '') delete (next as SymbolFields)[k];
      if ('taskForce' in next && !next.taskForce) delete next.taskForce;
      if ('status' in next && next.status === 'presente') delete next.status;
      if (next.media && next.media.length === 0) delete next.media;
      if ('card' in next) {
        const c = (next as SymbolFields).card;
        const empty = !c || (c.pax == null && !c.medios && !c.mision);
        if (empty) delete (next as SymbolFields).card;
      }
      const loose = next as Partial<ModelFields & DocFields>;
      if ('model3d' in loose && !loose.model3d) {
        delete loose.model3d;
        delete loose.altitude;
      }
      if ('altitude' in loose && loose.altitude == null) delete loose.altitude;
      if ('chartId' in loose && !loose.chartId) delete loose.chartId;
      if ('cardWidth' in loose && !loose.cardWidth) delete loose.cardWidth;
      if ('travel' in next && !(next as { travel?: Travel }).travel)
        delete (next as { travel?: Travel }).travel;
      return next;
    }),
  };
}

export const removeObject = (s: Scenario, id: string): Scenario => ({
  ...s,
  objects: s.objects.filter((o) => o.id !== id),
});

/** Elimina vértices consecutivos más cercanos que `minDist` según `distance`. */
export function dedupeVertices<T>(
  pts: readonly T[],
  distance: (a: T, b: T) => number,
  minDist = 5,
): T[] {
  const clean: T[] = [];
  for (const p of pts) {
    const last = clean[clean.length - 1];
    if (last !== undefined && distance(last, p) < minDist) continue;
    clean.push(p);
  }
  return clean;
}

/** Colecciones del escenario que no son objetos del mapa. */
export type CollectionKey = 'profiles' | 'charts' | 'models';

/** Inserta o reemplaza (por `id`) un elemento de una colección. */
export function upsertItem<K extends CollectionKey>(
  s: Scenario,
  key: K,
  item: NonNullable<Scenario[K]>[number],
): Scenario {
  const list = (s[key] ?? []) as { id: string }[];
  const i = list.findIndex((x) => x.id === item.id);
  const next = i < 0 ? [...list, item] : list.map((x, j) => (j === i ? item : x));
  return { ...s, [key]: next };
}

/**
 * Quita un elemento de una colección y las referencias de los objetos del mapa: un perfil
 * sale de las fichas, un grafo deja su ficha vacía y un modelo deja de verse en las unidades.
 */
export function removeItem(s: Scenario, key: CollectionKey, id: string): Scenario {
  const list = (s[key] ?? []) as { id: string }[];
  const rest = list.filter((x) => x.id !== id);
  const objects = s.objects.map((o): MapObject => {
    if (key === 'profiles' && o.kind === 'point' && o.profileIds?.includes(id))
      return { ...o, profileIds: o.profileIds.filter((x) => x !== id) };
    if (key === 'charts' && o.kind === 'point' && o.chartId === id) {
      const r = { ...o };
      delete r.chartId;
      return r;
    }
    if (key === 'models' && o.kind === 'unit' && o.model3d === id) {
      const r = { ...o };
      delete r.model3d;
      delete r.altitude;
      return r;
    }
    return o;
  });
  const out: Scenario = { ...s, objects };
  if (rest.length) (out as Record<CollectionKey, unknown>)[key] = rest;
  else delete out[key];
  // Los grafos también citan perfiles.
  if (key === 'profiles' && out.charts)
    out.charts = out.charts.map((c) =>
      c.nodes.some((n) => n.profileId === id)
        ? {
            ...c,
            nodes: c.nodes.map((n) => {
              if (n.profileId !== id) return n;
              const r = { ...n };
              delete r.profileId;
              return r;
            }),
          }
        : c,
    );
  return out;
}
