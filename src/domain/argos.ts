/**
 * "Ejercicio Argos": escenario de entrenamiento ficticio sobre integración de disciplinas de
 * inteligencia (sensores, HUMINT, SIGINT, GEOINT, UAS, EW y CIBINT). Toma la estructura de
 * un caso de estudio —registros espaciados que se densifican hasta converger— pero todo es
 * inventado: el objetivo ("ÉCHO"), los componentes, las fechas relativas y el lugar, una zona
 * de montaña despoblada. No representa a ninguna persona, unidad ni operación real.
 *
 * Cada registro es un punto con su código (V = sensores, R = reporte, F = registro visual),
 * su disciplina y, en las notas, lo que aporta y el límite de esa evidencia. Los registros se
 * acumulan de fase en fase para que se vea cómo el expediente se densifica.
 */
import { line, off, phase, point, unit, type P } from './builders';
import type { MapObject, Phase, Scenario } from './types';

// Zona ficticia de montaña despoblada.
const S: P = [4.585, -73.735]; // centro del sector de interés
const PC: P = [4.655, -73.8]; // PC de sincronización del ejercicio

/** Posición dentro del sector, en "pasos" de ~275 m para que los rótulos no se monten. */
const at = (dy: number, dx: number): P => off(S, dy * 0.003, dx * 0.003);

/**
 * Última fase en que se dibujan los registros y las áreas de análisis. En la fase final
 * (la acción) ya cumplieron su papel y se ocultan para que la acción se lea limpia; siguen
 * en el escenario y en el inspector.
 */
const LAST_REPORT_PHASE = 8;

type Kind = 'sensores' | 'humint' | 'sigint' | 'uas';

/** Registro de inteligencia: aparece en su fase y permanece en el expediente. */
function report(
  kind: Kind,
  code: string,
  dato: string,
  where: P,
  phaseIdx: number,
  limite: string,
): MapObject {
  const notes = `${code} · ${kind.toUpperCase()}: ${dato}. Límite: ${limite}.`;
  // Rótulo corto: la disciplina la indica el símbolo y el detalle va en las notas.
  const label = code;
  if (kind === 'sensores')
    return point('vigilancia', label, where, phaseIdx, LAST_REPORT_PHASE, { notes });
  if (kind === 'sigint' || kind === 'uas')
    return point('antena', label, where, phaseIdx, LAST_REPORT_PHASE, { notes });
  return point('punto', label, where, phaseIdx, LAST_REPORT_PHASE, { notes });
}

export function argosScenario(): Scenario {
  const phases: Phase[] = [
    phase(
      'Marco geoespacial',
      'M-9',
      'Ejercicio ficticio de integración de inteligencia. GEOINT delimita el área de operaciones ARGOS y el sector de interés K. Hasta aquí solo hay terreno: ningún registro sobre el objetivo ficticio ÉCHO.',
      [4.62, -73.765],
      12,
    ),
    phase(
      'Primeros registros de sensores',
      'M-8',
      'V1 y V2: dos registros de sensores de presencia separados por ocho días. Son dos fotogramas, no una vigilancia continua.',
      S,
      14,
    ),
    phase(
      'Primer reporte humano',
      'M-6',
      'R0: un reporte HUMINT de presencia. Aporta contexto humano, pero sin relato de fuente ni nivel de confianza.',
      S,
      14,
    ),
    phase(
      'El terreno toma memoria',
      'M-5 a M-3',
      'F1 y V3 (sensores), una imagen satelital fechada del sector (GEOINT) y dos referencias fotográficas HUMINT. Tres clases de insumo conviven en la misma cronología, sin que una verifique automáticamente a otra.',
      S,
      14,
    ),
    phase(
      'Sincronización de las disciplinas',
      'M-2',
      'El PC del ejercicio sincroniza los componentes HUMINT, SIGINT, GEOINT, EW y CIBINT y el componente aéreo no tripulado (UAS). EW y CIBINT participan en la coordinación sin productos propios fechados.',
      [4.648, -73.792],
      14,
    ),
    phase(
      'Primera convergencia',
      'M-1 · días 1–3',
      'R1, R3 y R5 (HUMINT, presencia) y R2 (SIGINT): «posible área preparada». La palabra «posible» importa: es una hipótesis, no una confirmación.',
      S,
      14,
    ),
    phase(
      'El expediente se densifica',
      'M-1 · días 5–16',
      'F2 y F3 (sensores), R6 (HUMINT) y R4 y R7 (SIGINT, coordinaciones). Las fechas se acercan; contar informes no es contar confirmaciones independientes.',
      S,
      14,
    ),
    phase(
      'Cruce de fuentes',
      'M-1 · días 17–23',
      'R8 y R12 (HUMINT), F4 (sensores), R9 (sobrevuelo UAS), R10 (SIGINT, movimiento de integrantes) y R11 y R13 (SIGINT, coordinaciones). El sector se llena de registros de cuatro disciplinas.',
      S,
      14,
    ),
    phase(
      'La mirada aérea',
      'D-6 a D-2',
      'V4 y V5 (sensores) y R14 (UAS). La convergencia permite delimitar un punto de interés donde ÉCHO es posible, aún no confirmado (marco punteado). La fuerza de acción se alista junto al sector.',
      at(2, 2),
      14,
    ),
    phase(
      'Acción sobre el objetivo',
      'D',
      'Con la ubicación confirmada por varias disciplinas, la fuerza de acción aísla el punto de interés y ejecuta la acción sobre el objetivo. Fin del ejercicio. Lo que queda: varias miradas, ninguna completa por sí sola.',
      at(1.5, 1.2),
      15,
    ),
  ];

  const sync = (label: string, dy: number, dx: number, notes: string) =>
    unit('inteligencia', label, { 4: off(PC, dy, dx) }, { echelon: '••', start: 4, notes });

  const objects: MapObject[] = [
    // Marco: GEOINT y PC
    line('ao', 'ARGOS', [
      [4.675, -73.825],
      [4.675, -73.69],
      [4.555, -73.69],
      [4.555, -73.825],
    ]),
    line('ani', 'SECTOR K', [at(5, -5), at(5, 5), at(-5, 5), at(-5, -5)], 0, LAST_REPORT_PHASE),
    point('base', 'PC ARGOS', PC),

    // M-8: sensores
    report(
      'sensores',
      'V1',
      'presencia atribuida al objetivo',
      at(2, -3),
      1,
      'tipo de sensor y autor no precisados',
    ),
    report(
      'sensores',
      'V2',
      'presencia atribuida al objetivo',
      at(-1, -2),
      1,
      'no prueba permanencia continua',
    ),
    // M-6: HUMINT
    report(
      'humint',
      'R0',
      'reporte de presencia',
      at(3, 2),
      2,
      'sin relato de fuente ni nivel de confianza',
    ),
    // M-5 a M-3: sensores, GEOINT y HUMINT
    report(
      'sensores',
      'F1',
      'registro visual de presencia',
      at(0, -4),
      3,
      'no se identifica el dispositivo',
    ),
    report(
      'sensores',
      'V3',
      'presencia atribuida al objetivo',
      at(-3, 1),
      3,
      'sin metadatos instrumentales',
    ),
    report(
      'humint',
      'HF1',
      'referencia fotográfica',
      at(1, 4),
      3,
      'sin contenido testimonial completo',
    ),
    report(
      'humint',
      'HF2',
      'referencia fotográfica y contexto de perfil',
      at(-2, 4),
      3,
      'no prueba que se ejecutaran todas las fases con fuentes',
    ),
    line('zona', 'Imagen satelital (GEOINT)', [at(6, -6), at(6, 6), at(-6, 6), at(-6, -6)], 3, 3, {
      notes:
        'GEOINT: imagen satelital digital fechada del sector. Límite: no demuestra identificación individual.',
    }),

    // M-2: sincronización
    sync(
      'HUMINT',
      0.004,
      -0.004,
      'Componente HUMINT: reportes de presencia, referencias fotográficas y estudio de relaciones.',
    ),
    sync(
      'SIGINT',
      0.004,
      0.004,
      'Componente SIGINT: reportes de coordinaciones, movimientos y sobrevuelos.',
    ),
    sync('GEOINT', -0.004, -0.004, 'Componente GEOINT: cartografía e imagen satelital del área.'),
    sync(
      'EW',
      -0.004,
      0.004,
      'Componente EW: participa en la sincronización; sin resultado exclusivo documentado.',
    ),
    sync(
      'CIBINT',
      0,
      0.007,
      'Componente CIBINT: participa en la sincronización; sin hallazgo cibernético documentado.',
    ),
    unit(
      'aviacion-fija',
      'UAS',
      { 4: off(PC, 0, -0.007), 7: at(4, 6), 8: at(-4, -6), 9: at(5, 5) },
      {
        echelon: 'Ø',
        mod1: 'UAS',
        start: 4,
        notes: 'Componente aéreo no tripulado: sobrevuelos de observación.',
      },
    ),

    // M-1, días 1–3
    report('humint', 'R1', 'presencia', at(1, -1), 5, 'sin detalle de la fuente'),
    report(
      'sigint',
      'R2',
      'posible área preparada',
      at(4, -4),
      5,
      'hipótesis, no confirmación definitiva',
    ),
    line(
      'abi',
      '¿ÁREA PREPARADA?',
      [at(5, -5), at(5, -3), at(3, -3), at(3, -5)],
      5,
      LAST_REPORT_PHASE,
      {
        notes: 'Derivada de R2 (SIGINT). Límite: hipótesis sin confirmar.',
      },
    ),
    report('humint', 'R3', 'presencia', at(2, 0), 5, 'no se acredita independencia de fuentes'),
    report('humint', 'R5', 'presencia', at(0, 2), 5, 'no se acredita independencia de fuentes'),

    // M-1, días 5–16
    report('sensores', 'F2', 'presencia', at(-1, 0), 6, 'sin descripción de la captura'),
    report('sigint', 'R4', 'coordinaciones', at(-4, -1), 6, 'sin transcripción'),
    report('humint', 'R6', 'presencia', at(-3, -3), 6, 'sin relato de fuente'),
    report('sensores', 'F3', 'presencia', at(-2, -1), 6, 'sin detalle del dispositivo'),
    report('sigint', 'R7', 'coordinaciones', at(-4, 3), 6, 'sin interlocutores identificados'),

    // M-1, días 17–23
    report('humint', 'R8', 'presencia', at(2, 2), 7, 'sin relato de fuente'),
    report('sensores', 'F4', 'presencia', at(-1, 3), 7, 'sin metadatos de captura'),
    report('uas', 'R9', 'sobrevuelo UAS', at(4, 1), 7, 'no se precisa producto de imagen'),
    report(
      'sigint',
      'R10',
      'movimiento de integrantes',
      at(-5, -4),
      7,
      'sin transcripción ni atribución adicional',
    ),
    line('ruta', 'R10 · movimiento', [at(-8, -8), at(-5, -4), at(-2, -2)], 7, 7, {
      faction: 'roja',
      notes:
        'Movimiento reportado por SIGINT (R10). Límite: no se describe la ruta real; el trazo es ilustrativo.',
    }),
    report('sigint', 'R11', 'coordinaciones', at(-3, 4), 7, 'sin transcripción'),
    report('humint', 'R12', 'presencia', at(1, -2), 7, 'sin relato de fuente'),
    report('sigint', 'R13', 'coordinaciones', at(-5, 1), 7, 'sin transcripción'),

    // D-6 a D-2
    report('sensores', 'V4', 'presencia', at(3, 0), 8, 'sin descripción de la captura'),
    report('uas', 'R14', 'sobrevuelo UAS', at(3, -1), 8, 'no se precisa producto de imagen'),
    report('sensores', 'V5', 'presencia', at(-2, 2), 8, 'sin descripción de la captura'),
    // Zona sin rótulo: una etiqueta en su centro taparía el símbolo de ÉCHO.
    line(
      'zona',
      '',
      [at(2.5, 0.2), at(2.5, 2.2), at(0.5, 2.2), at(0.5, 0.2)],
      8,
      LAST_REPORT_PHASE,
      {
        faction: 'roja',
        notes: 'Punto de interés delimitado por la convergencia de sensores, HUMINT, SIGINT y UAS.',
      },
    ),
    unit(
      'persona',
      'ÉCHO (posible)',
      { 8: at(1.5, 1.2) },
      {
        faction: 'roja',
        echelon: '',
        status: 'planeado',
        start: 8,
        end: 8,
        notes: 'Objetivo ficticio. Marco punteado: ubicación posible, aún no confirmada.',
      },
    ),
    unit(
      'especiales',
      'FUERZA DE ACCIÓN',
      { 8: at(6, 7), 9: at(3.5, 3.2) },
      {
        echelon: '•••',
        mobility: 'asalto-aereo',
        start: 8,
        card: { pax: 30, mision: 'Acción sobre el objetivo' },
      },
    ),

    // D: acción
    unit(
      'persona',
      'ÉCHO',
      { 9: at(1.5, 1.2) },
      {
        faction: 'roja',
        echelon: '',
        start: 9,
        notes: 'Objetivo ficticio, ubicación confirmada por la convergencia de fuentes.',
      },
    ),
    line('aislar', '', [at(1.5, 1.2), at(1.5, 3.2)], 9, 9),
  ];

  return {
    v: 1,
    name: 'Ejercicio Argos (inteligencia integrada, ficticio)',
    speed: 2,
    phases,
    objects,
  };
}
