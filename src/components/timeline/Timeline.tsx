'use client';

import { useEffect, useRef } from 'react';
import { SPEEDS } from '@/domain/catalog';
import { usePlayback } from '@/hooks/usePlayback';
import { useEditorStore } from '@/store/editorStore';

/** Barra de progreso de la transición; se actualiza por suscripción, sin re-render. */
function ProgressBar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const paint = (p: number) => {
      if (ref.current) ref.current.style.width = `${p * 100}%`;
    };
    paint(useEditorStore.getState().progress);
    return useEditorStore.subscribe((s, prev) => {
      if (s.progress !== prev.progress) paint(s.progress);
    });
  }, []);
  return <div ref={ref} className="h-0.5 w-0 bg-accent" />;
}

function PhaseChips() {
  const phases = useEditorStore((s) => s.scenario.phases);
  const current = useEditorStore((s) => s.current);
  const goto = useEditorStore((s) => s.goto);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  return (
    <div className="flex flex-1 items-stretch overflow-x-auto px-3.5 py-2.5">
      {phases.map((p, i) => (
        <button
          key={p.id}
          ref={i === current ? activeRef : undefined}
          type="button"
          className={`chip${i === current ? ' on' : i < current ? ' past' : ''}`}
          aria-current={i === current ? 'step' : undefined}
          onClick={() => goto(i)}
        >
          <span className="n">
            {String(i + 1).padStart(2, '0')}
            {p.date ? ` · ${p.date}` : ''}
          </span>
          <span className="t">{p.title}</span>
        </button>
      ))}
    </div>
  );
}

/** Controles de reproducción y fases. */
export function Timeline() {
  const { playing, toggle } = usePlayback();
  const current = useEditorStore((s) => s.current);
  const count = useEditorStore((s) => s.scenario.phases.length);
  const speed = useEditorStore((s) => s.scenario.speed);
  const goto = useEditorStore((s) => s.goto);
  const setSpeed = useEditorStore((s) => s.setSpeed);
  const addPhase = useEditorStore((s) => s.addPhase);
  const deletePhase = useEditorStore((s) => s.deleteCurrentPhase);
  const title = useEditorStore((s) => s.scenario.phases[s.current]?.title ?? '');

  const onDelete = () => {
    if (count <= 1) return;
    if (
      !confirm(
        `¿Eliminar la fase ${current + 1} «${title}»? Los objetos que solo existen en ella también se borran.`,
      )
    )
      return;
    deletePhase();
  };

  return (
    <>
      <ProgressBar />
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-2">
        <button
          type="button"
          className="btn ico"
          title="Fase anterior (←)"
          aria-label="Fase anterior"
          onClick={() => goto(current - 1)}
        >
          ◀◀
        </button>
        <button
          type="button"
          className="btn ico primary"
          title={playing ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          onClick={toggle}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          className="btn ico"
          title="Fase siguiente (→)"
          aria-label="Fase siguiente"
          onClick={() => goto(current + 1)}
        >
          ▶▶
        </button>
        <label className="note" htmlFor="speed">
          Transición
        </label>
        <select
          id="speed"
          className="w-auto!"
          value={String(speed)}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((v) => (
            <option key={v} value={v}>
              {v} s
            </option>
          ))}
        </select>
        <span className="flex-1" />
        <button type="button" className="btn" onClick={addPhase}>
          + Fase después de esta
        </button>
        <button type="button" className="btn danger" disabled={count <= 1} onClick={onDelete}>
          Eliminar fase
        </button>
      </div>
      <PhaseChips />
    </>
  );
}
