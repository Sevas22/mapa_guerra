import { describe, expect, it } from 'vitest';
import {
  areaSummary,
  draftMeasure,
  extentKm,
  formatArea,
  formatSide,
  isAreaType,
  perimeterKm,
  polygonAreaKm2,
  polygonSides,
} from './measure';
import type { LatLngTuple } from './types';

// Cuadrado de 2 km × 2 km cerca de Bogotá (un grado de latitud ≈ 111,19 km).
const KM_LAT = 1 / 111.195;
const lat0 = 4.6;
const kmLng = KM_LAT / Math.cos((lat0 * Math.PI) / 180);
const square: LatLngTuple[] = [
  [lat0, -74.1],
  [lat0 + 2 * KM_LAT, -74.1],
  [lat0 + 2 * KM_LAT, -74.1 + 2 * kmLng],
  [lat0, -74.1 + 2 * kmLng],
];

describe('medidas de áreas', () => {
  it('reconoce las áreas', () => {
    expect(isAreaType('zona')).toBe(true);
    expect(isAreaType('ao')).toBe(true);
    expect(isAreaType('ani')).toBe(true);
    expect(isAreaType('ruta')).toBe(false);
  });

  it('calcula área, perímetro, lados y extensión de un cuadrado de 2 km', () => {
    expect(polygonAreaKm2(square)).toBeCloseTo(4, 1);
    expect(perimeterKm(square)).toBeCloseTo(8, 1);
    const sides = polygonSides(square);
    expect(sides).toHaveLength(4);
    for (const sd of sides) expect(sd.km).toBeCloseTo(2, 1);
    expect(sides[0]!.bearing).toBeCloseTo(0, 0);
    expect(sides[1]!.bearing).toBeCloseTo(90, 0);
    const ext = extentKm(square);
    expect(ext.ns).toBeCloseTo(2, 1);
    expect(ext.ew).toBeCloseTo(2, 1);
  });

  it('el área no depende del sentido en que se dibuja', () => {
    expect(polygonAreaKm2([...square].reverse())).toBeCloseTo(polygonAreaKm2(square), 6);
    expect(polygonAreaKm2(square.slice(0, 2))).toBe(0);
  });

  it('da formato legible', () => {
    expect(formatArea(0.0005)).toBe('500 m²');
    expect(formatArea(0.352)).toBe('35,2 ha');
    expect(formatArea(12.4)).toMatch(/^12,40 km² \(1\.240 ha\)$/);
    expect(formatSide(0.38)).toBe('380 m');
    expect(formatSide(1.237)).toBe('1,24 km');
    expect(areaSummary(square)).toMatch(/^Área 4,00 km² \(400 ha\) · Perímetro 8,00 km$/);
  });

  it('mide en vivo mientras se demarca un área', () => {
    const live = draftMeasure(square.slice(0, 3), square[3]!, true);
    expect(live).toContain('Tramo 2,00 km');
    expect(live).toContain('Perímetro 8,00 km');
    expect(live).toContain('Área 4,00 km²');
    expect(draftMeasure(square.slice(0, 2), square[2]!, false)).toContain('Total 4,00 km');
  });
});
