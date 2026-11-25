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

/**
 * «Ir a coordenadas» en la barra superior: decimal, DMS, nombre de lugar o ciudad de la
 * lista. Los avisos y los resultados de la búsqueda se despliegan debajo.
 */
export function GotoCoords() {
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState<Msg | null>(null);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const hasTarget = useEditorStore((s) => s.gotoTarget !== null);
  const setGotoTarget = useEditorStore((s) => s.setGotoTarget);
  const addGotoPoint = useEditorStore((s) => s.addGotoPoint);

  const goTo = (lat: number, lng: number, zoom: number, name = '') => {
    const inCo = isInColombia({ lat, lng });
    setMsg(inCo ? null : { text: 'Esa coordenada está fuera de Colombia.', warn: true });
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
        setMsg({ text: 'No encontré ese lugar en Colombia. Prueba con coordenadas.', warn: true });
        return;
      }
      setMsg({ text: `${found.length} resultado(s) para «${q.trim()}»`, warn: false });
      setResults(found);
    } catch {
      setMsg({ text: 'Sin conexión al buscador de lugares. Usa coordenadas.', warn: true });
    }
  };

  const close = () => {
    setMsg(null);
    setResults([]);
  };

  return (
    <div className="hd-goto" role="search">
      <div className="hd-goto-bar">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M8 .8v3.4M8 11.8v3.4M.8 8h3.4M11.8 8h3.4"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        <input
          type="text"
          placeholder="Ir a: 4.7110, -74.0721 · 4°42′40″N 74°04′20″O · o un lugar"
          aria-label="Coordenadas o lugar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
            if (e.key === 'Escape') close();
          }}
        />
        <select
          aria-label="Ir a una ciudad de Colombia"
          title="Ciudades de Colombia"
          value=""
          onChange={(e) => {
            const p = PLACES[Number(e.target.value)];
            if (!p) return;
            setQuery(`${p.lat}, ${p.lng}`);
            setResults([]);
            goTo(p.lat, p.lng, 12, p.name);
          }}
        >
          <option value="">Ciudades</option>
          {PLACES.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="hd-goto-go" onClick={() => void submit()}>
          Ir
        </button>
        <button
          type="button"
          className="hd-goto-mark"
          disabled={!hasTarget}
          title="Deja un punto en el sitio al que fuiste"
          onClick={addGotoPoint}
        >
          Marcar punto
        </button>
      </div>
      {msg || results.length ? (
        <div className="hd-goto-pop" role="status">
          {msg ? <p className={msg.warn ? 'text-accent' : 'text-muted'}>{msg.text}</p> : null}
          {results.map((r) => (
            <button
              key={`${r.lat},${r.lng},${r.displayName}`}
              type="button"
              onClick={() => {
                goTo(r.lat, r.lng, 13, r.name);
                setResults([]);
              }}
            >
              {r.displayName}
            </button>
          ))}
          <button type="button" className="hd-goto-close" onClick={close}>
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
