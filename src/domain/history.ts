/** Historial de deshacer y rehacer. Lógica pura: guarda instantáneas inmutables del escenario. */
import type { Scenario } from './types';

/** Estado que se restaura al deshacer: el escenario y la fase en que se estaba. */
export interface Snapshot {
  scenario: Scenario;
  current: number;
}

export interface History {
  past: Snapshot[];
  future: Snapshot[];
  /** Clave del último cambio registrado, para agrupar cambios seguidos del mismo campo. */
  lastKey: string | null;
  lastAt: number;
}

/** Máximo de pasos que se pueden deshacer. */
export const HISTORY_LIMIT = 100;
/** Cambios del mismo campo con menos de esta pausa entre sí cuentan como un solo paso. */
export const COALESCE_MS = 1000;

export const emptyHistory = (): History => ({ past: [], future: [], lastKey: null, lastAt: 0 });

/**
 * Registra el estado previo a un cambio. Si `key` coincide con la del cambio anterior y llega
 * antes de `COALESCE_MS` (p. ej. al escribir en un campo), se agrupa con él y no añade un paso.
 */
export function record(h: History, before: Snapshot, key?: string, now = Date.now()): History {
  if (key && key === h.lastKey && now - h.lastAt < COALESCE_MS)
    return { ...h, future: [], lastAt: now };
  const past = [...h.past, before];
  if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
  return { past, future: [], lastKey: key ?? null, lastAt: now };
}

/** Vuelve al estado anterior. Devuelve `null` si no hay nada que deshacer. */
export function undo(
  h: History,
  present: Snapshot,
): { history: History; snapshot: Snapshot } | null {
  const snapshot = h.past[h.past.length - 1];
  if (!snapshot) return null;
  return {
    snapshot,
    history: {
      past: h.past.slice(0, -1),
      future: [present, ...h.future],
      lastKey: null,
      lastAt: 0,
    },
  };
}

/** Rehace el último cambio deshecho. Devuelve `null` si no hay nada que rehacer. */
export function redo(
  h: History,
  present: Snapshot,
): { history: History; snapshot: Snapshot } | null {
  const snapshot = h.future[0];
  if (!snapshot) return null;
  return {
    snapshot,
    history: { past: [...h.past, present], future: h.future.slice(1), lastKey: null, lastAt: 0 },
  };
}
