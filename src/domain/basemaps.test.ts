import { describe, expect, it } from 'vitest';
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  DEFAULT_OVERLAYS,
  OVERLAYS,
  basemapById,
  isArcGIS,
  overlayById,
  previewUrl,
  tileUrl,
  validOverlays,
} from './basemaps';

describe('catálogo de capas', () => {
  it('los ids son únicos y los valores por defecto existen', () => {
    const ids = [...BASEMAPS, ...OVERLAYS].map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(basemapById(DEFAULT_BASEMAP).id).toBe(DEFAULT_BASEMAP);
    expect(validOverlays(DEFAULT_OVERLAYS)).toEqual([...DEFAULT_OVERLAYS]);
  });

  it('todas las URL usan https; las XYZ tienen {z}/{x}/{y} y las ArcGIS apuntan a un MapServer', () => {
    for (const { source } of [...BASEMAPS, ...OVERLAYS]) {
      expect(source.url.startsWith('https://')).toBe(true);
      expect(source.attribution.length).toBeGreaterThan(0);
      if (isArcGIS(source)) expect(source.url).toMatch(/\/MapServer$/);
      else for (const p of ['{z}', '{x}', '{y}']) expect(source.url).toContain(p);
    }
  });

  it('las capas oficiales de Colombia son dinámicas y tienen zoom mínimo', () => {
    for (const id of ['igac-agua', 'igac-curvas', 'igac-100k', 'dane-veredas', 'dane-municipios']) {
      const o = overlayById(id);
      expect(o?.group).toBe('Colombia (IGAC y DANE)');
      expect(o && isArcGIS(o.source) && o.source.minZoom).toBeGreaterThan(0);
    }
    expect(overlayById('dane-veredas')?.source).toMatchObject({ layers: 'show:1' });
    expect(isArcGIS(basemapById('igac-orto').source)).toBe(true);
  });

  it('basemapById cae en el primero si el id no existe', () => {
    expect(basemapById('google-earth').id).toBe(BASEMAPS[0]?.id);
  });

  it('validOverlays descarta ids desconocidos y respeta el orden del catálogo', () => {
    expect(validOverlays(['etiquetas', 'nada', 'sombreado'])).toEqual(['sombreado', 'etiquetas']);
  });

  it('tileUrl sustituye plantillas, subdominio y {r}', () => {
    expect(
      tileUrl(
        { url: 'https://{s}.ejemplo/{z}/{x}/{y}{r}.png', attribution: 'x', subdomains: 'abcd' },
        6,
        18,
        31,
      ),
    ).toBe('https://a.ejemplo/6/18/31.png');
    expect(tileUrl({ url: 'https://e/{z}/{y}/{x}', attribution: 'x' }, 6, 18, 31)).toBe(
      'https://e/6/31/18',
    );
  });

  it('previewUrl no pide un zoom mayor que el nativo', () => {
    const fisico = basemapById('fisico');
    expect(previewUrl(fisico.source)).toContain('/tile/6/31/18');
  });

  it('previewUrl de un servicio ArcGIS pide un export de la tesela de muestra', () => {
    const url = previewUrl(basemapById('igac-orto').source);
    expect(url).toContain('/ortocolombia/MapServer/export?');
    expect(url).toContain('size=256%2C256');
    expect(url).toContain('format=jpg');
  });
});
