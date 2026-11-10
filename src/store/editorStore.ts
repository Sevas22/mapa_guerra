import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LINES } from '@/domain/catalog';
import { round6 } from '@/domain/coords';
import { sampleScenario } from '@/domain/sample';
import {
  createObject,
  dedupeVertices,
  duplicateObject,
  patchObject,
  removeObject,
  setObjectFrame,
  type ObjectPatch,
} from '@/domain/scenario';
import { deletePhase as deletePhaseOp, insertPhaseAfter } from '@/domain/timeline';
import type {
  FactionId,
  LatLngTuple,
  LineFrame,
  LineType,
  Phase,
  PhaseView,
  PointFrame,
  PointType,
  Scenario,
  UnitType,
} from '@/domain/types';
import { flyToView, pixelDistance } from '@/lib/mapBridge';
import {
  LocalScenarioRepository,
  formatSaved,
  repositoryStorage,
  type PersistedSlice,
  type ScenarioRepository,
} from '@/lib/repository';

export type Tool =
  | { mode: 'select' }
  | { mode: 'place'; kind: 'unit'; type: UnitType }
  | { mode: 'place'; kind: 'point'; type: PointType }
  | { mode: 'draw'; kind: 'line'; type: LineType; redrawId?: string };

export interface GotoTarget {
  lat: number;
  lng: number;
  name: string;
}

export interface EditorState {
  scenario: Scenario;
  /** Fase actual (entera). */
  current: number;
  /**
   * Instante continuo de la línea de tiempo (p. ej. 1.37 durante una transición).
   * Solo lo leen las capas del mapa mediante suscripciones fuera de React.
   */
  time: number;
  /** Progreso lineal de la transición en curso, 0..1 (barra de progreso). */
  progress: number;
  playing: boolean;
  selectedId: string | null;
  faction: FactionId;
  /** Fuerza propia o estructura GAO elegida en la paleta ('' = genérica). */
  force: string;
  tool: Tool;
  /** Vértices del trazo en edición, o `null` si no se está dibujando. */
  draft: LatLngTuple[] | null;
  draftError: string | null;
  gotoTarget: GotoTarget | null;
  saveStatus: string;

  goto: (i: number, fly?: boolean) => void;
  select: (id: string | null) => void;
  setFaction: (f: FactionId) => void;
  setForce: (force: string) => void;
  setTool: (t: Tool) => void;
  mapClick: (ll: { lat: number; lng: number }, shiftKey: boolean) => void;
  objectClick: (id: string, ll: { lat: number; lng: number }, shiftKey: boolean) => void;
  cancelDraft: () => void;
  finishDraft: () => void;
  setFrame: (id: string, frame: PointFrame | LineFrame) => void;
  updateObject: (id: string, patch: ObjectPatch) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  updatePhase: (patch: Partial<Omit<Phase, 'id'>>) => void;
  setPhaseView: (view: PhaseView | null) => void;
  setScenarioName: (name: string) => void;
  setSpeed: (speed: number) => void;
  addPhase: () => void;
  deleteCurrentPhase: () => void;
  loadScenario: (s: Scenario) => void;
  setGotoTarget: (t: GotoTarget | null) => void;
  addGotoPoint: () => void;
  /** Usados por el motor de reproducción. */
  setPlayhead: (time: number, progress: number) => void;
  setPlaying: (playing: boolean) => void;
}

const SELECT: Tool = { mode: 'select' };

export const scenarioRepository: ScenarioRepository = new LocalScenarioRepository();

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => {
      /** Cambia el escenario conservando el resto del estado. */
      const mutate = (fn: (s: Scenario) => Scenario) => set({ scenario: fn(get().scenario) });

      const addObjectAt = (...args: Parameters<typeof createObject>) => {
        const o = createObject(...args);
        mutate((s) => ({ ...s, objects: [...s.objects, o] }));
        set({ selectedId: o.id });
        return o;
      };

      return {
        scenario: sampleScenario(),
        current: 0,
        time: 0,
        progress: 0,
        playing: false,
        selectedId: null,
        faction: 'azul',
        force: 'ejc',
        tool: SELECT,
        draft: null,
        draftError: null,
        gotoTarget: null,
        saveStatus: '',

        goto: (i, fly = true) => {
          const n = get().scenario.phases.length;
          const cur = Math.max(0, Math.min(i, n - 1));
          set({ playing: false, current: cur, time: cur, progress: 0 });
          if (fly) flyToView(get().scenario.phases[cur]?.view ?? null, 0.8);
        },

        select: (id) => set({ selectedId: id }),

        setFaction: (faction) => set({ faction, force: faction === 'azul' ? 'ejc' : '' }),

        setForce: (force) => set({ force }),

        setTool: (t) => {
          if (t.mode !== 'draw') set({ draft: null });
          set({ tool: t, draftError: null });
        },

        mapClick: (ll, shiftKey) => {
          const { playing, tool, selectedId, faction, current } = get();
          if (playing) return;
          if (tool.mode === 'place') {
            const frame = { lat: round6(ll.lat), lng: round6(ll.lng) };
            if (tool.kind === 'unit')
              addObjectAt({ kind: 'unit', type: tool.type, frame }, faction, current, get().force);
            else
              addObjectAt({ kind: 'point', type: tool.type, frame }, faction, current, get().force);
            if (!shiftKey) get().setTool(SELECT);
          } else if (tool.mode === 'draw') {
            set({ draft: [...(get().draft ?? []), [ll.lat, ll.lng]], draftError: null });
          } else if (selectedId) {
            set({ selectedId: null });
          }
        },

        objectClick: (id, ll, shiftKey) => {
          const { tool, playing } = get();
          if (tool.mode === 'select' && !playing) set({ selectedId: id });
          else if (tool.mode !== 'select') get().mapClick(ll, shiftKey);
        },

        cancelDraft: () => set({ draft: null, draftError: null }),

        finishDraft: () => {
          const { draft, tool, faction, current } = get();
          if (!draft || tool.mode !== 'draw') return;
          const clean = dedupeVertices(draft, pixelDistance, 5).map(([la, ln]): LatLngTuple => [
            round6(la),
            round6(ln),
          ]);
          const need = LINES[tool.type].min;
          if (clean.length < need) {
            set({ draftError: `Necesitas al menos ${need} puntos.` });
            return;
          }
          set({ draft: null, draftError: null });
          if (tool.redrawId) {
            get().setTool(SELECT);
            get().setFrame(tool.redrawId, { pts: clean });
          } else {
            addObjectAt(
              { kind: 'line', type: tool.type, frame: { pts: clean } },
              faction,
              current,
              get().force,
            );
            get().setTool(SELECT);
          }
        },

        setFrame: (id, frame) => mutate((s) => setObjectFrame(s, id, get().current, frame)),

        updateObject: (id, patch) => mutate((s) => patchObject(s, id, patch)),

        deleteSelected: () => {
          const id = get().selectedId;
          if (!id) return;
          mutate((s) => removeObject(s, id));
          set({ selectedId: null });
        },

        duplicateSelected: () => {
          const o = get().scenario.objects.find((x) => x.id === get().selectedId);
          if (!o) return;
          const c = duplicateObject(o);
          mutate((s) => ({ ...s, objects: [...s.objects, c] }));
          set({ selectedId: c.id });
        },

        updatePhase: (patch) => {
          const cur = get().current;
          mutate((s) => ({
            ...s,
            phases: s.phases.map((p, i) => (i === cur ? { ...p, ...patch } : p)),
          }));
        },

        setPhaseView: (view) => get().updatePhase({ view }),

        setScenarioName: (name) => mutate((s) => ({ ...s, name })),

        setSpeed: (speed) => mutate((s) => ({ ...s, speed })),

        addPhase: () => {
          const c = get().current;
          mutate((s) => insertPhaseAfter(s, c));
          get().goto(c + 1, false);
        },

        deleteCurrentPhase: () => {
          const k = get().current;
          if (get().scenario.phases.length <= 1) return;
          mutate((s) => deletePhaseOp(s, k));
          set({ selectedId: null });
          get().goto(Math.min(k, get().scenario.phases.length - 1), false);
        },

        loadScenario: (s) => {
          set({
            scenario: s,
            selectedId: null,
            draft: null,
            draftError: null,
            tool: SELECT,
            playing: false,
          });
          get().goto(0);
        },

        setGotoTarget: (gotoTarget) => set({ gotoTarget }),

        addGotoPoint: () => {
          const { gotoTarget, faction, current } = get();
          if (!gotoTarget) return;
          const o = addObjectAt(
            { kind: 'point', type: 'punto', frame: { lat: gotoTarget.lat, lng: gotoTarget.lng } },
            faction,
            current,
          );
          get().updateObject(o.id, { label: gotoTarget.name });
        },

        setPlayhead: (time, progress) => set({ time, progress }),

        setPlaying: (playing) => set({ playing }),
      };
    },
    {
      name: 'scenario',
      partialize: (s): PersistedSlice => ({ scenario: s.scenario }),
      storage: repositoryStorage(scenarioRepository, {
        onSaved: (d) => useEditorStore.setState({ saveStatus: formatSaved(d) }),
        onError: () => useEditorStore.setState({ saveStatus: 'Sin autoguardado' }),
      }),
    },
  ),
);

/** Objeto seleccionado (o `undefined`). */
export const selectSelected = (s: EditorState) =>
  s.selectedId ? s.scenario.objects.find((o) => o.id === s.selectedId) : undefined;
