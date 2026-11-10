'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { togglePlayback } from './usePlayback';

const isTypingTarget = (el: Element | null): boolean =>
  !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || (el as HTMLElement).isContentEditable);

/**
 * ← → cambian de fase, Espacio reproduce o pausa, Supr borra la selección,
 * V selecciona, Enter termina un trazo y Esc suelta la herramienta.
 * Con el foco en un campo de texto solo responde Esc (que además quita el foco).
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useEditorStore.getState();
      const active = document.activeElement;
      const typing = isTypingTarget(active);
      if (e.key === 'Escape') {
        st.cancelDraft();
        st.setTool({ mode: 'select' });
        if (typing && active instanceof HTMLElement) active.blur();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' && st.draft) {
        st.finishDraft();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId) {
        e.preventDefault();
        st.deleteSelected();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        st.goto(st.current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        st.goto(st.current - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayback();
      } else if (e.key.toLowerCase() === 'v') {
        st.setTool({ mode: 'select' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
