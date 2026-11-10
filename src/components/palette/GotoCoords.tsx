'use client';

import { useState } from 'react';
import { PLACES } from '@/domain/catalog';
import { isInColombia, isValidLatLng, parseCoords } from '@/domain/coords';
import { geocode, type GeocodeResult } from '@/lib/geocode';
import { flyToPoint } from '@/lib/mapBridge';
import { useEditorStore } from '@/store/editorStore';

interface Msg {
  text: string;
  warn: boolean;
}

/** "Ir a coordenadas": decimal, DMS, nombre de lugar o ciudad de la lista. */
export function GotoCoords() {
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<Msg>({ text: '', warn: false });
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const hasTarget = useEditorStore((s) => s.gotoTarget !== null);
  const setGotoTarget = useEditorStore((s) => s.setGotoTarget);
  const addGotoPoint = useEditorStore((s) => s.addGotoPoint);

  const goTo = (lat: number, lng: number, zoom: number, name = '') => {
    const inCo = isInColombia({ lat, lng });
    setMsg({
      text: inCo
        ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        : 'Esa coordenada está fuera de Colombia.',
      warn: !inCo,
    });
    setGotoTarget({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), name });
    flyToPoint([lat, lng], zoom, 1.2);
  };

  const submit = async () => {
    const q = query;
    if (!q.trim()) return;
    setResults([]);
    const c = parseCoords(q);
    if (c) {
      if (!isValidLatLng(c)) {
        setMsg({ text: 'Latitud entre -90 y 90, longitud entre -180 y 180.', warn: true });
        return;
      }
      goTo(c.lat, c.lng, 13);
      return;
    }
    setMsg({ text: 'Buscando lugar…', warn: false });
    try {
      const found = await geocode(q);
      if (!found.length) {
        setMsg({ text: 'No encontré ese lugar en Colombia. Prueba con coordenadas.', warn: false });
        return;
      }
      setMsg({ text: `${found.length} resultado(s):`, warn: false });
      setResults(found);
    } catch {
      setMsg({ text: 'Sin conexión al buscador de lugares. Usa coordenadas.', warn: true });
    }
  };

  return (
    <section className="sec">
      <h2 className="sec-h">Ir a coordenadas</h2>
      <input
        type="text"
        className="font-mono text-xs"
        placeholder="4.7110, -74.0721 · 4°42′40″N 74°04′20″O · o un lugar"
        aria-label="Coordenadas o lugar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
        }}
      />
      <div className="row">
        <button type="button" className="btn primary" onClick={() => void submit()}>
          Ir
        </button>
        <button type="button" className="btn" disabled={!hasTarget} onClick={addGotoPoint}>
          Marcar punto
        </button>
      </div>
      <select
        aria-label="Ciudades"
        value=""
        onChange={(e) => {
          const p = PLACES[Number(e.target.value)];
          if (!p) return;
          setQuery(`${p.lat}, ${p.lng}`);
          setResults([]);
          goTo(p.lat, p.lng, 12, p.name);
        }}
      >
        <option value="">Ciudades de Colombia…</option>
        {PLACES.map((p, i) => (
          <option key={p.name} value={i}>
            {p.name}
          </option>
        ))}
      </select>
      {msg.text ? (
        <p className={`m-0 text-xs ${msg.warn ? 'text-accent' : 'text-muted'}`} role="status">
          {msg.text}
        </p>
      ) : null}
      {results.length ? (
        <div className="flex flex-col gap-0.5">
          {results.map((r) => (
            <button
              key={`${r.lat},${r.lng},${r.displayName}`}
              type="button"
              className="rounded-[3px] border-0 bg-transparent px-1.5 py-[5px] text-left text-xs text-fg hover:bg-panel-2"
              onClick={() => {
                goTo(r.lat, r.lng, 13, r.name);
                setResults([]);
              }}
            >
              {r.displayName}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
