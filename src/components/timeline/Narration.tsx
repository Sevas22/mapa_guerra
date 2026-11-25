'use client';

import { useEditorStore } from '@/store/editorStore';
import { MediaThumb } from '../media/Media';

/** Recuadro de narración sobre el mapa: fase, fecha, título, descripción y adjuntos. */
export function Narration() {
  const current = useEditorStore((s) => s.current);
  const count = useEditorStore((s) => s.scenario.phases.length);
  const phase = useEditorStore((s) => s.scenario.phases[s.current]);
  if (!phase) return null;
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-[500] max-w-[min(380px,calc(100%-90px))] rounded border border-l-[3px] border-line border-l-accent bg-[rgba(18,23,19,.9)] px-3 py-2.5">
      <div className="font-mono text-[11px] font-medium tracking-[0.04em] text-accent">
        FASE {current + 1}/{count}
        {phase.date ? ` · ${phase.date}` : ''}
      </div>
      <div className="mt-[3px] text-lg leading-[1.2] font-semibold text-balance">{phase.title}</div>
      {phase.desc ? <div className="mt-[5px] text-[13px] text-soft">{phase.desc}</div> : null}
      {phase.media?.length ? (
        // La galería sí recibe clics (el resto del recuadro deja pasar el ratón al mapa).
        <div className="pointer-events-auto mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {phase.media.map((m, i) => (
            <MediaThumb key={m.id} items={phase.media ?? []} index={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
