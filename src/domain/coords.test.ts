import { describe, expect, it } from 'vitest';
import {
  formatCursor,
  formatDMS,
  isInColombia,
  isValidLatLng,
  parseCoords,
  scenarioBounds,
} from './coords';
import { blankScenario, sampleScenario } from './sample';

const close = (v: number | undefined, expected: number) => expect(v).toBeCloseTo(expected, 4);

describe('parseCoords', () => {
  it('decimal con coma', () => {
    expect(parseCoords('4.7110, -74.0721')).toEqual({ lat: 4.711, lng: -74.0721 });
  });

  it('decimal con espacio o punto y coma', () => {
    expect(parseCoords('  4.7110   -74.0721 ')).toEqual({ lat: 4.711, lng: -74.0721 });
    expect(parseCoords('4.7110;-74.0721')).toEqual({ lat: 4.711, lng: -74.0721 });
  });

  it('DMS con símbolos y O de oeste', () => {
    const r = parseCoords('4°42′40″N 74°04′20″O');
    close(r?.lat, 4 + 42 / 60 + 40 / 3600);
    close(r?.lng, -(74 + 4 / 60 + 20 / 3600));
  });

  it('DMS separado por espacios con W', () => {
    const r = parseCoords('4 42 40 N 74 4 20 W');
    close(r?.lat, 4.711111);
    close(r?.lng, -74.072222);
  });

  it('DMS con la longitud primero', () => {
    const r = parseCoords('74°04′20″W 4°42′40″N');
    close(r?.lat, 4.711111);
    close(r?.lng, -74.072222);
  });

  it('DMS en el hemisferio sur', () => {
    const r = parseCoords('4°12′55″S 69°56′26″O');
    expect(r?.lat).toBeLessThan(0);
    expect(r?.lng).toBeLessThan(0);
  });

  it('texto libre devuelve null', () => {
    expect(parseCoords('Bogotá')).toBeNull();
    expect(parseCoords('San José del Guaviare')).toBeNull();
    expect(parseCoords('')).toBeNull();
  });
});

describe('formatos y límites', () => {
  it('formatDMS', () => {
    expect(formatDMS(4.711111, 'N', 'S')).toBe('4°42′40″N');
    expect(formatDMS(-74.072222, 'E', 'O')).toBe('74°04′20″O');
  });

  it('formatCursor', () => {
    expect(formatCursor(4.711111, -74.072222, 12)).toBe(
      '4°42′40″N 74°04′20″O · 4.71111, -74.07222 · z12',
    );
  });

  it('isInColombia e isValidLatLng', () => {
    expect(isInColombia({ lat: 4.711, lng: -74.07 })).toBe(true);
    expect(isInColombia({ lat: 40.4, lng: -3.7 })).toBe(false);
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 4, lng: -181 })).toBe(false);
    expect(isValidLatLng({ lat: -90, lng: 180 })).toBe(true);
  });

  it('scenarioBounds', () => {
    expect(scenarioBounds(blankScenario())).toBeNull();
    const b = scenarioBounds(sampleScenario());
    expect(b).not.toBeNull();
    const [[s, w], [n, e]] = b!;
    expect(s).toBeCloseTo(4.205);
    expect(n).toBeCloseTo(4.322);
    expect(w).toBeCloseTo(-74.7);
    expect(e).toBeCloseTo(-74.565);
  });
});
