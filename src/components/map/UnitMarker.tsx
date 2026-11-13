'use client';

import L from 'leaflet';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { round6 } from '@/domain/coords';
import { isDocPoint, markerSpecFor } from '@/domain/docCards';
import { objectStateAt } from '@/domain/timeline';
import type { PositionedObject } from '@/domain/types';
import { useEditorStore } from '@/store/editorStore';
import { useTimeSubscription } from './useTimeSubscription';

interface Props {
  obj: PositionedObject;
  selected: boolean;
  phaseCount: number;
}

/** Marcador arrastrable de una unidad o un punto. */
function UnitMarkerImpl({ obj, selected, phaseCount }: Props) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const canDrag = useEditorStore((s) => s.tool.mode === 'select' && !s.playing);
  const canDragRef = useRef(canDrag);
  // Las fichas dependen de los perfiles y grafos del escenario; el resto de símbolos no.
  const isDoc = isDocPoint(obj);
  const profiles = useEditorStore((s) => (isDoc ? s.scenario.profiles : undefined));
  const charts = useEditorStore((s) => (isDoc ? s.scenario.charts : undefined));

  const { id, kind } = obj;

  const syncDrag = useCallback(() => {
    const d = markerRef.current?.dragging;
    if (!d) return;
    if (canDragRef.current) d.enable();
    else d.disable();
  }, []);

  // Crear el marcador una sola vez.
  useEffect(() => {
    const m = L.marker([0, 0], {
      draggable: true,
      keyboard: false,
      riseOnHover: true,
      zIndexOffset: kind === 'unit' ? 100 : -100,
    });
    m.on('click', (e: L.LeafletMouseEvent) =>
      useEditorStore.getState().objectClick(id, e.latlng, e.originalEvent.shiftKey),
    );
    m.on('dragend', () => {
      const ll = m.getLatLng();
      useEditorStore.getState().setFrame(id, { lat: round6(ll.lat), lng: round6(ll.lng) });
    });
    markerRef.current = m;
    return () => {
      m.remove();
      markerRef.current = null;
    };
  }, [id, kind]);

  // Icono: cambia con el tipo, bando, escalón, etiqueta o la selección.
  useEffect(() => {
    markerRef.current?.setIcon(L.divIcon(markerSpecFor(obj, selected, { profiles, charts })));
  }, [obj, selected, profiles, charts]);

  useEffect(() => {
    canDragRef.current = canDrag;
    syncDrag();
  }, [canDrag, syncDrag]);

  // Posición, opacidad y visibilidad en el instante actual.
  const apply = useCallback(
    (time: number) => {
      const m = markerRef.current;
      if (!m) return;
      const st = objectStateAt(obj, time, phaseCount);
      if (!st || st.kind !== 'point') {
        m.remove();
        return;
      }
      m.setLatLng([st.lat, st.lng]);
      m.setOpacity(st.opacity);
      if (!map.hasLayer(m)) {
        m.addTo(map);
        syncDrag();
      }
    },
    [obj, phaseCount, map, syncDrag],
  );
  useTimeSubscription(apply);

  return null;
}

export const UnitMarker = memo(UnitMarkerImpl);
