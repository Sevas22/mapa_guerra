import { describe, expect, it } from 'vitest';
import { normalizeModel, newModel } from './models3d';
import { assetCredit, assetModel, parseCatalog } from './realCatalog';
import { Model3DSchema } from './schema';

const tank = {
  file: 'tanque.glb',
  name: 'Carro de combate',
  base: 'tanque',
  length: 9.8,
  span: 3.7,
  yaw: 90,
  author: 'Autor de prueba',
  license: 'CC-BY-4.0',
  url: 'https://sketchfab.com/3d-models/ejemplo',
};

describe('catálogo de modelos reales', () => {
  it('lee el catálogo y descarta entradas mal escritas', () => {
    const r = parseCatalog([tank, { file: 'x.glb', base: 'nave-espacial', length: 3 }]);
    expect(r.assets).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(parseCatalog({ modelos: [tank] }).assets).toHaveLength(1);
    expect(parseCatalog('basura').assets).toEqual([]);
  });

  it('convierte una entrada en un modelo del taller con su archivo y créditos', () => {
    const a = parseCatalog([tank]).assets[0]!;
    const m = newModel(assetModel(a));
    expect(m.base).toBe('tanque');
    expect(m.length).toBe(9.8);
    expect(m.mesh).toMatchObject({ id: '/models/vehiculos/tanque.glb', yaw: 90 });
    expect(m.mesh!.credit).toBe(assetCredit(a));
    expect(assetCredit(a)).toContain('por Autor de prueba');
    expect(assetCredit(a)).toContain('CC-BY-4.0');
    // Se guarda y se vuelve a leer sin perder el archivo ni los créditos.
    expect(Model3DSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(normalizeModel(m));
  });
});
