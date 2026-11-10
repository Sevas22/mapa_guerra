'use client';

import L from 'leaflet';
import { useCallback, useEffect, useRef } from 'react';
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/domain/catalog';
import { formatCursor } from '@/domain/coords';
import { PULSE_ICON } from '@/domain/symbols';
import { fitScenario, setMap } from '@/lib/mapBridge';
import { useEditorStore } from '@/store/editorStore';
import { DraftLayer } from './DraftLayer';
import { TraceLayer } from './TraceLayer';
import { UnitMarker } from './UnitMarker';

/** Registra el mapa en el puente y coloca la vista inicial. */
function MapSetup() {
  const map = useMap();
  useEffect(() => {
    setMap(map);
    const s = useEditorStore.getState().scenario;
    const v = s.phases[0]?.view;
    if (v) map.setView(v.c, v.z);
    else fitScenario(s);
    return () => setMap(null);
  }, [map]);
  return null;
}

/** Eventos del mapa: clic, doble clic, lectura de coordenadas y estado de la herramienta. */
function MapInteraction({ onCursor }: { onCursor: (text: string) => void }) {
  const map = useMapEvents({
    click: (e) => useEditorStore.getState().mapClick(e.latlng, e.originalEvent.shiftKey),
    dblclick: () => {
      const st = useEditorStore.getState();
      if (st.tool.mode === 'draw') st.finishDraft();
    },
    mousemove: (e) => onCursor(formatCursor(e.latlng.lat, e.latlng.lng, map.getZoom())),
  });
  const mode = useEditorStore((s) => s.tool.mode);
  useEffect(() => {
    map.getContainer().classList.toggle('placing', mode !== 'select');
    if (mode === 'draw') map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [map, mode]);
  return null;
}

/** Marcador pulsante de "Ir a coordenadas". */
function GotoMarker() {
  const map = useMap();
  const target = useEditorStore((s) => s.gotoTarget);
  useEffect(() => {
    if (!target) return;
    const m = L.marker([target.lat, target.lng], {
      icon: L.divIcon(PULSE_ICON),
      interactive: false,
      keyboard: false,
    }).addTo(map);
    return () => {
      m.remove();
    };
  }, [map, target]);
  return null;
}

function ObjectLayers() {
  const objects = useEditorStore((s) => s.scenario.objects);
  const phaseCount = useEditorStore((s) => s.scenario.phases.length);
  const selectedId = useEditorStore((s) => s.selectedId);
  return (
    <>
      {objects.map((o) =>
        o.kind === 'line' ? (
          // La clave incluye el tipo: polígono y polilínea son capas distintas.
          <TraceLayer
            key={`${o.id}:${o.type}`}
            obj={o}
            selected={o.id === selectedId}
            phaseCount={phaseCount}
          />
        ) : (
          <UnitMarker key={o.id} obj={o} selected={o.id === selectedId} phaseCount={phaseCount} />
        ),
      )}
    </>
  );
}

/** Contenedor Leaflet. Solo se carga en cliente (ver `next/dynamic` en el editor). */
export default function TacticalMap() {
  const readout = useRef<HTMLDivElement | null>(null);
  // Se actualiza el DOM directamente: el cursor se mueve demasiado rápido para usar estado.
  const onCursor = useCallback((text: string) => {
    if (readout.current) readout.current.textContent = text;
  }, []);
  return (
    <>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={4}
        zoomControl={false}
        worldCopyJump
        className="absolute inset-0 bg-mapbg"
      >
        <ZoomControl position="topright" />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <LayerGroup>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                attribution="Imágenes © Esri, Maxar, Earthstar Geographics"
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                attribution="Etiquetas © Esri"
              />
            </LayerGroup>
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topográfico">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
              attribution="© OpenTopoMap (CC-BY-SA), © OpenStreetMap"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Calles">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={19}
              subdomains="abcd"
              attribution="© OpenStreetMap, © CARTO"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <ScaleControl imperial={false} position="bottomleft" />
        <MapSetup />
        <MapInteraction onCursor={onCursor} />
        <ObjectLayers />
        <DraftLayer />
        <GotoMarker />
      </MapContainer>
      <div
        ref={readout}
        className="pointer-events-none absolute right-2.5 bottom-[22px] z-[500] rounded-[3px] border border-line bg-[rgba(16,22,31,.88)] px-2 py-[3px] font-mono text-xs text-soft tabular-nums"
      >
        —
      </div>
    </>
  );
}
