'use client';

import { useEditorStore } from '@/store/editorStore';

/** Botón para pasar del mapa 2D a la vista 3D con relieve y volver. */
export function View3DToggle() {
  const view3d = useEditorStore((s) => s.view3d);
  return (
    <button
      type="button"
      aria-pressed={view3d}
      title={view3d ? 'Volver al mapa 2D para editar' : 'Ver el escenario en 3D con relieve'}
      className="absolute top-[124px] right-2.5 z-[700] flex h-[34px] w-[34px] items-center justify-center rounded border-2 border-[rgba(0,0,0,.2)] bg-panel font-display text-[13px] font-bold text-fg hover:border-muted aria-pressed:border-accent aria-pressed:text-accent"
      onClick={() => useEditorStore.getState().setView3d(!view3d)}
    >
      {view3d ? '2D' : '3D'}
    </button>
  );
}
