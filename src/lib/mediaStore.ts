/**
 * Almacén de adjuntos (imágenes y videos) en IndexedDB. Los archivos pesan
 * demasiado para `localStorage`, así que el escenario solo guarda referencias
 * (`MediaRef`) y el contenido vive aquí con el mismo id.
 */
import { uid } from '@/domain/id';
import type { MediaKind, MediaRef, Scenario } from '@/domain/types';

const DB_NAME = 'mapa-tactico-co-media';
const STORE = 'files';

/** Límite por archivo; los navegadores suelen permitir bastante más, pero el JSON exportado crece. */
export const MAX_MEDIA_BYTES = 60 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const putMedia = (id: string, blob: Blob): Promise<IDBValidKey> =>
  tx('readwrite', (s) => s.put(blob, id));

export const getMedia = (id: string): Promise<Blob | undefined> =>
  tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);

export const deleteMedia = (id: string): Promise<undefined> => tx('readwrite', (s) => s.delete(id));

export function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

/** Guarda un archivo y devuelve su referencia, o un error legible. */
export async function addMediaFile(file: File): Promise<MediaRef | { error: string }> {
  const kind = kindOf(file);
  if (!kind) return { error: `«${file.name}» no es una imagen ni un video.` };
  if (file.size > MAX_MEDIA_BYTES)
    return { error: `«${file.name}» pesa más de ${MAX_MEDIA_BYTES / 1024 / 1024} MB.` };
  const id = 'm' + uid() + uid();
  try {
    await putMedia(id, file);
  } catch {
    return { error: 'El navegador no permitió guardar el archivo (¿espacio lleno?).' };
  }
  return { id, kind, name: file.name, caption: '' };
}

// ---------------------------------------------------------------- URLs

const urlCache = new Map<string, string>();

/** URL para mostrar un adjunto: la propia si es un recurso de la app, o un blob: de IndexedDB. */
export async function mediaUrl(ref: MediaRef): Promise<string | null> {
  if (ref.url) return ref.url;
  const hit = urlCache.get(ref.id);
  if (hit) return hit;
  const blob = await getMedia(ref.id).catch(() => undefined);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(ref.id, url);
  return url;
}

// ---------------------------------------------------------------- exportar / importar

/** Todas las referencias de adjuntos del escenario. */
export function collectMedia(s: Scenario): MediaRef[] {
  return [...s.phases.flatMap((p) => p.media ?? []), ...s.objects.flatMap((o) => o.media ?? [])];
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/** Copia del escenario con el contenido de los adjuntos incrustado (`mediaData`). */
export async function withEmbeddedMedia(s: Scenario): Promise<Scenario> {
  const data: Record<string, string> = {};
  for (const ref of collectMedia(s)) {
    if (ref.url || data[ref.id]) continue;
    const blob = await getMedia(ref.id).catch(() => undefined);
    if (blob) data[ref.id] = await blobToDataUrl(blob);
  }
  return Object.keys(data).length ? { ...s, mediaData: data } : s;
}

/** Pasa `mediaData` de un archivo importado a IndexedDB y lo quita del escenario. */
export async function storeEmbeddedMedia(s: Scenario): Promise<Scenario> {
  if (!s.mediaData) return s;
  for (const [id, dataUrl] of Object.entries(s.mediaData)) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await putMedia(id, blob);
    } catch {
      // Un adjunto dañado no impide abrir el escenario.
    }
  }
  const rest = { ...s };
  delete rest.mediaData;
  return rest;
}
