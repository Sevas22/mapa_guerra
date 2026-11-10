'use client';

import dynamic from 'next/dynamic';

/**
 * El editor completo se monta solo en cliente: el estado se hidrata desde
 * `localStorage` y Leaflet necesita `window`. Así se evitan desajustes de hidratación.
 */
const Editor = dynamic(() => import('./Editor'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center font-display text-xl font-bold tracking-[0.08em] text-muted uppercase">
      Cargando mapa táctico…
    </div>
  ),
});

export function EditorLoader() {
  return <Editor />;
}
