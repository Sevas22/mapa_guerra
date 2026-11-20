/**
 * Infantería: figuras de soldado con equipo y armamento, solas o en formación. Cada figura se
 * arma sobre un esqueleto de articulaciones (cadera, rodillas, hombros, codos, manos) unidas con
 * miembros redondeados, en postura de fusil en guardia baja. Los pies tocan el suelo (y = 0) y la
 * figura mira hacia +x.
 */
import type { Model3D } from '../models3d';
import { bodyShape, type BodyShape, type FacialHair, type HairStyle } from '../morphology';
import { DARK, GLASS, box, cyl, ell, limb, type Part, type Vec2, type Vec3 } from './parts';

const SKIN = '#b98d6c';
const GLOVE = '#2b2a26';
const BOOT = '#24221f';

type Weapon = 'fusil' | 'ametralladora' | 'antitanque' | 'mortero' | 'ninguna';

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Arma larga de `butt` (culata) a `muzzle` (boca), con cargador y mira. */
function longGun(butt: Vec3, muzzle: Vec3, h: number, heavy: boolean): Part[] {
  const at = (t: number) => lerp(butt, muzzle, t);
  const down: Vec3 = [0, -1, 0];
  const parts: Part[] = [
    limb(butt, at(0.28), 0.032 * h, DARK, 0.026 * h),
    limb(at(0.28), at(0.6), (heavy ? 0.042 : 0.03) * h, DARK),
    limb(at(0.6), muzzle, (heavy ? 0.016 : 0.012) * h, DARK),
    // Mira óptica sobre el cajón de mecanismos.
    limb(add(at(0.36), [0, 0.045 * h, 0]), add(at(0.5), [0, 0.045 * h, 0]), 0.018 * h, DARK),
    // Pistolete.
    limb(at(0.33), add(at(0.31), down, 0.11 * h), 0.017 * h, DARK),
  ];
  if (heavy)
    parts.push(
      box([0.12 * h, 0.12 * h, 0.1 * h], add(at(0.42), down, 0.09 * h), '#4a4f38'),
      limb(at(0.85), add(add(at(0.85), down, 0.16 * h), [0, 0, 0.05 * h]), 0.008 * h, DARK),
      limb(at(0.85), add(add(at(0.85), down, 0.16 * h), [0, 0, -0.05 * h]), 0.008 * h, DARK),
    );
  else
    parts.push(
      limb(at(0.42), add(add(at(0.44), down, 0.15 * h), [0.03 * h, 0, 0]), 0.02 * h, DARK),
    );
  return parts;
}

/** Aspecto de la figura: proporciones, piel, cabello y si lleva equipo de combate. */
export interface FigureLook {
  shape: BodyShape;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  beard: FacialHair;
  /** Ropa civil (camisa y pantalón) en vez de uniforme con casco, chaleco y mochila. */
  civil: boolean;
}

export const DEFAULT_LOOK: FigureLook = {
  shape: { shoulders: 1, belly: 1, hips: 1, limbs: 1 },
  skin: SKIN,
  hair: '#1c1916',
  hairStyle: 'corto',
  beard: 'ninguno',
  civil: false,
};

/** Cabello y vello facial. Con casco solo se ve el vello facial. */
function hairParts(
  V: (dx: number, dy: number, dz: number) => Vec3,
  h: number,
  look: FigureLook,
  helmet: boolean,
): Part[] {
  const parts: Part[] = [];
  const c = look.hair;
  if (!helmet && look.hairStyle !== 'calvo') {
    const t = look.hairStyle === 'rapado' ? 0.012 : 0.03;
    parts.push(ell([(0.205 + t) * h, (0.16 + t) * h, (0.19 + t) * h], V(0.005, 1.66, 0), c));
    if (look.hairStyle === 'largo')
      parts.push(
        limb(V(-0.07, 1.64, 0), V(-0.09, 1.38, 0), 0.085 * h, c, 0.07 * h),
        ell([0.1 * h, 0.2 * h, 0.21 * h], V(-0.02, 1.53, 0), c),
      );
    if (look.hairStyle === 'recogido')
      parts.push(ell([0.1 * h, 0.1 * h, 0.1 * h], V(-0.11, 1.66, 0), c));
  }
  if (look.beard !== 'ninguno')
    parts.push(box([0.02 * h, 0.018 * h, 0.07 * h], V(0.125, 1.55, 0), c));
  if (look.beard === 'barba') parts.push(ell([0.15 * h, 0.12 * h, 0.17 * h], V(0.06, 1.515, 0), c));
  return parts;
}

/**
 * Una figura humana de estatura `H` en (x, z): uniformada (casco, chaleco, mochila) o civil.
 * `sd`: zancada (m, pie derecho adelante). `color` es el uniforme o la camisa; `accent`, el
 * equipo o el pantalón.
 */
export function soldier(
  x: number,
  z: number,
  H: number,
  color: string,
  accent: string,
  weapon: Weapon,
  sd: number,
  look: FigureLook = DEFAULT_LOOK,
): Part[] {
  const h = H / 1.75;
  const { shoulders: S, belly: B, hips: P, limbs: T } = look.shape;
  const civil = look.civil;
  const top = color;
  const legs = civil ? accent : color;
  const gear = accent;
  const skin = look.skin;
  // Profundidad del torso: crece con el abdomen.
  const D = Math.max(1, B * 0.92);
  const V = (dx: number, dy: number, dz: number): Vec3 => [x + dx * h, dy * h, z + dz * h];
  const parts: Part[] = [];

  // Piernas: muslo, pierna y calzado, con la rodilla un poco flexionada.
  for (const s of [1, -1]) {
    const f = s * sd;
    const hip = V(0, 0.93, s * 0.1 * P);
    const knee = V(0.06 + f * 0.55, 0.5, s * 0.115 * P);
    const ankle = V(f, 0.1, s * 0.11);
    parts.push(
      limb(hip, knee, 0.085 * h * T, legs, 0.064 * h * T),
      limb(knee, ankle, 0.062 * h * T, legs, 0.05 * h),
      limb(ankle, add(ankle, [0, 0.08 * h, 0]), 0.058 * h, BOOT),
      limb(
        add(ankle, [-0.05 * h, -0.045 * h, 0]),
        add(ankle, [0.14 * h, -0.05 * h, 0]),
        0.05 * h,
        BOOT,
      ),
    );
    // Rodillera.
    if (!civil)
      parts.push(ell([0.09 * h, 0.1 * h, 0.1 * h], add(knee, [0.035 * h * T, 0, 0]), gear));
  }

  // Cadera, abdomen y pecho: el abdomen crece hacia adelante con la grasa corporal.
  parts.push(
    ell([0.26 * h * D, 0.22 * h, 0.36 * h * P], V(0, 0.96, 0), legs),
    ell([0.25 * h * B, 0.32 * h, 0.36 * h * ((P + B) / 2)], V(0.005 + (B - 1) * 0.07, 1.1, 0), top),
    ell([0.29 * h * D, 0.4 * h, 0.44 * h * S], V(0.01, 1.28, 0), top),
    // Cinturón.
    ell([0.29 * h * D, 0.07 * h, 0.39 * h * P], V(0, 1.0, 0), civil ? '#2a2320' : gear),
  );
  if (!civil)
    parts.push(
      // Chaleco portaplacas, bolsillos y mochila con saco enrollado.
      box([0.31 * h * D, 0.34 * h, 0.4 * h * S], V(0.02, 1.24, 0), gear),
      ...[-0.12, 0, 0.12].map((dz) =>
        box([0.07 * h, 0.13 * h, 0.09 * h], V(0.19 + (D - 1) * 0.15, 1.15, dz * S), gear),
      ),
      box([0.04 * h, 0.08 * h, 0.12 * h], V(0.18 + (D - 1) * 0.15, 1.33, -0.1), '#3c4031'),
      limb(V(-0.24, 1.05, 0), V(-0.24, 1.36, 0), 0.15 * h, gear, 0.13 * h),
      limb(V(-0.22, 1.47, -0.16), V(-0.22, 1.47, 0.16), 0.055 * h, '#3c4031'),
    );
  // Hombros de la camisa.
  else parts.push(ell([0.13 * h, 0.06 * h, 0.4 * h * S], V(0.0, 1.41, 0), top));

  // Cuello, cabeza, nariz y, si es uniformado, casco con ala, gafas y montura de visor.
  parts.push(
    limb(V(0, 1.42, 0), V(0.015, 1.52, 0), 0.055 * h * Math.sqrt(T), skin),
    ell([0.2 * h, 0.24 * h, 0.185 * h], V(0.025, 1.6, 0), skin),
    ell([0.06 * h, 0.05 * h, 0.06 * h], V(0.12, 1.57, 0), skin),
    ...hairParts(V, h, look, !civil),
  );
  if (!civil)
    parts.push(
      ell([0.275 * h, 0.2 * h, 0.265 * h], V(0.005, 1.665, 0), gear),
      ell([0.3 * h, 0.035 * h, 0.285 * h], V(0.005, 1.6, 0), gear),
      box([0.03 * h, 0.05 * h, 0.17 * h], V(0.125, 1.615, 0), GLASS),
      box([0.04 * h, 0.04 * h, 0.06 * h], V(0.14, 1.7, 0), DARK),
    );

  // Brazos y arma.
  const shR = V(0, 1.41, 0.2 * S);
  const shL = V(0, 1.41, -0.2 * S);
  const arm = (sh: Vec3, el: Vec3, hand: Vec3) => [
    ell([0.13 * h * T, 0.12 * h * T, 0.13 * h * T], sh, top),
    limb(sh, el, 0.058 * h * T, top, 0.05 * h * T),
    limb(el, hand, 0.048 * h * T, civil ? skin : top, 0.04 * h * T),
    ell([0.08 * h, 0.07 * h, 0.06 * h], hand, civil ? skin : GLOVE),
  ];
  if (weapon === 'ninguna') {
    // Brazos sueltos a los lados, separados del cuerpo según su volumen.
    const out = 0.07 * (B - 1) + 0.05 * (T - 1);
    parts.push(
      ...arm(shR, V(-0.01, 1.13, 0.25 * S + out), V(0.04, 0.86, 0.24 * S + out)),
      ...arm(shL, V(-0.01, 1.13, -0.25 * S - out), V(0.02, 0.86, -0.24 * S - out)),
    );
  } else if (weapon === 'antitanque') {
    // Lanzador al hombro, apuntando al frente.
    parts.push(
      ...arm(shR, V(0.12, 1.2, 0.3), V(0.17, 1.42, 0.2)),
      ...arm(shL, V(0.25, 1.25, -0.12), V(0.38, 1.46, 0.12)),
      limb(V(-0.42, 1.53, 0.19), V(0.72, 1.53, 0.19), 0.07 * h, '#55603f'),
      limb(V(0.15, 1.53, 0.19), V(0.15, 1.42, 0.19), 0.02 * h, DARK),
      box([0.06 * h, 0.09 * h, 0.07 * h], V(0.3, 1.62, 0.12), DARK),
    );
  } else {
    // Arma larga en guardia baja: culata al hombro derecho, boca hacia el frente y abajo.
    const heavy = weapon === 'ametralladora';
    const fx = (D - 1) * 0.15;
    const butt = V(0.12 + fx, 1.33, 0.13);
    const muzzle = V((heavy ? 1.0 : 0.9) + fx, 1.08, -0.04);
    const grip = lerp(butt, muzzle, 0.3);
    const fore = lerp(butt, muzzle, 0.58);
    parts.push(
      ...arm(shR, V(0.04, 1.12, 0.27 * S), add(grip, [0, -0.06 * h, 0.015 * h])),
      ...arm(shL, V(0.24, 1.16, -0.22 * S), add(fore, [0, -0.035 * h, -0.02 * h])),
      ...longGun(butt, muzzle, h, heavy),
    );
    if (weapon === 'mortero') {
      // Tubo de mortero en posición, a la izquierda del sirviente.
      const base = V(0.55, 0.03, -0.5);
      parts.push(
        cyl('y', 0.2 * h, 0.04 * h, base, DARK),
        limb(base, V(0.8, 0.95, -0.5), 0.045 * h, DARK),
        limb(V(0.75, 0.6, -0.5), V(0.98, 0.02, -0.38), 0.012 * h, DARK),
        limb(V(0.75, 0.6, -0.5), V(0.98, 0.02, -0.62), 0.012 * h, DARK),
      );
    }
  }
  return parts;
}

/** Posiciones (x adelante, z derecha) de `n` soldados en la formación, separados `d`. */
export function formation(kind: string, n: number, d: number): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    switch (kind) {
      case 'linea':
        out.push([0, (i - (n - 1) / 2) * d]);
        break;
      case 'columna':
        out.push([-Math.floor(i / 2) * d, (i % 2 ? -0.5 : 0.5) * d]);
        break;
      case 'fila':
        out.push([-i * d, 0]);
        break;
      default: {
        // Cuña: el jefe adelante, los demás alternan atrás a cada lado.
        const row = Math.ceil(i / 2);
        const s = i % 2 ? 1 : -1;
        out.push(i === 0 ? [0, 0] : [-row * d * 0.8, s * row * d * 0.7]);
      }
    }
  }
  // Centrar el grupo en el origen.
  const cx = (Math.max(...out.map((p) => p[0])) + Math.min(...out.map((p) => p[0]))) / 2;
  const cz = (Math.max(...out.map((p) => p[1])) + Math.min(...out.map((p) => p[1]))) / 2;
  return out.map(([x, z]) => [x - cx, z - cz]);
}

/** Arma de cada integrante: el arma especial la lleva uno de cada tres. */
export const weaponOf = (m: Model3D, i: number): Weapon =>
  m.engines === 1 || i % 3 === 1 ? (m.payload as Weapon) : 'fusil';

/** Aspecto de las figuras de un modelo de infantería (morfología propia o la media). */
export function lookOf(m: Model3D): FigureLook {
  const b = m.body;
  if (!b) return DEFAULT_LOOK;
  return {
    shape: bodyShape({
      estatura: m.length * 100,
      peso: b.peso,
      somatotipo: b.somatotipo,
      sexo: b.sexo,
    }),
    skin: b.piel,
    hair: b.cabello,
    hairStyle: b.peinado,
    beard: b.barba,
    civil: b.civil,
  };
}

/** Soldado, persona o grupo de infantería. */
export function infantryParts(m: Model3D): Part[] {
  const pos = formation(m.variant, m.engines, m.span);
  const look = lookOf(m);
  return pos.flatMap(([x, z], i) => {
    const stride = ((i % 3) - 1) * 0.14;
    return soldier(x, z, m.length, m.color, m.accent, weaponOf(m, i), stride, look);
  });
}
