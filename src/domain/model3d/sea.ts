/**
 * Piezas de embarcaciones. La línea de flotación está en y = 0: la obra viva queda debajo.
 */
import type { Model3D } from '../models3d';
import {
  DARK,
  GLASS,
  LIGHT_METAL,
  STEEL,
  box,
  cabin,
  cyl,
  ell,
  lathe,
  plan,
  rotor,
  side,
  type Part,
  type Vec2,
} from './parts';

/** Planta de casco con proa afilada y popa recta. */
function hullPlan(L: number, W: number, bow: number): Vec2[] {
  return [
    [L / 2, 0],
    [L / 2 - bow * 0.45, W * 0.38],
    [L / 2 - bow, W / 2],
    [-L / 2, W / 2],
    [-L / 2, -W / 2],
    [L / 2 - bow, -W / 2],
    [L / 2 - bow * 0.45, -W * 0.38],
  ];
}

/** Casco de dos capas: obra muerta (sobre el agua) y obra viva más estrecha. */
function hull(
  L: number,
  W: number,
  free: number,
  draft: number,
  color: string,
  below: string,
): Part[] {
  const bow = L * 0.3;
  return [
    plan(hullPlan(L, W, bow), free, color, [0, free / 2, 0]),
    plan(hullPlan(L * 0.97, W * 0.78, bow * 0.95), draft, below, [-L * 0.01, -draft / 2, 0]),
    // Franja de flotación.
    plan(hullPlan(L * 0.995, W * 0.99, bow), free * 0.08, DARK, [0, free * 0.04, 0]),
  ];
}

/** Ametralladora naval sobre pedestal. */
function navalGun(x: number, y: number, z: number, s: number): Part[] {
  return [
    cyl('y', 0.06 * s, 0.6 * s, [x, y + 0.3 * s, z], DARK),
    box([0.7 * s, 0.15 * s, 0.14 * s], [x + 0.1 * s, y + 0.65 * s, z], DARK),
    cyl('x', 0.03 * s, 0.8 * s, [x + 0.8 * s, y + 0.67 * s, z], DARK),
    box([0.04 * s, 0.45 * s, 0.6 * s], [x + 0.35 * s, y + 0.7 * s, z], STEEL),
  ];
}

/** Lancha: patrullera con cabina o bote de asalto con flotadores. */
export function boatParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  const k = L / 11;
  const parts: Part[] = [];
  if (m.variant === 'rigida') {
    // Bote semirrígido: piso, flotadores laterales y consola central.
    parts.push(...hull(L * 0.95, W * 0.7, 0.5 * k, 0.35 * k, m.accent, m.accent));
    for (const s of [1, -1])
      parts.push(
        lathe(
          [
            [-L * 0.47, 0],
            [-L * 0.47, 0.3 * k],
            [L * 0.25, 0.3 * k],
            [L * 0.42, 0.22 * k],
            [L * 0.48, 0],
          ],
          [0, 0.55 * k, s * W * 0.36],
          m.color,
        ),
      );
    parts.push(
      box([0.8 * k, 0.9 * k, 0.9 * k], [L * 0.05, 0.85 * k, 0], m.color),
      box([0.05 * k, 0.4 * k, 0.8 * k], [L * 0.05 + 0.42 * k, 1.4 * k, 0], GLASS, [0, 0, 0.4]),
    );
  } else {
    // Patrullera: casco, borda, cabina con puente y mástil.
    parts.push(...hull(L, W, 1.0 * k, 0.6 * k, m.color, m.accent));
    parts.push(
      box([L * 0.4, 0.06 * k, W * 0.9], [-L * 0.25, 1.03 * k, 0], '#4a5058'),
      ...cabin(-L * 0.12, L * 0.18, 1.0 * k, 2.6 * k, 0.6 * k, W * 0.7, m.color),
      box([L * 0.32, 0.08 * k, W * 0.74], [L * 0.02, 2.62 * k, 0], m.color),
      cyl('y', 0.06 * k, 1.8 * k, [L * 0.0, 3.5 * k, 0], LIGHT_METAL),
      box([0.08 * k, 0.08 * k, 1.4 * k], [L * 0.0, 4.0 * k, 0], LIGHT_METAL),
      ell([0.5 * k, 0.12 * k, 0.5 * k], [L * 0.0, 4.45 * k, 0], '#e3e6ea'),
    );
  }
  // Motores fuera de borda.
  const n = m.engines;
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * W * 0.28;
    parts.push(
      box([0.5 * k, 0.9 * k, 0.35 * k], [-L / 2 - 0.15 * k, 0.75 * k, z], DARK),
      box([0.15 * k, 0.9 * k, 0.12 * k], [-L / 2 - 0.2 * k, 0.0, z], DARK),
    );
  }
  if (m.payload === 'ametralladora') {
    parts.push(...navalGun(L * 0.32, m.variant === 'rigida' ? 0.6 * k : 1.0 * k, 0, k));
    if (m.variant !== 'rigida') parts.push(...navalGun(-L * 0.38, 1.0 * k, 0, k));
  }
  return parts;
}

/** Buque de superficie: de combate (fragata o corbeta) o anfibio de desembarco. */
export function shipParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  const k = L / 110;
  const free = 7 * k;
  const deck = '#4a5058';
  const parts: Part[] = [...hull(L, W, free, 4.5 * k, m.color, m.accent)];

  if (m.variant === 'desembarco') {
    // Cubierta corrida, isla a estribor y rampa de popa.
    parts.push(
      box([L * 0.92, 0.3 * k, W * 0.98], [-L * 0.03, free + 0.15 * k, 0], deck),
      side(
        [
          [-L * 0.05, 0],
          [L * 0.12, 0],
          [L * 0.1, 14 * k],
          [-L * 0.04, 14 * k],
        ],
        W * 0.22,
        m.color,
        [0, free, W * 0.36],
      ),
      box([L * 0.13, 1.6 * k, W * 0.23], [L * 0.04, free + 12.5 * k, W * 0.36], GLASS),
      cyl('y', 0.4 * k, 9 * k, [L * 0.03, free + 18 * k, W * 0.36], LIGHT_METAL),
      ell([3 * k, 3 * k, 3 * k], [L * 0.03, free + 22.5 * k, W * 0.36], '#e3e6ea'),
      box([2 * k, free * 0.9, W * 0.5], [-L / 2 - 0.5 * k, free * 0.45, 0], DARK),
    );
    // Marcas de helipuertos.
    for (const x of [-0.32, -0.1, 0.25])
      parts.push(box([6 * k, 0.05 * k, 6 * k], [x * L, free + 0.32 * k, -W * 0.08], '#d8d8d0'));
    // Vehículos anfibios en cubierta.
    for (const x of [0.32, 0.38])
      parts.push(box([4 * k, 2 * k, 3 * k], [x * L, free + 1.3 * k, -W * 0.15], '#5d6b4a'));
    return parts;
  }

  // Combate: superestructura escalonada con puente, chimenea, mástil y cañón de proa.
  const sx = -L * 0.05;
  parts.push(
    box([L * 0.9, 0.2 * k, W * 0.96], [-L * 0.04, free + 0.1 * k, 0], deck),
    side(
      [
        [sx - L * 0.2, 0],
        [sx + L * 0.12, 0],
        [sx + L * 0.1, 6 * k],
        [sx - L * 0.2, 6 * k],
      ],
      W * 0.72,
      m.color,
      [0, free, 0],
    ),
    side(
      [
        [sx + L * 0.02, 0],
        [sx + L * 0.1, 0],
        [sx + L * 0.085, 4 * k],
        [sx + L * 0.01, 4 * k],
      ],
      W * 0.6,
      m.color,
      [0, free + 6 * k, 0],
    ),
    box([L * 0.07, 1.4 * k, W * 0.62], [sx + L * 0.058, free + 8.6 * k, 0], GLASS),
    // Mástil con radar giratorio.
    cyl('y', 0.5 * k, 12 * k, [sx + L * 0.03, free + 16 * k, 0], LIGHT_METAL, { r2: 0.9 * k }),
    box([0.5 * k, 0.5 * k, W * 0.5], [sx + L * 0.03, free + 18 * k, 0], LIGHT_METAL),
    rotor('y', 2.4 * k, 2, [sx + L * 0.03, free + 22.5 * k, 0], LIGHT_METAL),
    // Chimenea inclinada.
    side(
      [
        [sx - L * 0.12, 0],
        [sx - L * 0.04, 0],
        [sx - L * 0.06, 6 * k],
        [sx - L * 0.13, 6 * k],
      ],
      W * 0.3,
      m.accent,
      [0, free + 6 * k, 0],
    ),
    box([L * 0.07, 0.5 * k, W * 0.25], [sx - L * 0.095, free + 12.2 * k, 0], DARK),
    // Cañón de proa.
    plan(
      [
        [3 * k, 0],
        [1 * k, 2 * k],
        [-2.2 * k, 2 * k],
        [-2.2 * k, -2 * k],
        [1 * k, -2 * k],
      ],
      2 * k,
      m.color,
      [L * 0.3, free + 1.2 * k, 0],
    ),
    cyl('x', 0.22 * k, 7 * k, [L * 0.3 + 5.5 * k, free + 1.5 * k, 0], m.color, { r2: 0.3 * k }),
    // Botes salvavidas.
    ...[1, -1].map((s) =>
      lathe(
        [
          [-2.5 * k, 0],
          [-2.2 * k, 0.8 * k],
          [2.2 * k, 0.8 * k],
          [2.5 * k, 0],
        ],
        [sx - L * 0.08, free + 4.5 * k, s * W * 0.4],
        '#e07a2e',
      ),
    ),
  );
  if (m.payload === 'misiles' || m.payload === 'helipuerto') {
    // Celdas de lanzamiento vertical delante del puente y lanzadores inclinados a media eslora.
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 4; j++)
        parts.push(
          box(
            [1.4 * k, 0.3 * k, 1.4 * k],
            [L * 0.16 + i * 1.6 * k, free + 0.35 * k, (j - 1.5) * 1.6 * k],
            DARK,
          ),
        );
    for (const s of [1, -1])
      parts.push(
        box(
          [5 * k, 1.2 * k, 2.5 * k],
          [-L * 0.2, free + 1.4 * k, s * W * 0.18],
          LIGHT_METAL,
          [0, 0, 0.3],
        ),
      );
  }
  if (m.payload === 'helipuerto') {
    parts.push(
      box([L * 0.12, 6 * k, W * 0.7], [-L * 0.3, free + 3 * k, 0], m.color),
      box([L * 0.15, 0.08 * k, W * 0.9], [-L * 0.43, free + 0.25 * k, 0], '#3a3f45'),
      box([5 * k, 0.1 * k, 0.6 * k], [-L * 0.43, free + 0.3 * k, 0], '#e8e4cf'),
      box([0.6 * k, 0.1 * k, 4 * k], [-L * 0.43 - 2.2 * k, free + 0.3 * k, 0], '#e8e4cf'),
      box([0.6 * k, 0.1 * k, 4 * k], [-L * 0.43 + 2.2 * k, free + 0.3 * k, 0], '#e8e4cf'),
    );
  } else {
    // Cañón de popa y torpedos.
    parts.push(
      cyl('y', 1.6 * k, 1.5 * k, [-L * 0.38, free + 0.9 * k, 0], m.color),
      cyl('x', 0.15 * k, 4 * k, [-L * 0.38 - 2.5 * k, free + 1.2 * k, 0], DARK),
    );
  }
  parts.push(...navalGun(sx - L * 0.02, free + 6 * k, W * 0.33, 1.6 * k));
  return parts;
}

/** Submarino en superficie: casco de revolución, vela, timones y hélice. */
export function submarineParts(m: Model3D): Part[] {
  const L = m.length;
  const r = m.span / 2;
  return [
    lathe(
      [
        [-L / 2, 0],
        [-L / 2, r * 0.12],
        [-L * 0.32, r * 0.75],
        [-L * 0.18, r],
        [L * 0.36, r],
        [L * 0.45, r * 0.78],
        [L * 0.49, r * 0.35],
        [L / 2, 0],
      ],
      [0, 0, 0],
      m.color,
    ),
    // Vela con timones de vela.
    side(
      [
        [L * 0.06, 0],
        [L * 0.2, 0],
        [L * 0.19, r * 1.6],
        [L * 0.09, r * 1.6],
        [L * 0.06, r * 1.2],
      ],
      r * 0.55,
      m.color,
      [0, r * 0.8, 0],
    ),
    box([L * 0.05, r * 0.08, r * 2.4], [L * 0.15, r * 1.9, 0], m.color),
    cyl('y', r * 0.05, r * 0.6, [L * 0.12, r * 2.65, 0], DARK),
    cyl('y', r * 0.05, r * 0.4, [L * 0.16, r * 2.55, 0], DARK),
    // Timones de cola en cruz.
    box([L * 0.06, r * 0.08, r * 2.6], [-L * 0.44, 0, 0], m.color),
    box([L * 0.06, r * 2.6, r * 0.08], [-L * 0.44, 0, 0], m.color),
    rotor('x', r * 0.55, 7, [-L * 0.505, 0, 0], STEEL),
    // Línea de cubierta.
    box([L * 0.5, r * 0.05, r * 0.6], [L * 0.05, r * 0.98, 0], DARK),
  ];
}
