'use client';

import { useRef, useState } from 'react';
import { EXAMPLES, blankScenario } from '@/domain/sample';
import type { Scenario } from '@/domain/types';
import { exportScenario, readScenarioFile } from '@/lib/file';
import { fitScenario, flyToView, resetView } from '@/lib/mapBridge';
import { storeEmbeddedMedia, withEmbeddedMedia } from '@/lib/mediaStore';
import { useEditorStore } from '@/store/editorStore';

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
  const fileIn = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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
    <header className="area-hd flex items-center gap-4 border-b border-line bg-panel px-4 max-[900px]:flex-wrap max-[900px]:py-2">
      <div className="font-display text-xl leading-none font-bold tracking-[0.08em] whitespace-nowrap uppercase">
        Mapa táctico <span className="text-accent">·</span> CO
      </div>
      <div className="min-w-0 flex-1 truncate text-[13px] text-muted">{name}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs whitespace-nowrap text-muted" aria-live="polite">
          {busy ? 'Procesando adjuntos…' : saveStatus}
        </span>
        <select
          aria-label="Abrir un ejemplo"
          className="w-auto! py-[5px]! text-[13px]"
          value=""
          onChange={(e) => onExample(Number(e.target.value))}
        >
          <option value="">Ejemplos…</option>
          {EXAMPLES.map((x, i) => (
            <option key={x.name} value={i}>
              {x.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={onNew}>
          Nuevo
        </button>
        <button type="button" className="btn" onClick={() => fileIn.current?.click()}>
          Abrir…
        </button>
        <button type="button" className="btn primary" disabled={busy} onClick={onExport}>
          Exportar .json
        </button>
      </div>
      <input ref={fileIn} type="file" accept=".json,application/json" hidden onChange={onFile} />
    </header>
  );
}
