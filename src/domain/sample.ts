import { airAssaultScenario } from './airAssault';
import { telaranaScenario } from './telarana';
import { argosScenario } from './argos';
import { exerciseScenario } from './exercise';
import { uid } from './id';
import type {
  FactionId,
  Frames,
  LineFrame,
  LineObject,
  LineType,
  Phase,
  PointFrame,
  PointObject,
  PointType,
  Scenario,
  UnitObject,
  UnitType,
} from './types';

export function blankScenario(): Scenario {
  return {
    v: 1,
    name: 'Escenario sin título',
    speed: 2,
    phases: [{ id: uid(), title: 'Fase 1', date: '', desc: '', view: null }],
    objects: [],
  };
}

/** Escenario de ejemplo ficticio del prototipo ("Ejercicio Cordillera"). */
export function sampleScenario(): Scenario {
  const P = (title: string, date: string, desc: string): Phase => ({
    id: uid(),
    title,
    date,
    desc,
    view: { c: [4.268, -74.635], z: 12 },
  });
  const u = (
    type: UnitType,
    faction: FactionId,
    echelon: string,
    label: string,
    frames: Frames<PointFrame>,
    start = 0,
    end: number | null = null,
  ): UnitObject => ({
    id: uid(),
    kind: 'unit',
    type,
    faction,
    echelon,
    label,
    notes: '',
    start,
    end,
    frames,
  });
  const pt = (
    type: PointType,
    faction: FactionId,
    label: string,
    frames: Frames<PointFrame>,
    start = 0,
    end: number | null = null,
  ): PointObject => ({
    id: uid(),
    kind: 'point',
    type,
    faction,
    label,
    notes: '',
    start,
    end,
    frames,
  });
  const ln = (
    type: LineType,
    faction: FactionId,
    label: string,
    frames: Frames<LineFrame>,
    start = 0,
    end: number | null = null,
  ): LineObject => ({
    id: uid(),
    kind: 'line',
    type,
    faction,
    label,
    notes: '',
    start,
    end,
    frames,
  });

  return {
    v: 1,
    name: 'Ejercicio Cordillera (ejemplo ficticio)',
    speed: 2,
    phases: [
      P(
        'Despliegue inicial',
        'D-1 · 05:00',
        'Escenario de ejemplo. La Fuerza Azul ocupa posiciones de partida al norte; la Fuerza Roja defiende la colina del Objetivo Alfa.',
      ),
      P(
        'Avance sobre el objetivo',
        'D-1 · 09:30',
        'Dos ejes de avance convergen sobre Alfa. Contacto con la posición roja a las 08:50.',
      ),
      P(
        'Consolidación',
        'D-1 · 15:00',
        'Alfa asegurado. La Fuerza Roja se repliega al sureste y la línea de frente se desplaza.',
      ),
    ],
    objects: [
      u('infanteria', 'azul', 'II', 'BI-1', {
        0: { lat: 4.3, lng: -74.66 },
        1: { lat: 4.262, lng: -74.622 },
        2: { lat: 4.24, lng: -74.603 },
      }),
      u('blindados', 'azul', 'I', 'Cía B', {
        0: { lat: 4.306, lng: -74.628 },
        1: { lat: 4.272, lng: -74.601 },
        2: { lat: 4.247, lng: -74.588 },
      }),
      u('artilleria', 'azul', 'I', 'Bat. 3', { 0: { lat: 4.318, lng: -74.7 } }),
      u('pc', 'azul', 'II', 'PC Azul', {
        0: { lat: 4.322, lng: -74.678 },
        2: { lat: 4.29, lng: -74.65 },
      }),
      u('infanteria', 'roja', 'I', 'Roja 1', {
        0: { lat: 4.236, lng: -74.6 },
        1: { lat: 4.228, lng: -74.592 },
        2: { lat: 4.205, lng: -74.565 },
      }),
      u('reconocimiento', 'roja', '•••', 'Roja R', { 0: { lat: 4.258, lng: -74.645 } }, 0, 0),
      pt('objetivo', 'azul', 'OBJ Alfa', { 0: { lat: 4.236, lng: -74.598 } }),
      pt('evento', 'amarilla', 'Contacto 08:50', { 1: { lat: 4.25, lng: -74.612 } }, 1, 1),
      ln(
        'eje',
        'azul',
        '',
        {
          0: {
            pts: [
              [4.296, -74.656],
              [4.272, -74.636],
              [4.247, -74.606],
            ],
          },
        },
        0,
        1,
      ),
      ln(
        'eje',
        'azul',
        '',
        {
          0: {
            pts: [
              [4.302, -74.624],
              [4.278, -74.607],
              [4.252, -74.592],
            ],
          },
        },
        0,
        1,
      ),
      ln('frente', 'roja', 'Línea de contacto', {
        0: {
          pts: [
            [4.262, -74.69],
            [4.27, -74.64],
            [4.268, -74.585],
          ],
        },
        1: {
          pts: [
            [4.248, -74.69],
            [4.255, -74.64],
            [4.252, -74.585],
          ],
        },
        2: {
          pts: [
            [4.222, -74.69],
            [4.226, -74.64],
            [4.222, -74.585],
          ],
        },
      }),
      ln(
        'zona',
        'roja',
        'Zona defensiva',
        {
          0: {
            pts: [
              [4.25, -74.622],
              [4.25, -74.58],
              [4.22, -74.575],
              [4.218, -74.615],
            ],
          },
        },
        0,
        1,
      ),
    ],
  };
}

/** Escenarios de ejemplo que se pueden abrir desde el menú «Ejemplos». */
export const EXAMPLES: ReadonlyArray<{ name: string; create: () => Scenario }> = [
  { name: 'Ejercicio Cordillera', create: () => sampleScenario() },
  { name: 'Ejercicio Halcón (inserción aérea)', create: () => exerciseScenario() },
  { name: 'Ejercicio Colibrí (asalto aéreo con helicóptero)', create: () => airAssaultScenario() },
  { name: 'Ejercicio Argos (inteligencia integrada)', create: () => argosScenario() },
  { name: 'Operación Telaraña (operación completa)', create: () => telaranaScenario() },
];
