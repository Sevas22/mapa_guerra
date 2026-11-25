/**
 * Morfología: características físicas de una persona (estatura, peso, somatotipo, piel,
 * cabello, ojos, señas particulares). Se registra en el perfil, resume la descripción física en
 * la ficha y da las proporciones de su figura 3D.
 */

export const SOMATOTYPES = ['ectomorfo', 'mesomorfo', 'endomorfo'] as const;
export type Somatotype = (typeof SOMATOTYPES)[number];

export const SOMATOTYPE_DEFS: Record<Somatotype, { name: string; hint: string }> = {
  ectomorfo: {
    name: 'Ectomorfo',
    hint: 'Delgado, extremidades largas, poca masa muscular y grasa',
  },
  mesomorfo: { name: 'Mesomorfo', hint: 'Atlético, hombros anchos, buena masa muscular' },
  endomorfo: {
    name: 'Endomorfo',
    hint: 'Contextura gruesa, tiende a acumular grasa, cintura ancha',
  },
};

export const SEXES = ['masculino', 'femenino'] as const;
export type Sex = (typeof SEXES)[number];

/** Tonos de piel de referencia (de más claro a más oscuro). */
export const SKIN_TONES = [
  { id: 'muy-clara', name: 'Muy clara', color: '#f1d3bc' },
  { id: 'clara', name: 'Clara', color: '#e0b896' },
  { id: 'trigueña-clara', name: 'Trigueña clara', color: '#c99a72' },
  { id: 'trigueña', name: 'Trigueña', color: '#a87653' },
  { id: 'morena', name: 'Morena', color: '#7e5236' },
  { id: 'negra', name: 'Negra', color: '#4e3122' },
] as const;

export const HAIR_COLORS = [
  { id: 'negro', name: 'Negro', color: '#1c1916' },
  { id: 'castaño-oscuro', name: 'Castaño oscuro', color: '#3b2a1e' },
  { id: 'castaño', name: 'Castaño', color: '#6a4a30' },
  { id: 'rubio', name: 'Rubio', color: '#b8955a' },
  { id: 'rojizo', name: 'Rojizo', color: '#8a3f22' },
  { id: 'canoso', name: 'Canoso', color: '#a8a8a2' },
] as const;

export const HAIR_STYLES = ['corto', 'rapado', 'largo', 'recogido', 'calvo'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];
export const HAIR_STYLE_NAMES: Record<HairStyle, string> = {
  corto: 'Corto',
  rapado: 'Rapado',
  largo: 'Largo',
  recogido: 'Recogido',
  calvo: 'Calvo',
};

export const FACIAL_HAIR = ['ninguno', 'bigote', 'barba'] as const;
export type FacialHair = (typeof FACIAL_HAIR)[number];
export const FACIAL_HAIR_NAMES: Record<FacialHair, string> = {
  ninguno: 'Sin vello facial',
  bigote: 'Bigote',
  barba: 'Barba',
};

export const EYE_COLORS = ['negros', 'cafés', 'miel', 'verdes', 'azules', 'grises'] as const;

export interface Morphology {
  sexo: Sex | '';
  /** Edad aproximada, en años (0 = sin dato). */
  edad: number;
  /** Estatura en centímetros (0 = sin dato). */
  estatura: number;
  /** Peso en kilogramos (0 = sin dato). */
  peso: number;
  somatotipo: Somatotype | '';
  /** Color de piel (#rrggbb); ver `SKIN_TONES`. */
  piel: string;
  /** Color de cabello (#rrggbb); ver `HAIR_COLORS`. */
  cabello: string;
  peinado: HairStyle;
  barba: FacialHair;
  ojos: string;
  /** Señas particulares: cicatrices, tatuajes, lunares, cojera, lentes… */
  senas: string;
}

export function newMorphology(patch: Partial<Morphology> = {}): Morphology {
  return {
    sexo: '',
    edad: 0,
    estatura: 0,
    peso: 0,
    somatotipo: '',
    piel: SKIN_TONES[3].color,
    cabello: HAIR_COLORS[0].color,
    peinado: 'corto',
    barba: 'ninguno',
    ojos: '',
    senas: '',
    ...patch,
  };
}

/** Índice de masa corporal (kg/m²), o `null` sin estatura y peso. */
export function bmi(m: Pick<Morphology, 'estatura' | 'peso'>): number | null {
  if (!(m.estatura > 0) || !(m.peso > 0)) return null;
  const h = m.estatura / 100;
  return m.peso / (h * h);
}

// ---------------------------------------------------------------- cualidades rápidas

/** Estatura a simple vista: bajo, medio o alto (cm de referencia por sexo). */
export const STATURES = [
  { id: 'bajo', name: 'Bajo', cm: { masculino: 160, femenino: 150 } },
  { id: 'medio', name: 'Medio', cm: { masculino: 172, femenino: 160 } },
  { id: 'alto', name: 'Alto', cm: { masculino: 186, femenino: 173 } },
] as const;
export type Stature = (typeof STATURES)[number]['id'];

/** Contextura a simple vista: somatotipo e IMC de referencia. */
export const BUILDS = [
  { id: 'flaco', name: 'Flaco', somatotipo: 'ectomorfo', imc: 18 },
  { id: 'medio', name: 'Medio', somatotipo: '', imc: 22.5 },
  { id: 'acuerpado', name: 'Acuerpado', somatotipo: 'mesomorfo', imc: 26 },
  { id: 'gordo', name: 'Gordo', somatotipo: 'endomorfo', imc: 33 },
] as const;
export type BuildId = (typeof BUILDS)[number]['id'];

const cmFor = (m: Pick<Morphology, 'sexo'>, id: Stature) =>
  STATURES.find((x) => x.id === id)!.cm[m.sexo === 'femenino' ? 'femenino' : 'masculino'];

/** Cualidad de estatura que corresponde a los centímetros cargados (o null sin dato). */
export function statureOf(m: Pick<Morphology, 'sexo' | 'estatura'>): Stature | null {
  if (!(m.estatura > 0)) return null;
  const mid = cmFor(m, 'medio');
  return m.estatura < mid - 6 ? 'bajo' : m.estatura > mid + 7 ? 'alto' : 'medio';
}

/** Cualidad de contextura según el somatotipo y el IMC (o null sin dato). */
export function buildOf(m: Morphology): BuildId | null {
  const v = bmi(m);
  if (v == null) {
    const b = BUILDS.find((x) => x.somatotipo && x.somatotipo === m.somatotipo);
    return b?.id ?? null;
  }
  if (v >= 30) return 'gordo';
  if (v < 19.5) return 'flaco';
  if (m.somatotipo === 'mesomorfo' || v >= 25) return 'acuerpado';
  return 'medio';
}

/** Fija la estatura y conserva la contextura (el peso se ajusta para el mismo IMC). */
export function withStature(m: Morphology, id: Stature): Morphology {
  const estatura = cmFor(m, id);
  const imc = bmi(m) ?? BUILDS[1].imc;
  const h = estatura / 100;
  return { ...m, estatura, peso: Math.round(imc * h * h) };
}

/** Fija la contextura: somatotipo y peso para su IMC (con estatura media si falta). */
export function withBuild(m: Morphology, id: BuildId): Morphology {
  const b = BUILDS.find((x) => x.id === id)!;
  const estatura = m.estatura > 0 ? m.estatura : cmFor(m, 'medio');
  const h = estatura / 100;
  return { ...m, estatura, somatotipo: b.somatotipo, peso: Math.round(b.imc * h * h) };
}

/** Clasificación del IMC según la OMS. */
export function bmiClass(v: number): string {
  if (v < 18.5) return 'Bajo peso';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Sobrepeso';
  if (v < 35) return 'Obesidad I';
  if (v < 40) return 'Obesidad II';
  return 'Obesidad III';
}

/** Complexión que se describe a simple vista: flaco, medio, robusto, gordo. */
export function build(m: Morphology): string {
  const v = bmi(m);
  if (v == null) {
    if (m.somatotipo === 'ectomorfo') return 'Delgada';
    if (m.somatotipo === 'mesomorfo') return 'Atlética';
    if (m.somatotipo === 'endomorfo') return 'Gruesa';
    return '';
  }
  if (v < 18.5) return 'Muy delgada (flaco)';
  if (v < 22) return m.somatotipo === 'mesomorfo' ? 'Atlética delgada' : 'Delgada';
  if (v < 25) return m.somatotipo === 'mesomorfo' ? 'Atlética' : 'Media';
  if (v < 30) return m.somatotipo === 'mesomorfo' ? 'Robusta (musculosa)' : 'Robusta';
  return 'Obesa (gordo)';
}

const named = <T extends { color: string; name: string }>(list: readonly T[], c: string) =>
  list.find((x) => x.color.toLowerCase() === c.toLowerCase())?.name.toLowerCase();

/** Hay algún dato físico cargado. */
export const hasMorphology = (m: Morphology | undefined): m is Morphology =>
  !!m &&
  (m.estatura > 0 ||
    m.peso > 0 ||
    !!m.somatotipo ||
    !!m.sexo ||
    m.edad > 0 ||
    !!m.senas.trim() ||
    !!m.ojos);

const dec = (v: number, d = 0) => v.toFixed(d).replace('.', ',');

/** Descripción física en una línea, para la ficha y la planilla. */
export function morphologySummary(m: Morphology): string {
  const parts: string[] = [];
  if (m.sexo) parts.push(m.sexo === 'masculino' ? 'Hombre' : 'Mujer');
  if (m.edad > 0) parts.push(`${m.edad} años`);
  if (m.estatura > 0) parts.push(`${dec(m.estatura / 100, 2)} m`);
  if (m.peso > 0) parts.push(`${dec(m.peso)} kg`);
  const v = bmi(m);
  if (v != null) parts.push(`IMC ${dec(v, 1)} (${bmiClass(v).toLowerCase()})`);
  if (m.somatotipo) parts.push(SOMATOTYPE_DEFS[m.somatotipo].name.toLowerCase());
  const b = build(m);
  if (b) parts.push(`complexión ${b.toLowerCase()}`);
  const skin = named(SKIN_TONES, m.piel);
  if (skin) parts.push(`piel ${skin}`);
  const hair = m.peinado === 'calvo' ? 'calvo' : named(HAIR_COLORS, m.cabello);
  if (hair) parts.push(m.peinado === 'calvo' ? 'calvo' : `cabello ${hair} ${m.peinado}`);
  if (m.barba !== 'ninguno') parts.push(FACIAL_HAIR_NAMES[m.barba].toLowerCase());
  if (m.ojos) parts.push(`ojos ${m.ojos}`);
  return parts.join(' · ');
}

/**
 * Proporciones de la figura 3D, como factores sobre una figura media (1 = medio):
 * `shoulders` ancho de hombros y pecho, `belly` volumen del abdomen, `hips` cadera, `limbs`
 * grosor de brazos y piernas.
 */
export interface BodyShape {
  shoulders: number;
  belly: number;
  hips: number;
  limbs: number;
}

export function bodyShape(
  m: Pick<Morphology, 'estatura' | 'peso' | 'somatotipo' | 'sexo'>,
): BodyShape {
  const base: BodyShape =
    m.somatotipo === 'ectomorfo'
      ? { shoulders: 0.9, belly: 0.86, hips: 0.92, limbs: 0.82 }
      : m.somatotipo === 'mesomorfo'
        ? { shoulders: 1.14, belly: 0.98, hips: 0.98, limbs: 1.12 }
        : m.somatotipo === 'endomorfo'
          ? { shoulders: 1.04, belly: 1.18, hips: 1.1, limbs: 1.06 }
          : { shoulders: 1, belly: 1, hips: 1, limbs: 1 };
  // La grasa corporal (IMC) ensancha sobre todo el abdomen.
  const v = bmi(m);
  const fat = v == null ? 0 : Math.max(-0.35, Math.min(1.3, (v - 22.5) / 9));
  const shape: BodyShape = {
    shoulders: base.shoulders * (1 + 0.14 * fat),
    belly: base.belly * (1 + 0.55 * fat),
    hips: base.hips * (1 + 0.3 * fat),
    limbs: base.limbs * (1 + 0.28 * fat),
  };
  if (m.sexo === 'femenino') {
    shape.shoulders *= 0.9;
    shape.hips *= 1.12;
    shape.limbs *= 0.9;
  }
  return shape;
}
