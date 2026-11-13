import { create } from 'zustand';

export type WorkspaceId = 'models' | 'profiles' | 'charts';

interface WorkspaceState {
  /** Área de trabajo abierta a pantalla completa, o `null`. */
  open: WorkspaceId | null;
  /** Elemento que se quiere ver al abrir (modelo, perfil o grafo). */
  focusId: string | null;
  show: (id: WorkspaceId, focusId?: string | null) => void;
  close: () => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  open: null,
  focusId: null,
  show: (open, focusId = null) => set({ open, focusId }),
  close: () => set({ open: null, focusId: null }),
}));
