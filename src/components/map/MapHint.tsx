'use client';

import { POINTS, UNITS, plainName } from '@/domain/catalog';
import { useEditorStore } from '@/store/editorStore';

/** Indicación flotante mientras hay una herramienta de colocación o dibujo activa. */
export function MapHint() {
  const tool = useEditorStore((s) => s.tool);
  const n = useEditorStore((s) => s.draft?.length ?? 0);
  const err = useEditorStore((s) => s.draftError);
  const setTool = useEditorStore((s) => s.setTool);
  const finishDraft = useEditorStore((s) => s.finishDraft);
  if (tool.mode === 'select') return null;

  let msg: React.ReactNode;
  if (tool.mode === 'place') {
    const name = plainName(tool.kind === 'unit' ? UNITS[tool.type].name : POINTS[tool.type].name);
    msg = (
      <>
        Clic en el mapa para colocar <b>{name}</b>. Mantén Shift para colocar varios.
      </>
    );
  } else {
    msg =
      err ??
      `${tool.redrawId ? 'Redibujando en esta fase. ' : ''}Clic para añadir vértices (${n}). Doble clic o Enter para terminar.`;
  }

  const btn =
    'btn !border-[rgba(0,0,0,.25)] !bg-[rgba(0,0,0,.15)] !px-[9px] !py-[3px] !text-accent-ink';
  return (
    <div
      role="status"
      className="absolute bottom-[34px] left-1/2 z-[600] flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2.5 rounded bg-accent py-[7px] pr-2 pl-3 text-[13px] font-medium text-accent-ink"
    >
      <span>{msg}</span>
      {tool.mode === 'draw' ? (
        <button type="button" className={btn} onClick={finishDraft}>
          Terminar
        </button>
      ) : null}
      <button type="button" className={btn} onClick={() => setTool({ mode: 'select' })}>
        Cancelar
      </button>
    </div>
  );
}
