import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_BASEMAP, DEFAULT_OVERLAYS, basemapById, validOverlays } from '@/domain/basemaps';
import { DEFAULT_EXAGGERATION, EXAGGERATIONS } from '@/domain/scene3d';

const validExaggeration = (v: unknown): number =>
  EXAGGERATIONS.find((x) => x === v) ?? DEFAULT_EXAGGERATION;

/**
 * Preferencia de visualización del mapa (mapa base + capas superpuestas).
 * Es del usuario, no del escenario: no se exporta en el JSON.
 */
export interface MapStyleState {
  baseId: string;
  overlays: string[];
  /** Exageración vertical del relieve en la vista 3D. */
  exaggeration: number;
  setBase: (id: string) => void;
  setExaggeration: (x: number) => void;
  toggleOverlay: (id: string) => void;
  reset: () => void;
}

export const MAP_STYLE_KEY = 'mapa-tactico-co-capas';

export const useMapStyleStore = create<MapStyleState>()(
  persist(
    (set, get) => ({
      baseId: DEFAULT_BASEMAP,
      overlays: [...DEFAULT_OVERLAYS],
      exaggeration: DEFAULT_EXAGGERATION,
      setBase: (id) => set({ baseId: basemapById(id).id }),
      setExaggeration: (x) => set({ exaggeration: validExaggeration(x) }),
      toggleOverlay: (id) => {
        const cur = get().overlays;
        set({
          overlays: validOverlays(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]),
        });
      },
      reset: () => set({ baseId: DEFAULT_BASEMAP, overlays: [...DEFAULT_OVERLAYS] }),
    }),
    {
      name: MAP_STYLE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ baseId: s.baseId, overlays: s.overlays, exaggeration: s.exaggeration }),
      // Lo guardado puede venir de otra versión: se sanea antes de usarlo.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<
          Pick<MapStyleState, 'baseId' | 'overlays' | 'exaggeration'>
        >;
        return {
          ...current,
          exaggeration: validExaggeration(p.exaggeration),
          baseId: basemapById(typeof p.baseId === 'string' ? p.baseId : DEFAULT_BASEMAP).id,
          overlays: Array.isArray(p.overlays)
            ? validOverlays(p.overlays.filter((x): x is string => typeof x === 'string'))
            : current.overlays,
        };
      },
    },
  ),
);
