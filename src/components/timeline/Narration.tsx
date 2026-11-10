'use client';

import { useEditorStore } from '@/store/editorStore';

/** Recuadro de narración sobre el mapa: fase, fecha, título y descripción. */
export function Narration() {
  const current = useEditorStore((s) => s.current);
  const count = useEditorStore((s) => s.scenario.phases.length);
  const phase = useEditorStore((s) => s.scenario.phases[s.current]);
  if (!phase) return null;
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-[500] max-w-[min(380px,calc(100%-90px))] rounded border border-l-[3px] border-line border-l-accent bg-[rgba(16,22,31,.9)] px-3 py-2.5">
      <div className="font-mono text-[11px] font-medium tracking-[0.04em] text-accent">
        FASE {current + 1}/{count}
        {phase.date ? ` · ${phase.date}` : ''}
      </div>
      <div className="mt-[3px] font-display text-xl leading-[1.1] font-bold tracking-[0.03em] text-balance uppercase">
        {phase.title}
      </div>
      {phase.desc ? <div className="mt-[5px] text-[13px] text-soft">{phase.desc}</div> : null}
    </div>
  );
}
