import { describe, expect, it } from 'vitest';
import {
  CSV_TEMPLATE,
  newProfile,
  parseCsv,
  parseRole,
  profileTitle,
  profilesFromCsv,
  profilesToCsv,
} from './profiles';

describe('perfiles de operación', () => {
  it('lee CSV con punto y coma, comillas y saltos de línea', () => {
    const rows = parseCsv('a;b;c\r\n"x;1";"di ""y""";"l1\nl2"\r\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['x;1', 'di "y"', 'l1\nl2'],
    ]);
  });

  it('lee CSV con comas', () => {
    expect(parseCsv('Nombre,Alias\nAna,La Profe')).toEqual([
      ['Nombre', 'Alias'],
      ['Ana', 'La Profe'],
    ]);
  });

  it('acepta encabezados con tildes, mayúsculas y sinónimos', () => {
    const r = profilesFromCsv(
      'NOMBRE COMPLETO;Alias;Función;Unidad;Tipo;Tipo de fuente;Cédula\nJuan Pérez;Tigre;Explosivista;OPFOR;Integrante;;123\n;K-Uno;;;Fuente;Fuente de área;\n',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profiles).toHaveLength(2);
    expect(r.profiles[0]).toMatchObject({
      nombre: 'Juan Pérez',
      alias: 'Tigre',
      cargo: 'Explosivista',
      organizacion: 'OPFOR',
      rol: 'amenaza',
      documento: '123',
    });
    expect(r.profiles[1]).toMatchObject({ alias: 'K-Uno', rol: 'fuente', fuente: 'area' });
  });

  it('rechaza planillas sin columna de nombre ni alias', () => {
    expect(profilesFromCsv('Cargo;Unidad\nX;Y').ok).toBe(false);
  });

  it('la plantilla descargable se vuelve a leer igual', () => {
    const r = profilesFromCsv(CSV_TEMPLATE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profiles.map((p) => p.rol)).toEqual(['propio', 'amenaza', 'fuente']);
    expect(r.profiles[2]!.fuente).toBe('area');
  });

  it('exporta e importa sin perder datos', () => {
    const p = newProfile({
      nombre: 'Ana; "la" de\nprueba',
      alias: 'X',
      rol: 'persona',
      notas: 'n',
    });
    const r = profilesFromCsv(profilesToCsv([p]));
    expect(r.ok && r.profiles[0]).toMatchObject({ nombre: p.nombre, alias: 'X', notas: 'n' });
  });

  it('interpreta roles escritos a mano', () => {
    expect(parseRole('Propia')).toBe('propio');
    expect(parseRole('GAO')).toBe('amenaza');
    expect(parseRole('fuente humana')).toBe('fuente');
    expect(parseRole('')).toBe('persona');
  });

  it('arma el título con nombre y alias', () => {
    expect(profileTitle(newProfile({ nombre: 'Ana', alias: 'Profe' }))).toBe('Ana (a. Profe)');
    expect(profileTitle(newProfile({ alias: 'Profe' }))).toBe('a. Profe');
  });
});
