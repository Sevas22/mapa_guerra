import { describe, expect, it } from 'vitest';
import { modelParts, partsBounds } from './models3d';
import {
  bmi,
  bmiClass,
  bodyShape,
  build,
  buildOf,
  hasMorphology,
  morphologySummary,
  newMorphology,
  statureOf,
  withBuild,
  withStature,
} from './morphology';
import { OUTFIT_PRESETS, personModel } from './personModel';
import { newProfile, profilesFromCsv, profilesToCsv, type Profile } from './profiles';
import { ProfileSchema } from './schema';

describe('morfología', () => {
  it('calcula el IMC y lo clasifica', () => {
    expect(bmi({ estatura: 0, peso: 70 })).toBeNull();
    expect(bmi({ estatura: 175, peso: 70 })).toBeCloseTo(22.86, 2);
    expect(bmiClass(17)).toBe('Bajo peso');
    expect(bmiClass(22)).toBe('Normal');
    expect(bmiClass(27)).toBe('Sobrepeso');
    expect(bmiClass(32)).toBe('Obesidad I');
  });

  it('describe la complexión: flaco, atlético, gordo', () => {
    expect(build(newMorphology({ estatura: 180, peso: 55 }))).toMatch(/flaco/);
    expect(build(newMorphology({ estatura: 178, peso: 76, somatotipo: 'mesomorfo' }))).toBe(
      'Atlética',
    );
    expect(build(newMorphology({ estatura: 165, peso: 95 }))).toMatch(/gordo/);
    expect(build(newMorphology({ somatotipo: 'ectomorfo' }))).toBe('Delgada');
  });

  it('las proporciones siguen al somatotipo y al peso', () => {
    const ecto = bodyShape({ estatura: 180, peso: 60, somatotipo: 'ectomorfo', sexo: '' });
    const meso = bodyShape({ estatura: 180, peso: 80, somatotipo: 'mesomorfo', sexo: '' });
    const endo = bodyShape({ estatura: 170, peso: 100, somatotipo: 'endomorfo', sexo: '' });
    expect(meso.shoulders).toBeGreaterThan(ecto.shoulders);
    expect(endo.belly).toBeGreaterThan(meso.belly);
    expect(ecto.limbs).toBeLessThan(meso.limbs);
  });

  it('resume los datos en una línea', () => {
    const m = newMorphology({
      sexo: 'masculino',
      edad: 40,
      estatura: 170,
      peso: 85,
      somatotipo: 'endomorfo',
      piel: '#7e5236',
      ojos: 'cafés',
    });
    const s = morphologySummary(m);
    expect(s).toContain('Hombre');
    expect(s).toContain('1,70 m');
    expect(s).toContain('IMC 29,4 (sobrepeso)');
    expect(s).toContain('endomorfo');
    expect(s).toContain('piel morena');
    expect(hasMorphology(newMorphology())).toBe(false);
    expect(hasMorphology(m)).toBe(true);
  });

  it('la planilla CSV lleva y trae los datos físicos', () => {
    const csv = [
      'Alias;Rol;Estatura;Peso;Somatotipo;Sexo;Piel;Señas particulares',
      'Cóndor;Amenaza;1,68;92 kg;Endomorfo;M;Trigueña;Cicatriz en la ceja',
      'Halcón;Amenaza;;;;;;',
    ].join('\n');
    const r = profilesFromCsv(csv);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const f = r.profiles[0]!.fisico!;
    expect(f).toMatchObject({
      estatura: 168,
      peso: 92,
      somatotipo: 'endomorfo',
      sexo: 'masculino',
    });
    expect(f.piel).toBe('#a87653');
    expect(f.senas).toBe('Cicatriz en la ceja');
    expect(r.profiles[1]!.fisico).toBeUndefined();
    const back = profilesFromCsv(profilesToCsv(r.profiles));
    expect(back.ok && back.profiles[0]!.fisico).toMatchObject({ estatura: 168, peso: 92 });
  });

  it('el JSON acepta la morfología y descarta valores dañados', () => {
    const p = ProfileSchema.parse({
      nombre: 'X',
      fisico: { estatura: 175, peso: 'mucho', somatotipo: 'raro', peinado: 'largo' },
    });
    expect(p.fisico).toMatchObject({ estatura: 175, peso: 0, somatotipo: '', peinado: 'largo' });
  });

  it('la figura 3D mide la estatura y engorda con el peso', () => {
    const base = newProfile({
      fisico: newMorphology({ estatura: 185, peso: 60, somatotipo: 'ectomorfo' }),
    });
    const fat = newProfile({
      fisico: newMorphology({ estatura: 185, peso: 120, somatotipo: 'endomorfo' }),
    });
    const civil = OUTFIT_PRESETS[2]!.outfit;
    const thin = partsBounds(modelParts(personModel(base, civil)));
    const wide = partsBounds(modelParts(personModel(fat, civil)));
    expect(thin.max[1]).toBeGreaterThan(1.75);
    expect(thin.max[1]).toBeLessThan(1.95);
    expect(wide.max[2] - wide.min[2]).toBeGreaterThan(thin.max[2] - thin.min[2]);
    // El abdomen sobresale más hacia adelante (sin contar los pies).
    const front = (p: Profile) =>
      partsBounds(modelParts(personModel(p, civil)).filter((x) => x.pos[1] > 0.8)).max[0];
    expect(front(fat)).toBeGreaterThan(front(base) + 0.03);
  });

  it('las cualidades a simple vista fijan medidas coherentes y se reconocen', () => {
    const base = newMorphology({ sexo: 'masculino' });
    const gordo = withBuild(base, 'gordo');
    expect(gordo.somatotipo).toBe('endomorfo');
    expect(bmi(gordo)!).toBeGreaterThan(30);
    expect(buildOf(gordo)).toBe('gordo');
    expect(buildOf(withBuild(base, 'flaco'))).toBe('flaco');
    expect(buildOf(withBuild(base, 'acuerpado'))).toBe('acuerpado');
    expect(buildOf(withBuild(base, 'medio'))).toBe('medio');
    // Cambiar la estatura conserva la contextura.
    const alto = withStature(gordo, 'alto');
    expect(statureOf(alto)).toBe('alto');
    expect(buildOf(alto)).toBe('gordo');
    expect(alto.peso).toBeGreaterThan(gordo.peso);
    const baja = withStature(newMorphology({ sexo: 'femenino' }), 'bajo');
    expect(statureOf(baja)).toBe('bajo');
    expect(baja.estatura).toBeLessThan(alto.estatura);
    expect(statureOf(newMorphology())).toBeNull();
  });
});
