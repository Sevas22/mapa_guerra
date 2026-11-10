import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_BASEMAP, DEFAULT_OVERLAYS, basemapById, validOverlays } from '@/domain/basemaps';

/**
 * Preferencia de visualización del mapa (mapa base + capas superpuestas).
 * Es del usuario, no del escenario: no se exporta en el JSON.
 */
export interface MapStyleState {
  baseId: string;
  overlays: string[];
  setBase: (id: string) => void;
  toggleOverlay: (id: string) => void;
  reset: () => void;
}

export const MAP_STYLE_KEY = 'mapa-tactico-co-capas';

export const useMapStyleStore = create<MapStyleState>()(
  persist(
    (set, get) => ({
      baseId: DEFAULT_BASEMAP,
      overlays: [...DEFAULT_OVERLAYS],
      setBase: (id) => set({ baseId: basemapById(id).id }),
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
      partialize: (s) => ({ baseId: s.baseId, overlays: s.overlays }),
      // Lo guardado puede venir de otra versión: se sanea antes de usarlo.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<MapStyleState, 'baseId' | 'overlays'>>;
        return {
          ...current,
          baseId: basemapById(typeof p.baseId === 'string' ? p.baseId : DEFAULT_BASEMAP).id,
          overlays: Array.isArray(p.overlays)
            ? validOverlays(p.overlays.filter((x): x is string => typeof x === 'string'))
            : current.overlays,
        };
      },
    },
  ),
);
