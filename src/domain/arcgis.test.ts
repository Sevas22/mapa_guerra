import { describe, expect, it } from 'vitest';
import {
  EARTH_RADIUS,
  clampExportSize,
  exportUrl,
  lngLatTo3857,
  tileBBox3857,
  type ArcGISExportSpec,
} from './arcgis';

const HALF = Math.PI * EARTH_RADIUS; // 20037508.34…

describe('proyección Web Mercator', () => {
  it('lngLatTo3857 en puntos conocidos', () => {
    const [x0, y0] = lngLatTo3857(0, 0);
    expect(x0).toBe(0);
    expect(y0).toBeCloseTo(0, 6);
    const [x, y] = lngLatTo3857(-74.0721, 4.711);
    expect(x).toBeCloseTo(-8245668.45, 1);
    expect(y).toBeGreaterThan(520000);
    expect(y).toBeLessThan(530000);
    expect(lngLatTo3857(180, 0)[0]).toBeCloseTo(HALF, 2);
  });

  it('recorta latitudes polares', () => {
    expect(Number.isFinite(lngLatTo3857(0, 90)[1])).toBe(true);
    expect(lngLatTo3857(0, 90)[1]).toBeCloseTo(HALF, 0);
  });

  it('tileBBox3857 de la tesela raíz y de una tesela de Colombia', () => {
    const [a, b, c, d] = tileBBox3857(0, 0, 0);
    expect(a).toBeCloseTo(-HALF, 2);
    expect(b).toBeCloseTo(-HALF, 2);
    expect(c).toBeCloseTo(HALF, 2);
    expect(d).toBeCloseTo(HALF, 2);
    const [xmin, ymin, xmax, ymax] = tileBBox3857(6, 18, 31);
    const [bx, by] = lngLatTo3857(-74, 4.6); // Colombia cae en esa tesela
    expect(bx).toBeGreaterThan(xmin);
    expect(bx).toBeLessThan(xmax);
    expect(by).toBeGreaterThan(ymin);
    expect(by).toBeLessThan(ymax);
  });
});

describe('exportUrl', () => {
  const spec: ArcGISExportSpec = {
    kind: 'arcgis',
    url: 'https://srv.example/arcgis/rest/services/carto/MapServer/',
    attribution: '© IGAC',
    layers: 'show:1,305',
  };

  it('arma la petición export en 3857 con transparencia', () => {
    const u = new URL(exportUrl(spec, [-1, -2, 3, 4.5], [800, 600]));
    expect(u.pathname).toBe('/arcgis/rest/services/carto/MapServer/export');
    const q = u.searchParams;
    expect(q.get('bbox')).toBe('-1.00,-2.00,3.00,4.50');
    expect(q.get('bboxSR')).toBe('3857');
    expect(q.get('imageSR')).toBe('3857');
    expect(q.get('size')).toBe('800,600');
    expect(q.get('format')).toBe('png32');
    expect(q.get('transparent')).toBe('true');
    expect(q.get('f')).toBe('image');
    expect(q.get('layers')).toBe('show:1,305');
    expect(q.get('dpi')).toBe('96');
  });

  it('jpg sin transparencia y sin parámetro layers si no se indica', () => {
    const q = new URL(
      exportUrl(
        { kind: 'arcgis', url: 'https://s/MapServer', attribution: 'x', format: 'jpg' },
        [0, 0, 1, 1],
        [10, 10],
      ),
    ).searchParams;
    expect(q.get('transparent')).toBe('false');
    expect(q.has('layers')).toBe(false);
  });

  it('clampExportSize respeta el máximo del servidor', () => {
    expect(clampExportSize(800, 600)).toEqual([800, 600]);
    expect(clampExportSize(8192, 4096)).toEqual([4096, 2048]);
    expect(clampExportSize(0.2, 0.2)).toEqual([1, 1]);
  });
});
