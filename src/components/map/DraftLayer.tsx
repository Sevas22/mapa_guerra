'use client';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { draftMeasure, isAreaType } from '@/domain/measure';
import type { LatLngTuple } from '@/domain/types';
import { useEditorStore } from '@/store/editorStore';

/** Trazo en edición: línea discontinua con los vértices, una "goma" hasta el cursor y medidas. */
export function DraftLayer() {
  const map = useMap();
  const draft = useEditorStore((s) => s.draft);
  const layers = useRef<{ line: L.Polyline; rub: L.Polyline; tip: L.Tooltip } | null>(null);
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
    const tip = L.tooltip({
      permanent: true,
      direction: 'right',
      offset: [14, 0],
      className: 'ltip draft-measure',
      interactive: false,
    });
    layers.current = { line, rub, tip };
    return () => {
      line.remove();
      rub.remove();
      tip.remove();
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
      l.tip.remove();
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
      const l = layers.current;
      if (!d || !last || !l) return;
      const cursor: LatLngTuple = [e.latlng.lat, e.latlng.lng];
      l.rub.setLatLngs([last, cursor]);
      const tool = useEditorStore.getState().tool;
      const area = tool.mode === 'draw' && isAreaType(tool.type);
      l.tip.setLatLng(e.latlng).setContent(draftMeasure(d, cursor, area));
      if (!map.hasLayer(l.tip)) l.tip.addTo(map);
    },
  });

  return null;
}
