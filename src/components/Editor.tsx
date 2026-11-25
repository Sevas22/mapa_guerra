'use client';

import dynamic from 'next/dynamic';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEditorStore } from '@/store/editorStore';
import { Header } from './Header';
import { View3DToggle } from './map3d/View3DToggle';
import { MediaViewer } from './media/Media';
import { Inspector } from './inspector/Inspector';
import { MapHint } from './map/MapHint';
import { Palette } from './palette/Palette';
import { Narration } from './timeline/Narration';
import { Timeline } from './timeline/Timeline';
import { Workspaces } from './workspaces/Workspaces';

const TacticalMap = dynamic(() => import('./map/TacticalMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-mapbg" />,
});

// MapLibre (unos 800 KB) solo se descarga al abrir la vista 3D.
const Map3D = dynamic(() => import('./map3d/Map3D'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 z-[400] bg-mapbg" />,
});

/** Consola de operaciones: paneles laterales alrededor del mapa y línea de tiempo abajo. */
export default function Editor() {
  useKeyboardShortcuts();
  const view3d = useEditorStore((s) => s.view3d);
  return (
    <div className="app-grid">
      <div className="area-cls cls-banner" role="note">
        SIN CLASIFICAR · EJERCICIO DE ENTRENAMIENTO · DATOS FICTICIOS
      </div>
      <Header />
      <aside
        className="area-pal min-h-0 overflow-auto border-r border-line bg-panel"
        aria-label="Herramientas"
      >
        {view3d && (
          <p className="m-3 mb-0 rounded border border-accent px-2.5 py-2 text-[12px] text-soft">
            Vista 3D: solo para ver y reproducir. Vuelve a <b>2D</b> para colocar o dibujar.
          </p>
        )}
        <div inert={view3d} className={view3d ? 'opacity-40' : undefined}>
          <Palette />
        </div>
      </aside>
      {/* En 3D el mapa Leaflet sigue montado (oculto) para conservar su estado. */}
      <main className="area-map relative min-h-0" data-view={view3d ? '3d' : '2d'}>
        <TacticalMap />
        <div className="map-frame" aria-hidden="true" />
        {view3d && <Map3D />}
        <View3DToggle />
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
      <Workspaces />
    </div>
  );
}
