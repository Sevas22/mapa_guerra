'use client';

import { useRef } from 'react';
import { blankScenario } from '@/domain/sample';
import { exportScenario, readScenarioFile } from '@/lib/file';
import { fitScenario, resetView } from '@/lib/mapBridge';
import { useEditorStore } from '@/store/editorStore';

export function Header() {
  const name = useEditorStore((s) => s.scenario.name);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const fileIn = useRef<HTMLInputElement>(null);

  const onNew = () => {
    if (!confirm('¿Empezar un escenario nuevo? Exporta antes el actual si quieres conservarlo.'))
      return;
    useEditorStore.getState().loadScenario(blankScenario());
    resetView();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const r = await readScenarioFile(file);
    if (!r.ok) {
      alert(`Ese archivo no es un escenario válido de Mapa Táctico.\n\n${r.error}`);
      return;
    }
    useEditorStore.getState().loadScenario(r.scenario);
    if (!r.scenario.phases[0]?.view) fitScenario(r.scenario);
  };

  return (
    <header className="area-hd flex items-center gap-4 border-b border-line bg-panel px-4 max-[900px]:flex-wrap max-[900px]:py-2">
      <div className="font-display text-xl leading-none font-bold tracking-[0.08em] whitespace-nowrap uppercase">
        Mapa táctico <span className="text-accent">·</span> CO
      </div>
      <div className="min-w-0 flex-1 truncate text-[13px] text-muted">{name}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs whitespace-nowrap text-muted" aria-live="polite">
          {saveStatus}
        </span>
        <button type="button" className="btn" onClick={onNew}>
          Nuevo
        </button>
        <button type="button" className="btn" onClick={() => fileIn.current?.click()}>
          Abrir…
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => exportScenario(useEditorStore.getState().scenario)}
        >
          Exportar .json
        </button>
      </div>
      <input ref={fileIn} type="file" accept=".json,application/json" hidden onChange={onFile} />
    </header>
  );
}
