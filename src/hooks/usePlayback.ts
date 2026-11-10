'use client';

import { useEffect } from 'react';
import { PHASE_HOLD_MS } from '@/domain/catalog';
import { easeInOutQuad } from '@/domain/timeline';
import { flyToView } from '@/lib/mapBridge';
import { useEditorStore } from '@/store/editorStore';

/**
 * Motor de reproducción (bucle `requestAnimationFrame`), portado de `play()`/`stop()`
 * del prototipo. Escribe `time` y `progress` en el store; las capas del mapa y la
 * barra de progreso los leen por suscripción, sin re-renderizar React en cada frame.
 */
let raf: number | null = null;

export function stopPlayback(): void {
  const st = useEditorStore.getState();
  if (raf != null) cancelAnimationFrame(raf);
  raf = null;
  if (!st.playing) return;
  useEditorStore.setState({ playing: false, time: st.current, progress: 0 });
}

export function startPlayback(): void {
  let st = useEditorStore.getState();
  const n = st.scenario.phases.length;
  if (n < 2 || st.playing) return;
  if (st.current >= n - 1) st.goto(0);
  if (st.draft) st.cancelDraft();
  if (st.tool.mode !== 'select') st.setTool({ mode: 'select' });
  if (st.selectedId) st.select(null);
  st.setPlaying(true);

  st = useEditorStore.getState();
  const speed = st.scenario.speed;
  const dur = speed * 1000;
  let from = st.current;
  let t0: number | null = null;
  let flown = false;

  const step = (ts: number) => {
    const s = useEditorStore.getState();
    if (!s.playing) {
      raf = null;
      return;
    }
    if (t0 == null) t0 = ts;
    const t = (ts - t0 - PHASE_HOLD_MS) / dur;
    if (t > 0 && !flown) {
      flown = true;
      flyToView(s.scenario.phases[from + 1]?.view ?? null, speed);
    }
    if (t >= 1) {
      from++;
      t0 = ts;
      flown = false;
      useEditorStore.setState({ current: from, time: from, progress: 0 });
      if (from >= s.scenario.phases.length - 1) {
        stopPlayback();
        return;
      }
    } else {
      const tt = Math.max(0, t);
      s.setPlayhead(from + easeInOutQuad(tt), tt);
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

export function togglePlayback(): void {
  if (useEditorStore.getState().playing) stopPlayback();
  else startPlayback();
}

/** Expone el motor y detiene la reproducción al desmontar. */
export function usePlayback() {
  const playing = useEditorStore((s) => s.playing);
  useEffect(() => stopPlayback, []);
  return { playing, play: startPlayback, stop: stopPlayback, toggle: togglePlayback };
}
