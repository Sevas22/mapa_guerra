import { describe, expect, it } from 'vitest';
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  DEFAULT_OVERLAYS,
  OVERLAYS,
  basemapById,
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

  it('todas las URL usan https y tienen {z}/{x}/{y}', () => {
    for (const { tiles } of [...BASEMAPS, ...OVERLAYS]) {
      expect(tiles.url.startsWith('https://')).toBe(true);
      for (const p of ['{z}', '{x}', '{y}']) expect(tiles.url).toContain(p);
      expect(tiles.attribution.length).toBeGreaterThan(0);
    }
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
    expect(previewUrl(fisico.tiles)).toContain('/tile/6/31/18');
  });
});
