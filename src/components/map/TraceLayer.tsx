'use client';

import L from 'leaflet';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { FACTIONS, LINES } from '@/domain/catalog';
import { HEAD_ICON, esc, headAngle, lineStyle } from '@/domain/symbols';
import { objectStateAt } from '@/domain/timeline';
import type { LatLngTuple, LineObject } from '@/domain/types';
import { useEditorStore } from '@/store/editorStore';
import { useTimeSubscription } from './useTimeSubscription';

interface Props {
  obj: LineObject;
  selected: boolean;
  phaseCount: number;
}

interface Layers {
  main: L.Polyline | L.Polygon;
  head: L.Marker | null;
}

/** Orienta la punta de flecha según el último segmento. */
function updateHead(map: L.Map, head: L.Marker, pts: LatLngTuple[], color: string, op: number) {
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  if (!a || !b) return;
  const deg = headAngle(map.project(a, 12), map.project(b, 12));
  head.setLatLng(b);
  head.setOpacity(0.9 * op);
  const inner = head.getElement()?.firstElementChild;
  if (inner instanceof HTMLElement) {
    inner.style.transform = `rotate(${deg}deg)`;
    inner.style.color = color;
  }
}

/** Polilínea o polígono de un trazo, con punta de flecha en el eje de avance. */
function TraceLayerImpl({ obj, selected, phaseCount }: Props) {
  const map = useMap();
  const ref = useRef<Layers | null>(null);
  const { id, type } = obj;

  useEffect(() => {
    const opts: L.PolylineOptions = { bubblingMouseEvents: false };
    const main = type === 'zona' || LINES[type]?.area ? L.polygon([], opts) : L.polyline([], opts);
    main.on('click', (e: L.LeafletMouseEvent) =>
      useEditorStore.getState().objectClick(id, e.latlng, e.originalEvent.shiftKey),
    );
    const head =
      type === 'eje'
        ? L.marker([0, 0], { icon: L.divIcon(HEAD_ICON), interactive: false, keyboard: false })
        : null;
    ref.current = { main, head };
    return () => {
      main.remove();
      head?.remove();
      ref.current = null;
    };
  }, [id, type]);

  const area = LINES[type]?.area;
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.main.unbindTooltip();
    const html = (area ? `<span class="area-badge">${area}</span>` : '') + esc(obj.label);
    if (obj.label || area)
      l.main.bindTooltip(html, {
        permanent: true,
        direction: 'center',
        className: 'ltip',
        interactive: false,
      });
  }, [obj.label, area]);

  const apply = useCallback(
    (time: number) => {
      const l = ref.current;
      if (!l) return;
      const st = objectStateAt(obj, time, phaseCount);
      if (!st || st.kind !== 'line') {
        l.main.remove();
        l.head?.remove();
        return;
      }
      l.main.setLatLngs(st.pts);
      l.main.setStyle(lineStyle(obj, st.opacity, selected));
      if (!map.hasLayer(l.main)) l.main.addTo(map);
      // Mantener la etiqueta centrada mientras el trazo se mueve.
      const tip = l.main.getTooltip();
      if (tip && st.pts.length) tip.setLatLng(l.main.getCenter());
      if (l.head) {
        if (!map.hasLayer(l.head)) l.head.addTo(map);
        updateHead(map, l.head, st.pts, FACTIONS[obj.faction].vivid, st.opacity);
      }
    },
    [obj, phaseCount, selected, map],
  );
  useTimeSubscription(apply);

  return null;
}

export const TraceLayer = memo(TraceLayerImpl);
