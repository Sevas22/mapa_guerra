'use client';

import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import type { MediaRef } from '@/domain/types';
import { addMediaFile, mediaUrl } from '@/lib/mediaStore';

/** URL visible de un adjunto (se resuelve de forma asíncrona desde IndexedDB). */
export function useMediaUrl(ref: MediaRef): string | null | undefined {
  const [url, setUrl] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    void mediaUrl(ref).then((u) => {
      if (alive) setUrl({ id: ref.id, url: u });
    });
    return () => {
      alive = false;
    };
  }, [ref]);
  // undefined = cargando; null = no disponible.
  return url?.id === ref.id ? url.url : undefined;
}

// ---------------------------------------------------------------- visor

interface ViewerState {
  items: MediaRef[];
  index: number;
  open: (items: MediaRef[], index: number) => void;
  close: () => void;
  step: (d: number) => void;
}

export const useViewer = create<ViewerState>((set, get) => ({
  items: [],
  index: -1,
  open: (items, index) => set({ items, index }),
  close: () => set({ items: [], index: -1 }),
  step: (d) => {
    const { items, index } = get();
    if (items.length) set({ index: (index + d + items.length) % items.length });
  },
}));

function MediaBody({ m, big }: { m: MediaRef; big?: boolean }) {
  const url = useMediaUrl(m);
  if (url === undefined)
    return <div className="grid h-full place-items-center text-xs text-muted">…</div>;
  if (url === null)
    return (
      <div className="grid h-full place-items-center p-1 text-center text-[10px] text-muted">
        Archivo no disponible en este navegador
      </div>
    );
  if (m.kind === 'video')
    return big ? (
      <video src={url} controls autoPlay className="max-h-[78vh] max-w-full" />
    ) : (
      <video src={url} muted preload="metadata" className="h-full w-full object-cover" />
    );
  // Imágenes locales (blob:) o del propio proyecto: next/image no aporta aquí.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={m.caption || m.name}
      className={big ? 'max-h-[78vh] max-w-full object-contain' : 'h-full w-full object-cover'}
    />
  );
}

/** Miniatura que abre el visor. */
export function MediaThumb({
  items,
  index,
  className = 'h-14 w-20',
}: {
  items: MediaRef[];
  index: number;
  className?: string;
}) {
  const m = items[index];
  const open = useViewer((s) => s.open);
  if (!m) return null;
  return (
    <button
      type="button"
      title={m.caption || m.name}
      onClick={() => open(items, index)}
      className={`relative flex-none overflow-hidden rounded-[3px] border border-line bg-mapbg hover:border-accent ${className}`}
    >
      <MediaBody m={m} />
      {m.kind === 'video' ? (
        <span className="absolute inset-0 grid place-items-center text-lg text-white [text-shadow:0_0_4px_#000]">
          ▶
        </span>
      ) : null}
    </button>
  );
}

/** Visor a pantalla completa con navegación entre adjuntos. */
export function MediaViewer() {
  const { items, index, close, step } = useViewer();
  const m = items[index];
  useEffect(() => {
    if (!m) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else return;
      // Que los atajos del editor (cambiar de fase) no se disparen debajo.
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [m, close, step]);
  if (!m) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={m.caption || m.name}
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-3 bg-[rgba(5,8,12,.92)] p-6"
      onClick={close}
    >
      <div
        className="flex max-h-[80vh] max-w-[92vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaBody key={m.id} m={m} big />
      </div>
      <div className="flex items-center gap-3 text-sm" onClick={(e) => e.stopPropagation()}>
        {items.length > 1 ? (
          <button type="button" className="btn" onClick={() => step(-1)} aria-label="Anterior">
            ◀
          </button>
        ) : null}
        <span className="max-w-[60vw] truncate">
          {m.caption || m.name}
          {items.length > 1 ? (
            <span className="ml-2 font-mono text-xs text-muted">
              {index + 1}/{items.length}
            </span>
          ) : null}
        </span>
        {items.length > 1 ? (
          <button type="button" className="btn" onClick={() => step(1)} aria-label="Siguiente">
            ▶
          </button>
        ) : null}
        <button type="button" className="btn" onClick={close}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- editor

/** Lista editable de adjuntos de una fase u objeto. */
export function MediaEditor({
  media,
  onChange,
}: {
  media: MediaRef[] | undefined;
  onChange: (m: MediaRef[]) => void;
}) {
  const items = media ?? [];
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    const added: MediaRef[] = [];
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      const r = await addMediaFile(f);
      if ('error' in r) errors.push(r.error);
      else added.push(r);
    }
    setBusy(false);
    if (errors.length) setError(errors.join(' '));
    if (added.length) onChange([...items, ...added]);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((m, i) => (
        <div key={m.id} className="flex items-start gap-2">
          <MediaThumb items={items} index={i} className="h-12 w-16" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <input
              type="text"
              value={m.caption}
              placeholder={m.name}
              aria-label="Pie del adjunto"
              onChange={(e) =>
                onChange(items.map((x) => (x.id === m.id ? { ...x, caption: e.target.value } : x)))
              }
            />
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <span className="truncate">{m.kind === 'video' ? 'Video' : 'Imagen'}</span>
              <span className="flex-1" />
              {i > 0 ? (
                <button
                  type="button"
                  className="hover:text-fg"
                  aria-label="Subir"
                  onClick={() => {
                    const n = [...items];
                    [n[i - 1], n[i]] = [n[i]!, n[i - 1]!];
                    onChange(n);
                  }}
                >
                  ↑
                </button>
              ) : null}
              <button
                type="button"
                className="text-danger hover:underline"
                onClick={() => onChange(items.filter((x) => x.id !== m.id))}
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Guardando…' : '+ Imagen o video'}
      </button>
      {error ? <p className="note text-danger!">{error}</p> : null}
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
