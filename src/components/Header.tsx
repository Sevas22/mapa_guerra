'use client';

import { useRef, useState } from 'react';
import { EXAMPLES, blankScenario } from '@/domain/sample';
import type { Scenario } from '@/domain/types';
import { exportScenario, readScenarioFile } from '@/lib/file';
import { fitScenario, flyToView, resetView } from '@/lib/mapBridge';
import { storeEmbeddedMedia, withEmbeddedMedia } from '@/lib/mediaStore';
import { useEditorStore } from '@/store/editorStore';
import { useWorkspace } from '@/store/workspaceStore';

const CONFIRM = '¿Reemplazar el escenario actual? Exporta antes el actual si quieres conservarlo.';

function openScenario(s: Scenario) {
  useEditorStore.getState().loadScenario(s);
  const v = s.phases[0]?.view;
  if (v) flyToView(v, 1);
  else fitScenario(s);
}

export function Header() {
  const name = useEditorStore((s) => s.scenario.name);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const canUndo = useEditorStore((s) => s.history.past.length > 0 || !!s.draft);
  const canRedo = useEditorStore((s) => s.history.future.length > 0 && !s.draft);
  const fileIn = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const show = useWorkspace((s) => s.show);

  const onNew = () => {
    if (!confirm(CONFIRM)) return;
    useEditorStore.getState().loadScenario(blankScenario());
    resetView();
  };

  const onExample = (i: number) => {
    const ex = EXAMPLES[i];
    if (!ex || !confirm(CONFIRM)) return;
    openScenario(ex.create());
  };

  const onExport = async () => {
    setBusy(true);
    try {
      // Los adjuntos se incrustan en el JSON para que el archivo sea autónomo.
      exportScenario(await withEmbeddedMedia(useEditorStore.getState().scenario));
    } finally {
      setBusy(false);
    }
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
    setBusy(true);
    try {
      openScenario(await storeEmbeddedMedia(r.scenario));
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="area-hd hd max-[900px]:flex-wrap max-[900px]:py-2">
      <div className="hd-mark">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
        <span>Mapa táctico</span>
      </div>
      <div className="hd-name" title={name}>
        {name}
      </div>
      <nav className="hd-nav" aria-label="Herramientas">
        <button
          type="button"
          onClick={() => show('models')}
          title="Modelos 3D de aeronaves, vehículos y tropas"
        >
          Taller 3D
        </button>
        <button
          type="button"
          onClick={() => show('profiles')}
          title="Fichas de las personas, grafos de vínculos y red"
        >
          Perfiles y vínculos
        </button>
      </nav>
      <span className="flex-1" />
      <span className="hd-status" aria-live="polite">
        {busy ? 'Procesando adjuntos…' : saveStatus}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn ico"
          aria-label="Deshacer"
          title="Deshacer (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => useEditorStore.getState().undo()}
        >
          ↶
        </button>
        <button
          type="button"
          className="btn ico"
          aria-label="Rehacer"
          title="Rehacer (Ctrl+Y o Ctrl+Mayús+Z)"
          disabled={!canRedo}
          onClick={() => useEditorStore.getState().redo()}
        >
          ↷
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <select
          aria-label="Abrir un escenario de ejemplo"
          className="w-auto! max-w-[150px] py-[5px]! text-[14px]"
          value=""
          onChange={(e) => onExample(Number(e.target.value))}
        >
          <option value="">Ejemplos</option>
          {EXAMPLES.map((x, i) => (
            <option key={x.name} value={i}>
              {x.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          onClick={onNew}
          title="Empezar un escenario en blanco"
        >
          Nuevo
        </button>
        <button
          type="button"
          className="btn"
          title="Abrir un escenario guardado (.json)"
          onClick={() => confirm(CONFIRM) && fileIn.current?.click()}
        >
          Abrir
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={onExport}
          title="Descarga el escenario con sus adjuntos en un archivo .json"
        >
          Guardar archivo
        </button>
      </div>
      <input ref={fileIn} type="file" accept=".json,application/json" hidden onChange={onFile} />
    </header>
  );
}
