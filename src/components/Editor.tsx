'use client';

import dynamic from 'next/dynamic';
import { Header } from './Header';
import { MapHint } from './map/MapHint';
import { Narration } from './timeline/Narration';

const TacticalMap = dynamic(() => import('./map/TacticalMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-mapbg" />,
});

export default function Editor() {
  return (
    <div className="app-grid">
      <Header />
      <aside className="area-pal min-h-0 overflow-auto border-r border-line bg-panel" />
      <main className="area-map relative min-h-0">
        <TacticalMap />
        <Narration />
        <MapHint />
      </main>
      <aside className="area-ins min-h-0 overflow-auto border-l border-line bg-panel" />
      <footer className="area-tl flex min-w-0 flex-col border-t border-line bg-panel" />
    </div>
  );
}
