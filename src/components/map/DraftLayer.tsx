'use client';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { LatLngTuple } from '@/domain/types';
import { useEditorStore } from '@/store/editorStore';

/** Trazo en edición: línea discontinua con los vértices y una "goma" hasta el cursor. */
export function DraftLayer() {
  const map = useMap();
  const draft = useEditorStore((s) => s.draft);
  const layers = useRef<{ line: L.Polyline; rub: L.Polyline } | null>(null);
  const draftRef = useRef<LatLngTuple[] | null>(null);

  useEffect(() => {
    const line = L.polyline([], {
      color: '#fff',
      weight: 2.5,
      dashArray: '5 5',
      interactive: false,
    });
    const rub = L.polyline([], {
      color: '#fff',
      weight: 1.5,
      dashArray: '2 6',
      interactive: false,
    });
    layers.current = { line, rub };
    return () => {
      line.remove();
      rub.remove();
      layers.current = null;
    };
  }, []);

  useEffect(() => {
    draftRef.current = draft;
    const l = layers.current;
    if (!l) return;
    if (!draft) {
      l.line.remove();
      l.rub.remove();
      l.rub.setLatLngs([]);
      return;
    }
    l.line.setLatLngs(draft);
    if (!map.hasLayer(l.line)) l.line.addTo(map);
    if (!map.hasLayer(l.rub)) l.rub.addTo(map);
  }, [draft, map]);

  useMapEvents({
    mousemove: (e) => {
      const d = draftRef.current;
      const last = d?.[d.length - 1];
      if (last) layers.current?.rub.setLatLngs([last, [e.latlng.lat, e.latlng.lng]]);
    },
  });

  return null;
}
