'use client';

import L from 'leaflet';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { esc } from '@/domain/symbols';
import { TASKS, taskGeometry, type TaskType } from '@/domain/tasks';
import { objectStateAt } from '@/domain/timeline';
import type { LatLngTuple, LineObject } from '@/domain/types';
import { useEditorStore } from '@/store/editorStore';
import { useTimeSubscription } from './useTimeSubscription';

interface Props {
  obj: LineObject & { type: TaskType };
  selected: boolean;
  phaseCount: number;
}

interface Layers {
  group: L.LayerGroup;
  halos: (L.Polyline | L.Polygon)[];
  lines: (L.Polyline | L.Polygon)[];
  labels: L.Marker[];
}

const INK = '#ffffff';
const HALO = '#0b0f15';
const SELECTED = '#FFD23F';

const labelIcon = (text: string, color: string) =>
  L.divIcon({
    className: 'symwrap',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div class="task-lbl" style="color:${color}">${esc(text)}</div>`,
  });

/**
 * Tarea táctica (MFRE 1-02, cap. 9): figura de varias líneas y letras generada a
 * partir de los dos puntos del trazo. Se dibuja en blanco con halo oscuro para
 * leerse sobre imagen satelital y sobre mapas claros.
 */
function TaskLayerImpl({ obj, selected, phaseCount }: Props) {
  const map = useMap();
  const ref = useRef<Layers | null>(null);
  const { id, type } = obj;

  useEffect(() => {
    const shape = TASKS[type].shape();
    const group = L.layerGroup();
    const onClick = (e: L.LeafletMouseEvent) =>
      useEditorStore.getState().objectClick(id, e.latlng, e.originalEvent.shiftKey);
    const halos: (L.Polyline | L.Polygon)[] = [];
    const lines: (L.Polyline | L.Polygon)[] = [];
    for (const p of shape.paths) {
      const opts = { lineCap: 'round', lineJoin: 'round', bubblingMouseEvents: false } as const;
      const halo = (p.closed ? L.polygon([], opts) : L.polyline([], opts)).on('click', onClick);
      const line = (p.closed ? L.polygon([], opts) : L.polyline([], opts)).on('click', onClick);
      halos.push(halo);
      lines.push(line);
      group.addLayer(halo);
    }
    for (const l of lines) group.addLayer(l);
    const labels = shape.labels.map((l) =>
      L.marker([0, 0], { icon: labelIcon(l.text, INK), interactive: false, keyboard: false }),
    );
    for (const m of labels) group.addLayer(m);
    ref.current = { group, halos, lines, labels };
    return () => {
      group.remove();
      ref.current = null;
    };
  }, [id, type]);

  const apply = useCallback(
    (time: number) => {
      const l = ref.current;
      if (!l) return;
      const st = objectStateAt(obj, time, phaseCount);
      if (!st || st.kind !== 'line' || st.pts.length < 2) {
        l.group.remove();
        return;
      }
      const a = st.pts[0] as LatLngTuple;
      const b = st.pts[st.pts.length - 1] as LatLngTuple;
      const geo = taskGeometry(type, a, b);
      const color = selected ? SELECTED : INK;
      geo.paths.forEach((p, i) => {
        const dash = p.dashed ? '8 6' : undefined;
        l.halos[i]?.setLatLngs(p.pts).setStyle({
          color: HALO,
          weight: selected ? 7 : 5.5,
          opacity: 0.75 * st.opacity,
          dashArray: dash,
          fill: false,
        });
        l.lines[i]?.setLatLngs(p.pts).setStyle({
          color,
          weight: selected ? 3.2 : 2.4,
          opacity: st.opacity,
          dashArray: dash,
          fill: false,
        });
      });
      geo.labels.forEach((lab, i) => {
        const m = l.labels[i];
        if (!m) return;
        m.setLatLng(lab.at);
        m.setOpacity(st.opacity);
      });
      if (!map.hasLayer(l.group)) l.group.addTo(map);
      // El color de las letras sigue a la selección.
      l.labels.forEach((m, i) => {
        const el = m.getElement()?.firstElementChild;
        if (el instanceof HTMLElement) el.style.color = color;
        else if (geo.labels[i]) m.setIcon(labelIcon(geo.labels[i].text, color));
      });
    },
    [obj, phaseCount, selected, map, type],
  );
  useTimeSubscription(apply);

  return null;
}

export const TaskLayer = memo(TaskLayerImpl);
