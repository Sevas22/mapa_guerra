/**
 * Figura 3D de una persona a partir de su perfil y su morfología: estatura, proporciones
 * (somatotipo y peso), piel, cabello y vestimenta. Sirve para la vista previa en los perfiles
 * y para crear un modelo del taller 3D que se coloca en el mapa.
 */
import { newModel, PRESETS, type CustomMesh, type Model3D } from './models3d';
import { newMorphology, type Morphology } from './morphology';
import { profileTitle, type Profile, type ProfileRole } from './profiles';
import type { FactionId, UnitType } from './types';

export interface Outfit {
  /** Ropa civil o uniforme con casco, chaleco y mochila. */
  civil: boolean;
  /** Lleva fusil en guardia baja (si no, brazos sueltos). */
  armado: boolean;
  /** Camisa o uniforme. */
  color: string;
  /** Pantalón (civil) o equipo (uniforme). */
  accent: string;
}

export const OUTFIT_PRESETS: { name: string; outfit: Outfit }[] = [
  {
    name: 'Camuflado, armado',
    outfit: { civil: false, armado: true, color: '#5b6146', accent: '#3b3f2c' },
  },
  {
    name: 'Camuflado, sin arma',
    outfit: { civil: false, armado: false, color: '#5b6146', accent: '#3b3f2c' },
  },
  {
    name: 'Civil (camiseta y jean)',
    outfit: { civil: true, armado: false, color: '#c9c3b6', accent: '#2f3d55' },
  },
  {
    name: 'Civil oscuro',
    outfit: { civil: true, armado: false, color: '#2f3135', accent: '#24262a' },
  },
  {
    name: 'Civil armado',
    outfit: { civil: true, armado: true, color: '#6b5a43', accent: '#2f3d55' },
  },
];

/** Vestimenta inicial según el rol: amenaza y propios uniformados y armados; el resto civil. */
export const defaultOutfit = (rol: ProfileRole): Outfit =>
  rol === 'amenaza' || rol === 'propio' ? OUTFIT_PRESETS[0]!.outfit : OUTFIT_PRESETS[2]!.outfit;

const HUMANS = '/models/humanos/';

/**
 * Cuerpo humano realista incluido en la app (Quaternius, CC0): hombre o mujer según el perfil,
 * con el peinado y la barba de su morfología. Mira hacia +z, por eso el giro de 90°.
 */
export function builtinHuman(f: Morphology): CustomMesh {
  const female = f.sexo === 'femenino';
  const hair: Record<string, string | null> = {
    corto: 'pelo-corto',
    rapado: female ? 'pelo-rapado-mujer' : 'pelo-rapado',
    largo: 'pelo-largo',
    recogido: 'pelo-recogido',
    calvo: null,
  };
  const parts = [hair[f.peinado] ?? null, !female && f.barba === 'barba' ? 'pelo-barba' : null]
    .filter((x): x is string => !!x)
    .map((n) => `${HUMANS}${n}.glb`);
  return {
    id: `${HUMANS}${female ? 'mujer' : 'hombre'}.glb`,
    name: female ? 'Cuerpo realista (mujer)' : 'Cuerpo realista (hombre)',
    yaw: 90,
    anim: '(ninguna)',
    parts,
    // Tonos medios de las texturas incluidas (piel clara y cabello gris para teñir).
    skinRef: '#a67858',
    hairRef: '#8f908d',
  };
}

/** Estatura media cuando no hay dato, en cm. */
const MEAN_HEIGHT = { masculino: 172, femenino: 159, '': 168 } as const;

/**
 * Modelo 3D (una figura) con la morfología de la persona. Con `human` (cuerpo humano
 * realista del escenario) la figura es esa malla adaptada; si no, la figura paramétrica.
 */
export function personModel(
  p: Profile,
  outfit: Outfit,
  id = 'person-' + p.id,
  human?: CustomMesh,
): Model3D {
  const f: Morphology = p.fisico ?? newMorphology();
  const base = PRESETS.find((x) => x.base === 'soldados')!;
  return {
    ...newModel(base),
    id,
    name: profileTitle(p),
    length: (f.estatura > 0 ? f.estatura : MEAN_HEIGHT[f.sexo]) / 100,
    engines: 1,
    variant: 'cuna',
    payload: outfit.armado ? 'fusil' : 'ninguna',
    color: outfit.color,
    accent: outfit.accent,
    body: {
      sexo: f.sexo,
      peso: f.peso,
      somatotipo: f.somatotipo,
      piel: f.piel,
      cabello: f.cabello,
      peinado: f.peinado,
      barba: f.barba,
      civil: outfit.civil,
    },
    ...(human ? { mesh: { ...human } } : {}),
  };
}

/** Símbolo e identidad con que se coloca la persona en el mapa. */
export function personUnit(rol: ProfileRole): { type: UnitType; faction?: FactionId } {
  if (rol === 'propio') return { type: 'infanteria', faction: 'azul' };
  if (rol === 'amenaza') return { type: 'persona', faction: 'roja' };
  return { type: 'persona' };
}
