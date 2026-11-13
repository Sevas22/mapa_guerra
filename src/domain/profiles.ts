/**
 * Perfiles de operación: la ficha de cada persona relacionada con la operación (propios,
 * integrantes de la amenaza, personas de interés y fuentes). Se cargan a mano o desde una
 * planilla CSV, se colocan en el mapa como fichas y alimentan los grafos de vínculos.
 */
import { uid } from './id';

export const PROFILE_ROLES = ['propio', 'amenaza', 'persona', 'fuente'] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

/** Tipo de fuente (anillo de color en el grafo de vínculos). */
export const SOURCE_TYPES = ['directa', 'indirecta', 'acceso', 'area', 'estudio'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface Profile {
  id: string;
  /** Nombre completo. */
  nombre: string;
  /** Alias o nombre de cobertura. */
  alias: string;
  /** Grado (propios) o rango dentro de la estructura. */
  grado: string;
  /** Cargo o función en la operación. */
  cargo: string;
  /** Unidad, organización o estructura a la que pertenece. */
  organizacion: string;
  /** Componente o área: mando y control, finanzas, logística, seguridad… */
  estructura: string;
  rol: ProfileRole;
  /** Solo para `rol: 'fuente'`. */
  fuente?: SourceType;
  telefono: string;
  documento: string;
  /** Zona o lugar de influencia. */
  ubicacion: string;
  notas: string;
  /** Foto reducida como data URL (JPEG de ~200 px). */
  foto?: string;
}

export const ROLE_DEFS: Record<ProfileRole, { name: string; color: string }> = {
  propio: { name: 'Propio', color: '#4a90d9' },
  amenaza: { name: 'Integrante de la amenaza', color: '#e01e1e' },
  persona: { name: 'Persona de interés', color: '#7d8796' },
  fuente: { name: 'Fuente', color: '#e0b020' },
};

export const SOURCE_DEFS: Record<SourceType, { name: string; color: string }> = {
  directa: { name: 'Infiltración directa', color: '#e01e1e' },
  indirecta: { name: 'Infiltración indirecta', color: '#1f4fd6' },
  acceso: { name: 'Fuente de acceso', color: '#22b14c' },
  area: { name: 'Fuente de área', color: '#f2d21b' },
  estudio: { name: 'Fuente en estudio', color: '#f08a24' },
};

export function newProfile(patch: Partial<Profile> = {}): Profile {
  return {
    id: 'pf' + uid(),
    nombre: '',
    alias: '',
    grado: '',
    cargo: '',
    organizacion: '',
    estructura: '',
    rol: 'persona',
    telefono: '',
    documento: '',
    ubicacion: '',
    notas: '',
    ...patch,
  };
}

/** Nombre corto para rótulos: «a. Alias» o el nombre. */
export const profileTitle = (p: Profile): string =>
  p.alias ? (p.nombre ? `${p.nombre} (a. ${p.alias})` : `a. ${p.alias}`) : p.nombre || 'Sin nombre';

// ---------------------------------------------------------------- CSV

/** Columnas de la planilla, en orden. */
export const CSV_COLUMNS = [
  ['nombre', 'Nombre'],
  ['alias', 'Alias'],
  ['grado', 'Grado'],
  ['cargo', 'Cargo'],
  ['organizacion', 'Organización'],
  ['estructura', 'Estructura'],
  ['rol', 'Rol'],
  ['fuente', 'Tipo de fuente'],
  ['telefono', 'Teléfono'],
  ['documento', 'Documento'],
  ['ubicacion', 'Ubicación'],
  ['notas', 'Notas'],
] as const;

type CsvKey = (typeof CSV_COLUMNS)[number][0];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Sinónimos aceptados en el encabezado de la planilla. */
const HEADER_ALIASES: Record<string, CsvKey> = {
  nombre: 'nombre',
  'nombre completo': 'nombre',
  nombres: 'nombre',
  alias: 'alias',
  'nombre de cobertura': 'alias',
  grado: 'grado',
  rango: 'grado',
  cargo: 'cargo',
  funcion: 'cargo',
  organizacion: 'organizacion',
  unidad: 'organizacion',
  estructura: 'estructura',
  componente: 'estructura',
  area: 'estructura',
  rol: 'rol',
  tipo: 'rol',
  'tipo de fuente': 'fuente',
  fuente: 'fuente',
  telefono: 'telefono',
  celular: 'telefono',
  documento: 'documento',
  cedula: 'documento',
  'documento de identidad': 'documento',
  ubicacion: 'ubicacion',
  zona: 'ubicacion',
  lugar: 'ubicacion',
  notas: 'notas',
  observaciones: 'notas',
};

/** Interpreta el rol escrito en la planilla. */
export function parseRole(v: string): ProfileRole {
  const f = fold(v);
  if (/^(propi|amig|nuestr)/.test(f)) return 'propio';
  if (/^(amenaza|integrante|hostil|enemig|gao)/.test(f)) return 'amenaza';
  if (/^fuente/.test(f)) return 'fuente';
  return 'persona';
}

export function parseSource(v: string): SourceType | undefined {
  const f = fold(v);
  if (!f) return undefined;
  if (f.includes('indirect')) return 'indirecta';
  if (f.includes('direct')) return 'directa';
  if (f.includes('acceso')) return 'acceso';
  if (f.includes('area')) return 'area';
  if (f.includes('estudio')) return 'estudio';
  return undefined;
}

/** Divide un texto CSV en filas y celdas (comillas dobles, `;` o `,`, saltos CRLF). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export type CsvImport = { ok: true; profiles: Profile[] } | { ok: false; error: string };

/** Convierte una planilla CSV en perfiles. La primera fila es el encabezado. */
export function profilesFromCsv(text: string): CsvImport {
  const rows = parseCsv(text);
  const head = rows[0];
  if (!head) return { ok: false, error: 'La planilla está vacía.' };
  const keys = head.map((h) => HEADER_ALIASES[fold(h)]);
  if (!keys.includes('nombre') && !keys.includes('alias'))
    return {
      ok: false,
      error: 'La planilla necesita al menos una columna «Nombre» o «Alias» en la primera fila.',
    };
  const profiles = rows.slice(1).flatMap((r) => {
    const rec: Partial<Record<CsvKey, string>> = {};
    keys.forEach((k, i) => {
      if (k) rec[k] = (r[i] ?? '').trim();
    });
    if (!rec.nombre && !rec.alias) return [];
    const rol = parseRole(rec.rol ?? '');
    const fuente = rol === 'fuente' ? (parseSource(rec.fuente ?? '') ?? 'estudio') : undefined;
    return [
      newProfile({
        nombre: rec.nombre ?? '',
        alias: rec.alias ?? '',
        grado: rec.grado ?? '',
        cargo: rec.cargo ?? '',
        organizacion: rec.organizacion ?? '',
        estructura: rec.estructura ?? '',
        rol,
        ...(fuente ? { fuente } : {}),
        telefono: rec.telefono ?? '',
        documento: rec.documento ?? '',
        ubicacion: rec.ubicacion ?? '',
        notas: rec.notas ?? '',
      }),
    ];
  });
  if (!profiles.length)
    return { ok: false, error: 'La planilla no tiene filas con nombre o alias.' };
  return { ok: true, profiles };
}

const csvCell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Planilla CSV (separada por `;`, como la abre Excel en español). */
export function profilesToCsv(profiles: readonly Profile[]): string {
  const lines = [CSV_COLUMNS.map(([, h]) => h).join(';')];
  for (const p of profiles)
    lines.push(
      CSV_COLUMNS.map(([k]) => {
        if (k === 'rol') return ROLE_DEFS[p.rol].name;
        if (k === 'fuente') return p.fuente ? SOURCE_DEFS[p.fuente].name : '';
        return csvCell(p[k] ?? '');
      }).join(';'),
    );
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Planilla de ejemplo para descargar y llenar (datos ficticios). */
export const CSV_TEMPLATE = profilesToCsv([
  newProfile({
    nombre: 'Andrés Felipe Rojas',
    grado: 'MY',
    cargo: 'Comandante de la operación',
    organizacion: 'Batallón de entrenamiento',
    estructura: 'Mando y control',
    rol: 'propio',
  }),
  newProfile({
    alias: 'Cóndor',
    cargo: 'Cabecilla principal',
    organizacion: 'OPFOR de entrenamiento',
    estructura: 'Mando y control',
    rol: 'amenaza',
    ubicacion: 'Sector K',
  }),
  newProfile({
    alias: 'K-Tauro',
    cargo: 'Fuente',
    rol: 'fuente',
    fuente: 'area',
    ubicacion: 'Vereda ficticia El Alto',
  }),
]);

/** Ordena según la importancia para la ficha: propios, amenaza, personas, fuentes. */
export const ROLE_ORDER: Record<ProfileRole, number> = {
  propio: 0,
  amenaza: 1,
  persona: 2,
  fuente: 3,
};
