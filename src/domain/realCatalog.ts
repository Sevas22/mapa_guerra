/**
 * Catálogo de modelos reales: archivos .glb hechos por artistas (p. ej. descargados de
 * Sketchfab con licencia CC-BY) guardados en `public/models/vehiculos/` y descritos en
 * `public/models/vehiculos/catalogo.json`. Cada entrada se convierte en un modelo del taller
 * con su tipo, medidas y créditos; la geometría paramétrica queda solo de respaldo.
 */
import { z } from 'zod';
import { MODEL_BASES, PRESETS, type Model3D, type ModelBase } from './models3d';

export const REAL_DIR = '/models/vehiculos/';
export const CATALOG_URL = `${REAL_DIR}catalogo.json`;

export interface RealAsset {
  /** Nombre del archivo dentro de `public/models/vehiculos/`. */
  file: string;
  /** Nombre que se muestra en el taller. */
  name: string;
  /** Tipo de equipo: define el símbolo, la altura de vuelo y cómo se apoya. */
  base: ModelBase;
  /** Largo real en metros (escala el archivo); para la infantería, la estatura. */
  length: number;
  /** Ancho o envergadura en metros (informativo). */
  span?: number;
  /** Giro en grados para que el frente mire hacia adelante (los .glb suelen mirar a +z: 90). */
  yaw: number;
  /** Autor del modelo. */
  author: string;
  /** Licencia (p. ej. «CC-BY-4.0», «CC0»). */
  license: string;
  /** Página de origen del modelo. */
  url: string;
}

const AssetSchema = z.object({
  file: z.string().min(1),
  name: z.string().min(1),
  base: z.enum(MODEL_BASES),
  length: z.number().positive(),
  span: z.number().positive().optional(),
  yaw: z.number().finite().catch(90).default(90),
  author: z.string().catch('').default(''),
  license: z.string().catch('').default(''),
  url: z.string().catch('').default(''),
});

/** Lee el catálogo; las entradas mal escritas se descartan (y se informan). */
export function parseCatalog(data: unknown): { assets: RealAsset[]; errors: string[] } {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { modelos?: unknown })?.modelos)
      ? (data as { modelos: unknown[] }).modelos
      : [];
  const assets: RealAsset[] = [];
  const errors: string[] = [];
  list.forEach((x, i) => {
    const r = AssetSchema.safeParse(x);
    if (r.success) assets.push(r.data);
    else errors.push(`Entrada ${i + 1}: ${r.error.issues.map((e) => e.path.join('.')).join(', ')}`);
  });
  return { assets, errors };
}

/** Texto de créditos que pide la licencia (CC-BY exige citar autor, obra y licencia). */
export const assetCredit = (a: RealAsset): string =>
  [`«${a.name}»`, a.author && `por ${a.author}`, a.license, a.url].filter(Boolean).join(' · ');

/** Receta del taller para un modelo real: la del tipo, con el archivo, el nombre y el largo. */
export function assetModel(a: RealAsset): Omit<Model3D, 'id'> {
  const preset = PRESETS.find((p) => p.base === a.base)!;
  return {
    ...preset,
    name: a.name,
    length: a.length,
    span: a.span ?? preset.span,
    // Un archivo trae su propia figura: una sola copia, sin formación.
    ...(a.base === 'soldados' ? { engines: 1 } : {}),
    mesh: {
      id: REAL_DIR + a.file,
      name: a.file,
      yaw: a.yaw,
      anim: '',
      credit: assetCredit(a),
    },
  };
}
