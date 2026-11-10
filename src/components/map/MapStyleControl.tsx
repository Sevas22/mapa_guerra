'use client';

import { useEffect, useRef, useState } from 'react';
import { BASEMAPS, OVERLAYS, basemapById, previewUrl, type BaseMapGroup } from '@/domain/basemaps';
import { useMapStyleStore } from '@/store/mapStyleStore';

const GROUPS: BaseMapGroup[] = ['Imágenes', 'Relieve', 'Mapas'];

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 3 2 8l10 5 10-5-10-5Zm-7.6 9L2 13.2 12 18l10-4.8L19.6 12 12 15.6 4.4 12Zm0 4L2 17.2 12 22l10-4.8L19.6 16 12 19.6 4.4 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Botón y panel "Estilo del mapa": elegir mapa base y activar capas superpuestas. */
export function MapStyleControl() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const baseId = useMapStyleStore((s) => s.baseId);
  const overlays = useMapStyleStore((s) => s.overlays);
  const setBase = useMapStyleStore((s) => s.setBase);
  const toggleOverlay = useMapStyleStore((s) => s.toggleOverlay);
  const reset = useMapStyleStore((s) => s.reset);

  // Cerrar con Esc o con un clic fuera del panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="absolute top-[84px] right-2.5 z-[700] flex h-[34px] w-[34px] items-center justify-center rounded border-2 border-[rgba(0,0,0,.2)] bg-panel text-fg hover:border-muted aria-expanded:border-accent aria-expanded:text-accent"
        title={`Estilo del mapa: ${basemapById(baseId).name}`}
        aria-label="Estilo del mapa"
        aria-expanded={open}
        aria-controls="map-style-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <LayersIcon />
      </button>
      {open ? (
        <div
          ref={panelRef}
          id="map-style-panel"
          role="dialog"
          aria-label="Estilo del mapa"
          className="absolute top-[84px] right-[52px] z-[700] flex max-h-[calc(100%-100px)] w-[min(340px,calc(100%-68px))] flex-col overflow-hidden rounded border border-line bg-panel shadow-[0_8px_24px_rgba(0,0,0,.45)]"
        >
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <h2 className="sec-h big text-[16px]!">Estilo del mapa</h2>
            <button type="button" className="btn px-2! py-0.5! text-xs!" onClick={reset}>
              Restablecer
            </button>
          </div>
          <div className="flex flex-col gap-3.5 overflow-auto p-3.5">
            {GROUPS.map((g) => (
              <fieldset key={g} className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="sec-h mb-2">{g}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {BASEMAPS.filter((b) => b.group === g).map((b) => {
                    const active = b.id === baseId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        aria-pressed={active}
                        title={b.description}
                        onClick={() => setBase(b.id)}
                        className="group flex flex-col gap-1 rounded border border-line bg-bg p-1 text-left text-[11px] leading-tight text-muted hover:border-muted hover:text-fg aria-pressed:border-accent aria-pressed:text-fg"
                      >
                        {/* Miniatura: un mosaico real de Colombia del proveedor. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl(b.tiles)}
                          alt=""
                          loading="lazy"
                          width={256}
                          height={256}
                          className="aspect-[4/3] w-full rounded-[2px] bg-mapbg object-cover"
                        />
                        <span className="px-0.5 pb-0.5">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className="sec-h mb-2">Capas superpuestas</legend>
              {OVERLAYS.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded px-1 py-1 hover:bg-panel-2"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-accent"
                    checked={overlays.includes(o.id)}
                    onChange={() => toggleOverlay(o.id)}
                  />
                  <span className="flex flex-col">
                    <span className="text-[13px]">{o.name}</span>
                    <span className="text-[11px] text-muted">{o.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
        </div>
      ) : null}
    </>
  );
}
