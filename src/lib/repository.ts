import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { STORE_KEY } from '@/domain/catalog';
import { parseScenarioJSON } from '@/domain/schema';
import type { Scenario } from '@/domain/types';

type MaybePromise<T> = T | Promise<T>;

/**
 * Persistencia del escenario. Hoy hay una implementación local; más adelante
 * puede añadirse otra que hable con una API sin tocar el store.
 */
export interface ScenarioRepository {
  load(): MaybePromise<Scenario | null>;
  save(scenario: Scenario): MaybePromise<void>;
}

/** Guarda el escenario en `localStorage` con el mismo formato y clave que el prototipo. */
export class LocalScenarioRepository implements ScenarioRepository {
  constructor(
    private readonly key: string = STORE_KEY,
    private readonly storage: () => Storage | undefined = () =>
      typeof window === 'undefined' ? undefined : window.localStorage,
  ) {}

  load(): Scenario | null {
    try {
      const raw = this.storage()?.getItem(this.key);
      if (!raw) return null;
      const r = parseScenarioJSON(raw);
      return r.ok ? r.scenario : null;
    } catch {
      return null;
    }
  }

  /** Lanza si el almacenamiento no está disponible o está lleno. */
  save(scenario: Scenario): void {
    const st = this.storage();
    if (!st) throw new Error('localStorage no disponible');
    st.setItem(this.key, JSON.stringify(scenario));
  }
}

export interface PersistedSlice {
  scenario: Scenario;
}

export interface SaveCallbacks {
  onSaved: (at: Date) => void;
  onError: () => void;
}

/**
 * Adaptador entre el middleware `persist` de Zustand y un `ScenarioRepository`.
 * Guarda con un retardo (300 ms, como el prototipo) y solo si el escenario cambió.
 */
export function repositoryStorage(
  repo: ScenarioRepository,
  callbacks: SaveCallbacks,
  debounceMs = 300,
): PersistStorage<PersistedSlice> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: Scenario | undefined;

  const wrap = (s: Scenario | null): StorageValue<PersistedSlice> | null => {
    if (!s) return null;
    last = s;
    return { state: { scenario: s }, version: 0 };
  };

  return {
    getItem: () => {
      const r = repo.load();
      return r instanceof Promise ? r.then(wrap) : wrap(r);
    },
    setItem: (_name, value) => {
      const s = value.state.scenario;
      if (s === last) return;
      last = s;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await repo.save(s);
          callbacks.onSaved(new Date());
        } catch {
          callbacks.onError();
        }
      }, debounceMs);
    },
    removeItem: () => {},
  };
}

export const formatSaved = (d: Date): string =>
  'Guardado ' +
  d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
