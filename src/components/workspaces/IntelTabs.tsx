'use client';

import type { LinkChart } from '@/domain/linkChart';
import type { Profile } from '@/domain/profiles';
import { useEditorStore } from '@/store/editorStore';
import { useWorkspace } from '@/store/workspaceStore';

const EMPTY_P: Profile[] = [];
const EMPTY_C: LinkChart[] = [];

/**
 * Cabecera común de «Perfiles y vínculos»: las fichas y los grafos son dos pestañas de la
 * misma herramienta. Al cambiar de pestaña se lleva el foco (la ficha del nodo elegido, o
 * el grafo y nodo donde aparece la ficha abierta).
 */
export function IntelTabs({
  current,
  profileFocus,
  chartFocus,
}: {
  current: 'profiles' | 'charts';
  profileFocus?: string | null;
  chartFocus?: { chartId: string; nodeId?: string | null } | null;
}) {
  const show = useWorkspace((s) => s.show);
  const nProfiles = useEditorStore((s) => (s.scenario.profiles ?? EMPTY_P).length);
  const nCharts = useEditorStore((s) => (s.scenario.charts ?? EMPTY_C).length);
  const tabs = [
    ['profiles', 'Fichas', nProfiles],
    ['charts', 'Grafos y red', nCharts],
  ] as const;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <h2 className="whitespace-nowrap">Perfiles y vínculos</h2>
      <div className="flex rounded border border-line p-0.5" role="tablist">
        {tabs.map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={current === id}
            className="rounded px-3 py-1 text-[13px] text-muted aria-selected:bg-accent aria-selected:text-bg"
            onClick={() => {
              if (id === current) return;
              if (id === 'profiles') show('profiles', profileFocus ?? null);
              else show('charts', chartFocus?.chartId ?? null, chartFocus?.nodeId ?? null);
            }}
          >
            {label} <span className="opacity-70">· {n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
