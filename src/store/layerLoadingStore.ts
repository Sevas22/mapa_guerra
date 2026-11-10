import { create } from 'zustand';

export type LayerLoadState = 'loading' | 'error' | 'zoom';

/**
 * Estado de las capas dinámicas (IGAC/DANE): cuáles están cargando, cuáles fallaron
 * y cuáles están ocultas por zoom. Solo sirve para el indicador; no se guarda.
 */
interface LayerLoadingState {
  layers: Record<string, LayerLoadState>;
  set: (id: string, state: LayerLoadState | null) => void;
}

export const useLayerLoadingStore = create<LayerLoadingState>()((set) => ({
  layers: {},
  set: (id, state) =>
    set((s) => {
      if ((s.layers[id] ?? null) === state) return s;
      const layers = { ...s.layers };
      if (state) layers[id] = state;
      else delete layers[id];
      return { layers };
    }),
}));
