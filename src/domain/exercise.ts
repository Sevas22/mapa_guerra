/**
 * "Ejercicio Halcón": escenario de entrenamiento completamente ficticio para
 * mostrar las funciones del editor (simbología MFRE/DIVFE, inserción aérea,
 * tareas tácticas, fichas, tiempos de desplazamiento y adjuntos). No representa
 * ninguna operación real; la fuerza opositora es un OPFOR de entrenamiento.
 */
import { uid } from './id';
import type {
  FactionId,
  LatLngTuple,
  LineObject,
  LineType,
  MediaRef,
  Phase,
  PointObject,
  PointType,
  Scenario,
  SymbolFields,
  Travel,
  UnitObject,
  UnitType,
} from './types';

type P = LatLngTuple;
type FramesIn = Record<number, P>;

const pf = (fr: FramesIn) =>
  Object.fromEntries(Object.entries(fr).map(([k, [lat, lng]]) => [k, { lat, lng }]));

const unit = (
  type: UnitType,
  label: string,
  frames: FramesIn,
  extra: Partial<
    SymbolFields & {
      echelon: string;
      faction: FactionId;
      start: number;
      end: number | null;
      media: MediaRef[];
    }
  > = {},
): UnitObject => ({
  id: uid(),
  kind: 'unit',
  type,
  faction: extra.faction ?? 'azul',
  echelon: extra.echelon ?? 'I',
  label,
  notes: '',
  start: extra.start ?? 0,
  end: extra.end ?? null,
  ...(extra.faction === 'roja' ? {} : { force: extra.force ?? 'ejc' }),
  ...(extra.card ? { card: extra.card } : {}),
  ...(extra.mobility ? { mobility: extra.mobility } : {}),
  ...(extra.mod1 ? { mod1: extra.mod1 } : {}),
  ...(extra.iconText ? { iconText: extra.iconText } : {}),
  ...(extra.taskForce ? { taskForce: true } : {}),
  ...(extra.media ? { media: extra.media } : {}),
  frames: pf(frames),
});

const point = (
  type: PointType,
  label: string,
  at: P,
  start = 0,
  end: number | null = null,
  extra: { iconText?: string; faction?: FactionId } = {},
): PointObject => ({
  id: uid(),
  kind: 'point',
  type,
  faction: extra.faction ?? 'azul',
  label,
  notes: '',
  start,
  end,
  ...(extra.iconText ? { iconText: extra.iconText } : {}),
  frames: { [start]: { lat: at[0], lng: at[1] } },
});

const line = (
  type: LineType,
  label: string,
  pts: P[],
  start = 0,
  end: number | null = null,
  extra: { faction?: FactionId; travel?: Travel } = {},
): LineObject => ({
  id: uid(),
  kind: 'line',
  type,
  faction: extra.faction ?? 'azul',
  label,
  notes: '',
  start,
  end,
  ...(extra.travel ? { travel: extra.travel } : {}),
  frames: { [start]: { pts } },
});

const phase = (
  title: string,
  date: string,
  desc: string,
  c: P,
  z: number,
  media?: MediaRef[],
): Phase => ({ id: uid(), title, date, desc, view: { c, z }, ...(media ? { media } : {}) });

const demoMedia = (file: string, caption: string): MediaRef => ({
  id: 'demo-' + file.replace(/\W+/g, '-'),
  kind: 'image',
  name: file,
  caption,
  url: `/demo/${file}`,
});

// Lugares ficticios del ejercicio (piedemonte del Meta).
const BASE: P = [4.084, -73.566];
const PCA1: P = [3.985, -73.7];
const PCA2: P = [3.885, -73.848];
const ZD1: P = [3.835, -73.93];
const ZD2: P = [3.832, -73.91];
const PC1: P = [3.826, -73.926];
const PC2: P = [3.817, -73.919];
const PD: P = [3.81, -73.912];
const OBJ: P = [3.8, -73.9];
const ZE: P = [3.79, -73.879];

export function exerciseScenario(): Scenario {
  const phases: Phase[] = [
    phase(
      'Alistamiento',
      'D-1 · 18:00',
      'Ejercicio de entrenamiento (ficticio). La Fuerza de Tarea alista en la Base A una compañía de fuerzas especiales, un pelotón de bloqueo y la sección de apoyo. El OPFOR ocupa un campamento simulado en el área del OBJ 1.',
      [3.94, -73.74],
      10,
      [demoMedia('esquema-ejercicio.svg', 'Esquema general del Ejercicio Halcón (ficticio)')],
    ),
    phase(
      'Movimiento aéreo',
      'D · 05:00',
      'La sección de aviación transporta a la compañía y al pelotón por la ruta aérea, con control en PCA 1 y PCA 2 y escolta de ataque.',
      [3.95, -73.75],
      10,
    ),
    phase(
      'Desembarco',
      'D · 05:45',
      'Primera rotación en ZD1 y ZD2. La aviación regresa a la Base A para la segunda rotación con la sección de apoyo.',
      [3.83, -73.918],
      14,
    ),
    phase(
      'Aproximación',
      'D · 06:30',
      'Infiltración a pie por los puntos de control 1 y 2 hasta el punto de decisión. El pelotón de bloqueo se desplaza al sureste del objetivo.',
      [3.818, -73.912],
      14,
    ),
    phase(
      'Maniobra sobre el OBJ 1',
      'D · 08:00',
      'La compañía aísla el campamento simulado; el pelotón bloquea la salida sureste y la sección apoya con fuego desde el alto. Contacto con el OPFOR.',
      [3.804, -73.903],
      15,
      [demoMedia('croquis-maniobra.svg', 'Croquis de la maniobra sobre el OBJ 1')],
    ),
    phase(
      'Consolidación y extracción',
      'D · 10:30',
      'OBJ 1 asegurado. Las unidades se repliegan a la zona de extracción y la aviación las recoge. Fin del ejercicio.',
      [3.797, -73.892],
      14,
    ),
  ];

  const objects = [
    // Instalaciones y mando
    point('base', 'Base A', BASE),
    unit(
      'nombre',
      'PC FT',
      { 0: [4.088, -73.56] },
      { iconText: 'FT', echelon: 'II', taskForce: true },
    ),
    // Fuerzas propias
    unit(
      'especiales',
      'CIA A',
      {
        0: [4.082, -73.572],
        1: [3.91, -73.82],
        2: ZD1,
        3: PD,
        4: [3.803, -73.904],
        5: [3.791, -73.881],
      },
      {
        echelon: 'I',
        mobility: 'asalto-aereo',
        card: { pax: 36, mision: 'Aislar y asegurar el OBJ 1' },
        media: [demoMedia('ficha-cia-a.svg', 'Organización de la CIA A (ficticia)')],
      },
    ),
    unit(
      'especiales',
      'PEL B',
      {
        0: [4.079, -73.58],
        1: [3.905, -73.83],
        2: ZD2,
        3: [3.81, -73.895],
        4: [3.792, -73.894],
        5: [3.789, -73.882],
      },
      {
        echelon: '•••',
        mobility: 'asalto-aereo',
        card: { pax: 18, mision: 'Bloquear la salida sureste' },
      },
    ),
    unit(
      'morteros',
      'SECC APOYO',
      { 2: [3.837, -73.927], 3: [3.816, -73.915], 4: [3.812, -73.906], 5: [3.79, -73.88] },
      {
        echelon: '••',
        start: 2,
        card: { pax: 10, medios: '02 morteros 60 mm', mision: 'Apoyo de fuego desde el alto' },
      },
    ),
    unit(
      'aviacion',
      'SECC AV',
      {
        0: [4.087, -73.556],
        1: [3.9, -73.835],
        2: [3.84, -73.925],
        3: [4.087, -73.556],
        5: [3.793, -73.876],
      },
      {
        echelon: '••',
        mod1: 'ASLT',
        card: { pax: 8, medios: '02 UH-60', mision: 'Transporte y extracción' },
      },
    ),
    unit(
      'aviacion',
      'ESCOLTA',
      {
        0: [4.09, -73.552],
        1: [3.895, -73.84],
        2: [3.845, -73.915],
        3: [4.09, -73.552],
        5: [3.796, -73.872],
      },
      {
        echelon: 'Ø',
        mod1: 'A',
        card: { pax: 4, medios: '01 AH-60', mision: 'Escolta y apoyo aéreo' },
      },
    ),
    // Fuerza opositora de entrenamiento
    unit(
      'infanteria',
      'OPFOR',
      { 0: [3.799, -73.899] },
      {
        faction: 'roja',
        echelon: '•••',
        end: 4,
        card: { pax: 20, mision: 'Defender el campamento simulado' },
      },
    ),
    point('objetivo', 'Campamento simulado', OBJ, 0, null, { iconText: '1' }),
    point('evento', 'Contacto', [3.801, -73.902], 4, 4, { faction: 'roja' }),
    // Áreas
    line('ao', 'HALCÓN', [
      [3.885, -73.985],
      [3.885, -73.835],
      [3.765, -73.835],
      [3.765, -73.985],
    ]),
    line('ani', 'OBJ 1', [
      [3.806, -73.907],
      [3.806, -73.893],
      [3.794, -73.893],
      [3.794, -73.907],
    ]),
    // Movimiento aéreo
    line('ruta', 'Ruta aérea', [BASE, PCA1, PCA2, ZD1], 1, 2, { travel: { mode: 'aereo' } }),
    point('pca', 'PCA 1', PCA1, 1, 2, { iconText: '1' }),
    point('pca', 'PCA 2', PCA2, 1, 2, { iconText: '2' }),
    point('zd', '', ZD1, 1, 3, { iconText: 'ZD1' }),
    point('zd', '', ZD2, 1, 3, { iconText: 'ZD2' }),
    // Aproximación
    line('ruta', 'Infiltración', [ZD1, PC1, PC2, PD], 3, 3, { travel: { mode: 'pie' } }),
    point('control', '', PC1, 3, 4, { iconText: '1' }),
    point('control', '', PC2, 3, 4, { iconText: '2' }),
    point('decision', '', PD, 3, 4),
    // Maniobra
    line('eje', '', [PD, [3.806, -73.907], [3.802, -73.902]], 4, 4),
    line('aislar', '', [OBJ, [3.8, -73.8945]], 4, 4),
    line(
      'bloquear',
      '',
      [
        [3.792, -73.894],
        [3.796, -73.9],
      ],
      4,
      4,
    ),
    line(
      'apoyar-fuego',
      '',
      [
        [3.812, -73.906],
        [3.805, -73.902],
      ],
      4,
      4,
    ),
    // Consolidación y extracción
    line('asegurar', '', [OBJ, [3.8, -73.8945]], 5),
    point('ze', '', ZE, 4, null, { iconText: 'ZE1' }),
  ];

  return { v: 1, name: 'Ejercicio Halcón (entrenamiento ficticio)', speed: 2, phases, objects };
}
