'use client';

import L from 'leaflet';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { FACTIONS, LINES } from '@/domain/catalog';
import { HEAD_ICON, esc, headAngle, lineStyle } from '@/domain/symbols';
import { objectStateAt } from '@/domain/timeline';
import { areaSummary, formatSide, isAreaType, polygonSides } from '@/domain/measure';
import { hasTravel, travelSummary } from '@/domain/travel';
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
  /** Rótulos con la longitud de cada lado de un área. */
  sides: L.LayerGroup;
  /** Vértices con que se construyeron los rótulos de lados (para no rehacerlos en cada cuadro). */
  sidesKey: string;
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
    ref.current = { main, head, sides: L.layerGroup(), sidesKey: '' };
    const sides = ref.current.sides;
    return () => {
      main.remove();
      head?.remove();
      sides.remove();
      ref.current = null;
    };
  }, [id, type]);

  const area = LINES[type]?.area;
  const travel = hasTravel(type) ? obj.travel : undefined;
  /** Las áreas rotulan su área, perímetro y lados salvo que se oculten en el inspector. */
  const measures = isAreaType(type) && !obj.hideMeasures;
  /** Último resumen de distancia/tiempo mostrado, para no reescribir la etiqueta en cada frame. */
  const lastSummary = useRef('');
  const tooltipHtml = useCallback(
    (summary: string) =>
      (area ? `<span class="area-badge">${area}</span>` : '') +
      esc(obj.label) +
      (summary ? `<span class="trip">${esc(summary)}</span>` : ''),
    [area, obj.label],
  );
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.main.unbindTooltip();
    lastSummary.current = '';
    if (obj.label || area || travel || measures)
      l.main.bindTooltip(tooltipHtml(''), {
        permanent: true,
        direction: 'center',
        className: 'ltip',
        interactive: false,
      });
  }, [obj.label, area, travel, measures, tooltipHtml]);

  const apply = useCallback(
    (time: number) => {
      const l = ref.current;
      if (!l) return;
      const st = objectStateAt(obj, time, phaseCount);
      if (!st || st.kind !== 'line') {
        l.main.remove();
        l.head?.remove();
        l.sides.remove();
        return;
      }
      l.main.setLatLngs(st.pts);
      l.main.setStyle(lineStyle(obj, st.opacity, selected));
      if (!map.hasLayer(l.main)) l.main.addTo(map);
      // Mantener la etiqueta centrada mientras el trazo se mueve.
      const tip = l.main.getTooltip();
      if (tip && st.pts.length) {
        tip.setLatLng(l.main.getCenter());
        const summary = travel
          ? travelSummary(st.pts, travel)
          : measures
            ? areaSummary(st.pts)
            : '';
        if (summary !== lastSummary.current) {
          lastSummary.current = summary;
          tip.setContent(tooltipHtml(summary));
        }
      }
      // Longitud de cada lado, en el punto medio del lado.
      if (measures && st.pts.length >= 3) {
        const key = st.pts.map((p) => p.join(',')).join(';');
        if (key !== l.sidesKey) {
          l.sidesKey = key;
          l.sides.clearLayers();
          for (const sd of polygonSides(st.pts))
            l.sides.addLayer(
              L.marker(sd.mid, {
                interactive: false,
                keyboard: false,
                icon: L.divIcon({
                  className: 'seg-len',
                  html: `<span>${formatSide(sd.km)}</span>`,
                  iconSize: [0, 0],
                }),
              }),
            );
        }
        l.sides.eachLayer((m) => (m as L.Marker).setOpacity(st.opacity));
        if (!map.hasLayer(l.sides)) l.sides.addTo(map);
      } else if (map.hasLayer(l.sides)) {
        l.sides.remove();
        l.sidesKey = '';
      }
      if (l.head) {
        if (!map.hasLayer(l.head)) l.head.addTo(map);
        updateHead(map, l.head, st.pts, FACTIONS[obj.faction].vivid, st.opacity);
      }
    },
    [obj, phaseCount, selected, map, travel, measures, tooltipHtml],
  );
  useTimeSubscription(apply);

  return null;
}

export const TraceLayer = memo(TraceLayerImpl);
