import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';

/**
 * Llama a `apply(time)` ahora y cada vez que cambie el instante de la línea de
 * tiempo, fuera del ciclo de render de React. Es lo que permite animar las capas
 * de Leaflet a 60 fps sin re-renderizar el árbol.
 */
export function useTimeSubscription(apply: (time: number) => void): void {
  useEffect(() => {
    let prev = useEditorStore.getState().time;
    apply(prev);
    return useEditorStore.subscribe((s) => {
      if (s.time !== prev) {
        prev = s.time;
        apply(s.time);
      }
    });
  }, [apply]);
}
