import { describe, expect, it } from 'vitest';
import { sampleScenario } from './sample';
import { parseScenario } from './schema';
import {
  formatKm,
  formatMinutes,
  forceSummary,
  haversineKm,
  pathKm,
  travelMinutes,
  travelSummary,
} from './travel';
import type { UnitObject } from './types';

describe('distancias y tiempos', () => {
  it('haversine: un grado de latitud ≈ 111,2 km', () => {
    expect(haversineKm([4, -74], [5, -74])).toBeCloseTo(111.2, 0);
    expect(haversineKm([4, -74], [4, -74])).toBe(0);
  });

  it('longitud de una polilínea', () => {
    const pts: [number, number][] = [
      [4, -74],
      [5, -74],
      [5, -74],
    ];
    expect(pathKm(pts)).toBeCloseTo(111.2, 0);
    expect(pathKm([[4, -74]])).toBe(0);
  });

  it('tiempo según medio y velocidad', () => {
    expect(travelMinutes(45, { mode: 'motorizado-pavimentado' })).toBeCloseTo(60);
    expect(travelMinutes(10, { mode: 'pie', speed: 5 })).toBeCloseTo(120);
  });

  it('formatos', () => {
    expect(formatMinutes(42)).toBe('42 min');
    expect(formatMinutes(185)).toBe('3 h 05 min');
    expect(formatKm(0.85)).toBe('850 m');
    expect(formatKm(8.43)).toBe('8,4 km');
    expect(formatKm(134.2)).toBe('134 km');
  });

  it('resumen de un trazo aéreo incluye millas náuticas', () => {
    const s = travelSummary(
      [
        [4, -74],
        [5, -74],
      ],
      { mode: 'aereo' },
    );
    expect(s).toBe('111 km · 60 MN · 30 min');
    expect(
      travelSummary([
        [4, -74],
        [5, -74],
      ]),
    ).toBe('111 km');
  });
});

describe('resumen de fuerzas', () => {
  it('suma unidades y PAX visibles por identidad', () => {
    const s = sampleScenario();
    (s.objects[0] as UnitObject).card = { pax: 76 };
    (s.objects[1] as UnitObject).card = { pax: 12 };
    const f0 = forceSummary(s, 0);
    expect(f0.find((x) => x.faction === 'azul')).toEqual({ faction: 'azul', units: 4, pax: 88 });
    expect(f0.find((x) => x.faction === 'roja')?.units).toBe(2);
    // "Roja R" solo existe en la fase 0.
    expect(forceSummary(s, 1).find((x) => x.faction === 'roja')?.units).toBe(1);
  });
});

describe('esquema: adjuntos, ficha y desplazamiento', () => {
  it('acepta los campos nuevos y descarta adjuntos mal formados', () => {
    const r = parseScenario({
      phases: [
        {
          media: [
            { id: 'a', kind: 'image', name: 'croquis.png', caption: 'Croquis' },
            { id: 'b', kind: 'pdf' },
          ],
        },
      ],
      objects: [
        {
          kind: 'unit',
          type: 'especiales',
          card: { pax: 24, medios: '02 UH-60', mision: 'Asalto' },
          frames: { 0: { lat: 4, lng: -74 } },
        },
        {
          kind: 'line',
          type: 'ruta',
          travel: { mode: 'aereo' },
          frames: {
            0: {
              pts: [
                [4, -74],
                [5, -74],
              ],
            },
          },
        },
      ],
      mediaData: { a: 'data:image/png;base64,AAAA' },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scenario.phases[0]?.media).toEqual([
      { id: 'a', kind: 'image', name: 'croquis.png', caption: 'Croquis' },
    ]);
    expect(r.scenario.objects[0]).toMatchObject({ card: { pax: 24, medios: '02 UH-60' } });
    expect(r.scenario.objects[1]).toMatchObject({ travel: { mode: 'aereo' } });
    expect(r.scenario.mediaData).toEqual({ a: 'data:image/png;base64,AAAA' });
  });
});
