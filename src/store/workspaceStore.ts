import { create } from 'zustand';

export type WorkspaceId = 'models' | 'profiles' | 'charts';

interface WorkspaceState {
  /** Área de trabajo abierta a pantalla completa, o `null`. */
  open: WorkspaceId | null;
  /** Elemento que se quiere ver al abrir (modelo, perfil o grafo). */
  focusId: string | null;
  /** Nodo del grafo que se quiere seleccionar al abrir un grafo. */
  focusNode: string | null;
  show: (id: WorkspaceId, focusId?: string | null, focusNode?: string | null) => void;
  close: () => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  open: null,
  focusId: null,
  focusNode: null,
  show: (open, focusId = null, focusNode = null) => set({ open, focusId, focusNode }),
  close: () => set({ open: null, focusId: null, focusNode: null }),
}));
