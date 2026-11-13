/**
 * "Ejercicio Colibrí": demostración ficticia de un asalto aéreo, pensada para verse en la
 * reproducción (2D y 3D). Un helicóptero lleva un pelotón del punto A al punto B, lo
 * desembarca, se retira a un punto de espera mientras el pelotón ataca el objetivo, lo
 * recoge en la zona de extracción y regresa. No representa ninguna operación real; la
 * fuerza opositora es un OPFOR de entrenamiento.
 *
 * Cómo se lee la animación: el helicóptero existe en todas las fases y se desplaza entre
 * ellas. El pelotón en tierra aparece (fundido) junto al helicóptero al desembarcar y se
 * desvanece junto a él al embarcar; mientras vuela no se dibuja aparte.
 */
import { line, off, phase, point, unit, type P } from './builders';
import { PRESETS, type Model3D } from './models3d';
import type { Phase, Scenario, UnitObject } from './types';

// Lugares ficticios en zona de montaña despoblada (páramo, cordillera Oriental), lejos de
// cabeceras y caseríos. Todo lo de la maniobra se define respecto al punto B.
const A: P = [4.665, -73.795]; // Punto A: helipuerto de partida
const PCA: P = [4.61, -73.755]; // control de la ruta aérea
const B: P = [4.548, -73.705]; // Punto B: zona de desembarco
const OBJ = off(B, 0.014, -0.016); // objetivo
const PA = off(B, 0.0075, -0.0085); // posición de asalto
const ASALTO = off(B, 0.0115, -0.0125); // borde del objetivo durante el asalto
const ESPERA = off(B, 0.037, 0.04); // punto de espera del helicóptero
const ZE = off(B, -0.01, -0.013); // zona de extracción
const SALIDA: P = [4.6, -73.775]; // ruta de salida

/** Modelo 3D genérico de helicóptero utilitario para la vista 3D. */
const HELO: Model3D = {
  ...PRESETS.find((p) => p.base === 'helicoptero')!,
  id: 'md-colibri-helo',
  name: 'Helicóptero de asalto',
};

/** Fija la altura de vuelo (m sobre el terreno) de cada fase del objeto. */
function withAltitude(o: UnitObject, alts: Record<number, number>): UnitObject {
  const frames = { ...o.frames };
  for (const [k, alt] of Object.entries(alts)) {
    const f = frames[Number(k)];
    if (f) frames[Number(k)] = { ...f, alt };
  }
  return { ...o, frames };
}

/** Pequeño desplazamiento para que el pelotón en tierra no tape al helicóptero. */
const beside = (p: P): P => off(p, -0.004, 0.0045);

export function airAssaultScenario(): Scenario {
  const phases: Phase[] = [
    phase(
      'Embarque en el punto A',
      'H-0:20',
      'Ejercicio ficticio de asalto aéreo. El 1.er pelotón embarca en el helicóptero de asalto en el punto A. La ruta de ingreso pasa por el PCA hasta el punto B.',
      off(A, -0.002, 0.0022),
      14,
    ),
    phase(
      'Vuelo de ingreso',
      'H-0:08',
      'El helicóptero despega con el pelotón a bordo y sobrevuela el PCA a baja altura.',
      [4.61, -73.755],
      12,
    ),
    phase(
      'Llegada al punto B',
      'H-0:01',
      'Aproximación final a la zona de desembarco en el punto B.',
      off(B, 0.002, 0.006),
      14,
    ),
    phase(
      'Desembarco',
      'H',
      'El helicóptero se posa y el pelotón desembarca: 30 PAX en tierra en menos de un minuto.',
      B,
      15,
    ),
    phase(
      'Aproximación al objetivo',
      'H+0:10',
      'El helicóptero se retira al punto de espera. El pelotón avanza a pie hasta la posición de asalto.',
      off(B, 0.015, 0.015),
      13,
    ),
    phase(
      'Asalto',
      'H+0:25',
      'El pelotón ataca el objetivo desde la posición de asalto y neutraliza al OPFOR de entrenamiento.',
      off(B, 0.011, -0.012),
      15,
    ),
    phase(
      'Repliegue a la zona de extracción',
      'H+0:45',
      'Objetivo asegurado. El pelotón se repliega a la ZE y el helicóptero vuelve desde el punto de espera.',
      off(B, 0.002, -0.012),
      14,
    ),
    phase('Extracción', 'H+0:50', 'El helicóptero se posa en la ZE y el pelotón embarca.', ZE, 15),
    phase(
      'Vuelo de salida',
      'H+0:55',
      'El helicóptero sale con el pelotón a bordo por la ruta de salida.',
      [4.6, -73.775],
      12,
    ),
    phase(
      'Regreso al punto A',
      'H+1:05',
      'El helicóptero aterriza en el punto A y el pelotón desembarca. Fin del ejercicio.',
      off(A, -0.002, 0.0022),
      14,
    ),
  ];

  const pelotonCard = { pax: 30, medios: 'Armamento individual', mision: 'Asaltar el objetivo' };

  const objects = [
    // Lugares
    point('base', 'Punto A', A),
    point('zd', 'Punto B', B, 0, 3, { iconText: 'ZD' }),
    point('pca', 'PCA', PCA, 0, 1, { iconText: '1' }),
    point('objetivo', 'Objetivo', OBJ, 0, null, { iconText: '1' }),
    line('ani', 'OBJ 1', [
      off(OBJ, 0.0035, -0.0035),
      off(OBJ, 0.0035, 0.0035),
      off(OBJ, -0.0035, 0.0035),
      off(OBJ, -0.0035, -0.0035),
    ]),

    // Helicóptero: presente en todas las fases. Con modelo 3D: despega, vuela y se posa.
    withAltitude(
      unit(
        'aviacion',
        'UH-60',
        { 0: A, 1: PCA, 2: B, 3: B, 4: ESPERA, 5: ESPERA, 6: ZE, 7: ZE, 8: SALIDA, 9: A },
        {
          echelon: 'Ø',
          mod1: 'ASLT',
          card: {
            pax: 4,
            medios: '01 UH-60 (tripulación)',
            mision: 'Insertar y extraer el pelotón',
          },
          model3d: HELO.id,
          altitude: 150,
        },
      ),
      { 0: 0, 1: 180, 2: 40, 3: 0, 4: 0, 5: 0, 6: 30, 7: 0, 8: 200, 9: 0 },
    ),

    // Pelotón: en tierra en el punto A, en el punto B hasta la extracción y de nuevo en A.
    unit(
      'especiales',
      'PEL 1',
      { 0: beside(A) },
      {
        echelon: '•••',
        mobility: 'asalto-aereo',
        end: 0,
        card: pelotonCard,
      },
    ),
    unit(
      'especiales',
      'PEL 1',
      { 3: beside(B), 4: PA, 5: ASALTO, 6: beside(ZE), 7: beside(ZE) },
      { echelon: '•••', mobility: 'asalto-aereo', start: 3, end: 7, card: pelotonCard },
    ),
    unit(
      'especiales',
      'PEL 1',
      { 9: beside(A) },
      {
        echelon: '•••',
        mobility: 'asalto-aereo',
        start: 9,
        card: pelotonCard,
      },
    ),

    // OPFOR de entrenamiento
    unit(
      'infanteria',
      'OPFOR',
      { 0: off(OBJ, 0.0005, -0.0005) },
      { faction: 'roja', echelon: '•', end: 5, card: { pax: 8, mision: 'Defender el objetivo' } },
    ),
    point('evento', 'Contacto', off(OBJ, -0.001, 0.0015), 5, 5, { faction: 'roja' }),

    // Ruta de ingreso
    line('ruta', 'Ruta de ingreso', [A, PCA, B], 0, 2, { travel: { mode: 'aereo' } }),
    // Retiro del helicóptero al punto de espera
    point('rp', 'Espera', ESPERA, 4, 6),
    // Maniobra
    line('eje', '', [beside(B), PA], 4, 4),
    line('destruir', '', [PA, OBJ], 5, 5),
    // Repliegue y extracción
    point('ze', '', ZE, 5, 7, { iconText: 'ZE' }),
    line('ruta', 'Repliegue', [ASALTO, beside(ZE)], 6, 6, { travel: { mode: 'pie' } }),
    line('ruta', 'Ruta de salida', [ZE, SALIDA, A], 7, 9, { travel: { mode: 'aereo' } }),
  ];

  return {
    v: 1,
    name: 'Ejercicio Colibrí (asalto aéreo, ficticio)',
    speed: 2,
    phases,
    objects,
    models: [HELO],
  };
}
