/**
 * Lógica de la línea de tiempo, copiada del prototipo. Todas las funciones son
 * puras: devuelven objetos nuevos y nunca mutan sus argumentos.
 */
import { uid } from './id';
import type {
  Frame,
  LatLngTuple,
  LineFrame,
  LineObject,
  MapObject,
  Phase,
  PointFrame,
  Scenario,
} from './types';

type FramesOf<O extends MapObject> = O['frames'];
type FrameOf<O extends MapObject> = O extends LineObject ? LineFrame : PointFrame;

/** Claves de fase con frame propio, ordenadas. */
export const frameKeys = (o: { frames: Record<number, Frame> }): number[] =>
  Object.keys(o.frames)
    .map(Number)
    .sort((a, b) => a - b);

/** Frame con la mayor clave ≤ p. Si no hay ninguno, el de menor clave. */
export function frameAt<O extends MapObject>(o: O, p: number): FrameOf<O> {
  const keys = frameKeys(o);
  let k = keys[0];
  for (const x of keys) if (x <= p) k = x;
  return (o.frames as FramesOf<O>)[k as number] as FrameOf<O>;
}

/** ¿El objeto existe en la fase p? */
export const visibleAt = (o: Pick<MapObject, 'start' | 'end'>, p: number): boolean =>
  p >= o.start && (o.end == null || p <= o.end);

/** ¿Tiene el objeto un frame propio en la fase p? */
export const hasOwnFrame = (o: MapObject, p: number): boolean =>
  Object.prototype.hasOwnProperty.call(o.frames, p);

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Descompone una posición continua de la línea de tiempo `f` (p.ej. 1.35) en
 * fase base `p`, fase siguiente `q` y avance `t` ∈ [0,1).
 */
export function splitTime(f: number, phaseCount: number): { p: number; q: number; t: number } {
  const last = phaseCount - 1;
  const p = Math.min(Math.floor(f), last);
  const t = +(f - p).toFixed(4);
  const q = Math.min(p + 1, last);
  return { p, q, t };
}

/** Opacidad del objeto en el paso p→q con avance t (fundido al aparecer o desaparecer). */
export function opacityAt(o: MapObject, p: number, q: number, t: number): number {
  const va = visibleAt(o, p);
  const vb = t > 0 ? visibleAt(o, q) : va;
  if (t === 0) return va ? 1 : 0;
  if (va && vb) return 1;
  if (va) return 1 - t;
  if (vb) return t;
  return 0;
}

/** Interpola un trazo vértice a vértice; si cambia el número de vértices, salta en t = 0,5. */
export function interpolatePts(a: LatLngTuple[], b: LatLngTuple[], t: number): LatLngTuple[] {
  if (t === 0 || a === b) return a;
  if (a.length === b.length)
    return a.map((v, i) => {
      const w = b[i] as LatLngTuple;
      return [lerp(v[0], w[0], t), lerp(v[1], w[1], t)];
    });
  return t < 0.5 ? a : b;
}

export type RenderState =
  | { kind: 'point'; opacity: number; lat: number; lng: number }
  | { kind: 'line'; opacity: number; pts: LatLngTuple[] };

/** Umbral por debajo del cual el objeto se oculta. */
export const HIDDEN_OPACITY = 0.001;

/**
 * Estado de dibujo de un objeto en el instante continuo `f`.
 * Devuelve `null` si el objeto no se ve (equivale a la rama `hideLayer` del prototipo).
 */
export function objectStateAt(o: MapObject, f: number, phaseCount: number): RenderState | null {
  const { p, q, t } = splitTime(f, phaseCount);
  const op = opacityAt(o, p, q, t);
  if (op <= HIDDEN_OPACITY) return null;
  const va = visibleAt(o, p);
  const vb = t > 0 ? visibleAt(o, q) : va;
  if (o.kind === 'line') {
    const A = frameAt(o, va ? p : q);
    const B = t > 0 && vb ? frameAt(o, q) : A;
    return { kind: 'line', opacity: op, pts: interpolatePts(A.pts, B.pts, t) };
  }
  const A = frameAt(o, va ? p : q);
  const B = t > 0 && vb ? frameAt(o, q) : A;
  return { kind: 'point', opacity: op, lat: lerp(A.lat, B.lat, t), lng: lerp(A.lng, B.lng, t) };
}

/** Reindexa las claves de frames con `fn`; descarta las que devuelvan `null`. */
function remapFrames<F extends Frame>(
  frames: Record<number, F>,
  fn: (n: number) => number | null,
): Record<number, F> {
  const nf: Record<number, F> = {};
  for (const [k, v] of Object.entries(frames)) {
    const n = fn(Number(k));
    if (n != null) nf[n] = v;
  }
  return nf;
}

function withFrames<O extends MapObject>(o: O, frames: Record<number, Frame>): O {
  return { ...o, frames } as O;
}

/**
 * Inserta una fase nueva después de la fase `c`. Desplaza las claves de frames,
 * `start` y `end` mayores que `c`. La nueva fase hereda la vista de `c`.
 */
export function insertPhaseAfter(s: Scenario, c: number, phase: Partial<Phase> = {}): Scenario {
  const newPhase: Phase = {
    id: uid(),
    title: `Fase ${s.phases.length + 1}`,
    date: '',
    desc: '',
    view: s.phases[c]?.view ?? null,
    ...phase,
  };
  const phases = [...s.phases.slice(0, c + 1), newPhase, ...s.phases.slice(c + 1)];
  const objects = s.objects.map((o) => {
    const frames = remapFrames(o.frames as Record<number, Frame>, (n) => (n > c ? n + 1 : n));
    return {
      ...withFrames(o, frames),
      start: o.start > c ? o.start + 1 : o.start,
      end: o.end != null && o.end > c ? o.end + 1 : o.end,
    };
  });
  return { ...s, phases, objects };
}

/**
 * Elimina la fase `k`. Borra los objetos que solo existían en `k`, conserva el
 * frame de `k` si `k+1` no tenía uno propio (pasa a ser el frame de la nueva `k`)
 * y reindexa `start`/`end`. Si solo queda una fase, devuelve el escenario sin cambios.
 */
export function deletePhase(s: Scenario, k: number): Scenario {
  if (s.phases.length <= 1 || k < 0 || k >= s.phases.length) return s;
  const phases = s.phases.filter((_, i) => i !== k);
  const objects = s.objects
    .filter((o) => !(o.start === k && o.end === k))
    .map((o) => {
      const nextHasOwn = hasOwnFrame(o, k + 1);
      const frames = remapFrames(o.frames as Record<number, Frame>, (n) => {
        if (n < k) return n;
        if (n > k) return n - 1;
        return nextHasOwn ? null : k;
      });
      let end = o.end;
      if (end != null) {
        if (end > k) end = end - 1;
        else if (end === k) end = k - 1;
      }
      return {
        ...withFrames(o, frames),
        start: o.start > k ? o.start - 1 : o.start,
        end,
      };
    });
  return { ...s, phases, objects };
}
