'use client';

import dynamic from 'next/dynamic';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Header } from './Header';
import { MediaViewer } from './media/Media';
import { Inspector } from './inspector/Inspector';
import { MapHint } from './map/MapHint';
import { Palette } from './palette/Palette';
import { Narration } from './timeline/Narration';
import { Timeline } from './timeline/Timeline';

const TacticalMap = dynamic(() => import('./map/TacticalMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-mapbg" />,
});

/** Consola de operaciones: paneles laterales alrededor del mapa y línea de tiempo abajo. */
export default function Editor() {
  useKeyboardShortcuts();
  return (
    <div className="app-grid">
      <Header />
      <aside
        className="area-pal min-h-0 overflow-auto border-r border-line bg-panel"
        aria-label="Herramientas"
      >
        <Palette />
      </aside>
      <main className="area-map relative min-h-0">
        <TacticalMap />
        <Narration />
        <MapHint />
      </main>
      <aside
        className="area-ins min-h-0 overflow-auto border-l border-line bg-panel"
        aria-label="Inspector"
      >
        <Inspector />
      </aside>
      <footer className="area-tl flex min-w-0 flex-col border-t border-line bg-panel">
        <Timeline />
      </footer>
      <MediaViewer />
    </div>
  );
}
