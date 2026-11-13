'use client';

import {
  Map as GlMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OVERLAYS, basemapById, DEFAULT_BASEMAP } from '@/domain/basemaps';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/domain/catalog';
import {
  DEFAULT_PITCH,
  DEM_ATTRIBUTION,
  DEM_MAX_ZOOM,
  DEM_TILES,
  EXAGGERATIONS,
  glLayers,
  glRasterSource,
  sceneAt,
  toGlZoom,
  toLeafletZoom,
  type SceneLabel,
} from '@/domain/scene3d';
import { markerSpecFor, type DocContext } from '@/domain/docCards';
import type { IconSpec } from '@/domain/symbols';
import type { MapObject } from '@/domain/types';
import { currentView, getMap, setMap3d } from '@/lib/mapBridge';
import { useEditorStore } from '@/store/editorStore';
import { useMapStyleStore } from '@/store/mapStyleStore';
import { createModelLayer, type ModelLayer } from './modelLayer';

// MapLibre dibuja en un worker aparte; el empaquetador sirve el archivo y da su URL.
setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);

const SCENE_LAYERS = ['scene-fill', 'scene-line', 'scene-dash'];

function initialStyle(exaggeration: number): StyleSpecification {
  return {
    version: 8,
    sources: {
      dem: {
        type: 'raster-dem',
        tiles: [DEM_TILES],
        tileSize: 256,
        maxzoom: DEM_MAX_ZOOM,
        encoding: 'terrarium',
        attribution: DEM_ATTRIBUTION,
      },
      scene: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0b0f15' } },
      {
        id: 'scene-fill',
        type: 'fill',
        source: 'scene',
        filter: ['==', ['get', 'kind'], 'fill'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] },
      },
      {
        id: 'scene-line',
        type: 'line',
        source: 'scene',
        filter: ['all', ['==', ['get', 'kind'], 'line'], ['!', ['get', 'dashed']]],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
        },
      },
      {
        id: 'scene-dash',
        type: 'line',
        source: 'scene',
        filter: ['all', ['==', ['get', 'kind'], 'line'], ['get', 'dashed']],
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
          'line-dasharray': [2.5, 2],
        },
      },
    ],
    terrain: { source: 'dem', exaggeration },
    sky: {
      'sky-color': '#5d8fc4',
      'horizon-color': '#c9d8e6',
      'fog-color': '#b8c7d6',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.9,
    },
  };
}

/** Símbolo HTML por objeto y selección: los objetos son inmutables, así que se puede cachear. */
const specCache = new WeakMap<MapObject, { sel: boolean; ctx: DocContext; spec: IconSpec }>();
function cachedSpec(
  o: Extract<MapObject, { kind: 'unit' | 'point' }>,
  sel: boolean,
  ctx: DocContext,
): IconSpec {
  const c = specCache.get(o);
  if (c && c.sel === sel && c.ctx.profiles === ctx.profiles && c.ctx.charts === ctx.charts)
    return c.spec;
  const spec = markerSpecFor(o, sel, ctx);
  specCache.set(o, { sel, ctx, spec });
  return spec;
}

interface MarkerEntry {
  marker: Marker;
  /** Contenedor interior: su opacidad es la del fundido (MapLibre usa la del exterior). */
  inner: HTMLDivElement;
  key: string;
}

/** Panel inferior: exageración del relieve, inclinación y norte. */
function Controls3D({
  map,
  skipped,
  bigModels,
  setBigModels,
  hasModels,
}: {
  map: GlMap | null;
  skipped: number;
  bigModels: boolean;
  setBigModels: (on: boolean) => void;
  hasModels: boolean;
}) {
  const exaggeration = useMapStyleStore((s) => s.exaggeration);
  const setExaggeration = useMapStyleStore((s) => s.setExaggeration);
  return (
    <div className="absolute bottom-[34px] left-2.5 z-[450] flex max-w-[calc(100%-20px)] flex-col gap-1.5 rounded border border-line bg-[rgba(16,22,31,.9)] px-2.5 py-2 text-[12px] text-soft">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11px] tracking-wider text-muted uppercase">Relieve</span>
        {EXAGGERATIONS.map((x) => (
          <button
            key={x}
            type="button"
            aria-pressed={exaggeration === x}
            className="btn px-1.5! py-0.5! text-xs! aria-pressed:border-accent aria-pressed:text-accent"
            onClick={() => setExaggeration(x)}
          >
            ×{String(x).replace('.', ',')}
          </button>
        ))}
        <button
          type="button"
          className="btn px-1.5! py-0.5! text-xs!"
          title="Alternar vista cenital e inclinada"
          onClick={() => map?.easeTo({ pitch: map.getPitch() > 5 ? 0 : DEFAULT_PITCH })}
        >
          Inclinar
        </button>
        <button
          type="button"
          className="btn px-1.5! py-0.5! text-xs!"
          title="Orientar al norte"
          onClick={() => map?.easeTo({ bearing: 0 })}
        >
          Norte
        </button>
        {hasModels ? (
          <button
            type="button"
            className="btn px-1.5! py-0.5! text-xs!"
            title="Los modelos a tamaño real casi no se ven de lejos; «visibles» los agranda según el zoom"
            onClick={() => setBigModels(!bigModels)}
          >
            Modelos: {bigModels ? 'visibles' : 'tamaño real'}
          </button>
        ) : null}
      </div>
      <div className="text-[11px] text-muted">
        Clic derecho y arrastrar (o Ctrl + arrastrar): girar e inclinar.
        {skipped > 0 && ' Las capas IGAC y DANE solo se ven en 2D.'}
      </div>
    </div>
  );
}

/**
 * Vista 3D con MapLibre: el mapa base elegido sobre el relieve real, con los objetos de la
 * fase y su animación. Solo para ver y reproducir; la edición se hace en el mapa 2D.
 */
export default function Map3D() {
  const box = useRef<HTMLDivElement>(null);
  const [map, setMapState] = useState<GlMap | null>(null);
  const markers = useRef(new Map<string, MarkerEntry>());
  const labels = useRef(new Map<string, MarkerEntry>());
  const baseId = useMapStyleStore((s) => s.baseId);
  const overlayIds = useMapStyleStore((s) => s.overlays);
  const exaggeration = useMapStyleStore((s) => s.exaggeration);
  const modelLayer = useRef<ModelLayer | null>(null);
  const [bigModels, setBigModels] = useState(true);
  const hasModels = useEditorStore((s) =>
    s.scenario.objects.some((o) => o.kind === 'unit' && !!o.model3d),
  );

  // Crear el mapa una vez, con la cámara del mapa 2D.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const v = currentView();
    const c = v?.c ?? DEFAULT_CENTER;
    const m = new GlMap({
      container: el,
      style: initialStyle(useMapStyleStore.getState().exaggeration),
      center: [c[1], c[0]],
      zoom: toGlZoom(v?.z ?? DEFAULT_ZOOM),
      pitch: DEFAULT_PITCH,
      maxPitch: 85,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    m.on('click', (e: MapMouseEvent) => {
      const st = useEditorStore.getState();
      if (st.playing) return;
      const hit = m.queryRenderedFeatures(e.point, { layers: SCENE_LAYERS })[0];
      st.select((hit?.properties.id as string | undefined) ?? null);
    });
    m.on('load', () => {
      // Aeronaves y drones en 3D, encima de todo.
      const layer = createModelLayer();
      m.addLayer(layer);
      modelLayer.current = layer;
      setMap3d(m);
      setMapState(m);
    });
    const markerMap = markers.current;
    const labelMap = labels.current;
    return () => {
      // Al volver a 2D, el mapa Leaflet queda donde estaba la cámara 3D.
      const center = m.getCenter();
      getMap()?.setView([center.lat, center.lng], Math.round(toLeafletZoom(m.getZoom())), {
        animate: false,
      });
      setMap3d(null);
      markerMap.clear();
      labelMap.clear();
      m.remove();
    };
  }, []);

  // Mapa base y capas superpuestas.
  const base = basemapById(baseId);
  const { layers: rasterLayers, skipped } = glLayers(
    base,
    OVERLAYS.filter((o) => overlayIds.includes(o.id)),
    basemapById(DEFAULT_BASEMAP),
  );
  const layersKey = rasterLayers.map((l) => l.id).join(',');
  useEffect(() => {
    if (!map) return;
    const style = map.getStyle();
    for (const l of style.layers) if (l.id.startsWith('bm-')) map.removeLayer(l.id);
    for (const id of Object.keys(style.sources)) if (id.startsWith('bm-')) map.removeSource(id);
    for (const l of rasterLayers) {
      map.addSource(`bm-${l.id}`, { type: 'raster', ...glRasterSource(l.source) });
      map.addLayer(
        {
          id: `bm-${l.id}`,
          type: 'raster',
          source: `bm-${l.id}`,
          paint: { 'raster-opacity': l.source.opacity ?? 1 },
        },
        'scene-fill',
      );
    }
    // rasterLayers se deriva de layersKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, layersKey]);

  useEffect(() => {
    map?.setTerrain({ source: 'dem', exaggeration });
  }, [map, exaggeration]);

  useEffect(() => {
    modelLayer.current?.setVisibleScale(bigModels);
  }, [bigModels, map]);

  /** Coloca o actualiza un marcador HTML. */
  const upsert = useCallback(
    (
      store: Map<string, MarkerEntry>,
      key: string,
      at: [number, number],
      opacity: number,
      contentKey: string,
      build: (inner: HTMLDivElement, marker: Marker) => void,
      onClick?: () => void,
    ) => {
      if (!map) return;
      let e = store.get(key);
      if (!e) {
        const root = document.createElement('div');
        const inner = document.createElement('div');
        root.appendChild(inner);
        if (onClick)
          root.addEventListener('click', (ev) => {
            ev.stopPropagation();
            onClick();
          });
        else root.style.pointerEvents = 'none';
        const marker = new Marker({ element: root, anchor: 'top-left', subpixelPositioning: true })
          .setLngLat(at)
          .addTo(map);
        e = { marker, inner, key: '' };
        store.set(key, e);
      }
      if (e.key !== contentKey) {
        build(e.inner, e.marker);
        e.key = contentKey;
      }
      e.marker.setLngLat(at);
      e.inner.style.opacity = String(opacity);
    },
    [map],
  );

  const render = useCallback(() => {
    if (!map) return;
    const st = useEditorStore.getState();
    const { objects, phases } = st.scenario;
    const scene = sceneAt(objects, st.time, phases.length, st.selectedId);
    (map.getSource('scene') as GeoJSONSource | undefined)?.setData(scene.shapes);

    const byId = new Map(objects.map((o) => [o.id, o]));
    const seen = new Set<string>();
    for (const p of scene.points) {
      const o = byId.get(p.id);
      if (!o || o.kind === 'line') continue;
      seen.add(p.id);
      const spec = cachedSpec(o, o.id === st.selectedId, {
        profiles: st.scenario.profiles,
        charts: st.scenario.charts,
      });
      upsert(
        markers.current,
        p.id,
        [p.lng, p.lat],
        p.opacity,
        spec.html,
        (inner, marker) => {
          inner.className = spec.className;
          inner.style.width = `${spec.iconSize[0]}px`;
          inner.style.height = `${spec.iconSize[1]}px`;
          inner.innerHTML = spec.html;
          marker.setOffset([-spec.iconAnchor[0], -spec.iconAnchor[1]]);
          marker.getElement().style.zIndex =
            o.kind === 'unit' ? '2' : o.type === 'perfil' || o.type === 'grafo' ? '0' : '1';
        },
        () => {
          if (!useEditorStore.getState().playing) useEditorStore.getState().select(p.id);
        },
      );
    }
    for (const [id, e] of markers.current)
      if (!seen.has(id)) {
        e.marker.remove();
        markers.current.delete(id);
      }

    const seenLabels = new Set<string>();
    const buildLabel = (l: SceneLabel) => (inner: HTMLDivElement) => {
      inner.className = l.className;
      inner.innerHTML = l.html;
      inner.style.color = l.color ?? '';
    };
    for (const l of scene.labels) {
      seenLabels.add(l.key);
      upsert(labels.current, l.key, [l.lng, l.lat], l.opacity, l.html + l.color, buildLabel(l));
    }
    for (const [key, e] of labels.current)
      if (!seenLabels.has(key)) {
        e.marker.remove();
        labels.current.delete(key);
      }
  }, [map, upsert]);

  // Redibujar con cada instante de la línea de tiempo y con cada cambio del escenario.
  useEffect(() => {
    if (!map) return;
    render();
    return useEditorStore.subscribe((s, prev) => {
      if (
        s.time !== prev.time ||
        s.scenario !== prev.scenario ||
        s.selectedId !== prev.selectedId
      ) {
        render();
        map.triggerRepaint();
      }
    });
  }, [map, render]);

  return (
    <div className="absolute inset-0 z-[400] overflow-hidden">
      {/* Sin className: MapLibre añade sus clases a este nodo y React no debe pisarlas. El
          estilo va en línea porque el CSS de MapLibre (sin capa) pondría `position: relative`
          encima de las utilidades de Tailwind y el mapa quedaría con 0 px de alto. */}
      <div ref={box} style={{ position: 'absolute', inset: 0, background: 'var(--color-mapbg)' }} />
      <Controls3D
        map={map}
        skipped={skipped}
        bigModels={bigModels}
        setBigModels={setBigModels}
        hasModels={hasModels}
      />
    </div>
  );
}
