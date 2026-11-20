/** Piezas de aeronaves: aviones de hélice, cazas a reacción, helicópteros y drones. */
import type { Model3D } from '../models3d';
import {
  DARK,
  GLASS,
  LIGHT_METAL,
  PROP,
  box,
  cyl,
  ell,
  fin,
  lathe,
  nacelle,
  rotor,
  side,
  wing,
  type Part,
} from './parts';

/** Misil o cohete: cuerpo, ojiva y aletas. */
function missile(x: number, y: number, z: number, len: number, r: number): Part[] {
  return [
    lathe(
      [
        [-len / 2, 0],
        [-len / 2, r],
        [len * 0.32, r],
        [len / 2, 0],
      ],
      [x, y, z],
      '#d6d8d4',
    ),
    box([len * 0.12, r * 4, r * 0.3], [x - len * 0.42, y, z], '#d6d8d4'),
    box([len * 0.12, r * 0.3, r * 4], [x - len * 0.42, y, z], '#d6d8d4'),
  ];
}

/** Avión de hélice o dron de ala fija. */
export function planeParts(m: Model3D, drone: boolean): Part[] {
  const L = m.length;
  const S = m.span;
  const r = L * (drone ? 0.05 : 0.065);
  const parts: Part[] = [];

  // Fuselaje de revolución: nariz redondeada y cono de cola afinado. El dron lleva la «joroba»
  // de la antena satelital delante.
  parts.push(
    lathe(
      drone
        ? [
            [-0.5 * L, 0],
            [-0.5 * L, r * 0.3],
            [-0.3 * L, r * 0.7],
            [0.05 * L, r],
            [0.3 * L, r * 1.25],
            [0.44 * L, r * 1.05],
            [0.5 * L, 0],
          ]
        : [
            [-0.5 * L, 0],
            [-0.5 * L, r * 0.22],
            [-0.36 * L, r * 0.62],
            [-0.2 * L, r],
            [0.3 * L, r],
            [0.4 * L, r * 0.86],
            [0.47 * L, r * 0.5],
            [0.5 * L, 0],
          ],
      [0, 0, 0],
      m.color,
      drone ? 0.95 : 1.05,
    ),
  );
  if (!drone) {
    // Parabrisas y franja de ventanillas.
    parts.push(ell([L * 0.11, r * 0.9, r * 1.55], [0.4 * L, r * 0.42, 0], GLASS));
    if (L > 14) parts.push(box([L * 0.4, r * 0.18, r * 2.06], [0.05 * L, r * 0.35, 0], GLASS));
  }

  // Alas trapezoidales con algo de flecha.
  const chord = Math.max(L * 0.15, S * 0.075);
  const thick = Math.max(r * 0.24, 0.025);
  const wingY = m.highWing ? r * 0.82 : -r * 0.5;
  parts.push(wing(0.04 * L, wingY, chord, chord * 0.5, S, chord * 0.22, thick, m.color));
  if (m.highWing && !drone)
    parts.push(box([chord * 0.9, r * 0.5, r * 1.2], [0.04 * L, r * 0.75, 0], m.color));

  // Empenaje.
  const tx = -0.42 * L;
  const finH = L * (drone ? 0.13 : 0.17);
  const finC = L * 0.15;
  if (m.tail === 'en-v') {
    for (const s of [1, -1])
      parts.push(
        fin(tx, r * 0.35, 0, finC, finC * 0.55, finH, finC * 0.45, thick, m.color, s * 0.7),
      );
  } else {
    parts.push(fin(tx, r * 0.5, 0, finC, finC * 0.5, finH, finC * 0.5, thick, m.color));
    const stabY = m.tail === 'en-t' ? r * 0.5 + finH : r * 0.25;
    const stabX = m.tail === 'en-t' ? tx - finC * 0.35 : tx - L * 0.02;
    parts.push(wing(stabX, stabY, L * 0.1, L * 0.055, S * 0.36, L * 0.03, thick * 0.8, m.color));
  }

  // Motores y hélices.
  const n = m.engines;
  const propR = drone ? Math.max(S * 0.07, L * 0.08) : Math.max(L * 0.085, S * 0.065);
  if (drone) {
    if (n === 1) parts.push(rotor('x', propR, m.blades, [-0.52 * L, 0, 0]));
    else
      for (const s of [1, -1]) {
        parts.push(nacelle(0.06 * L, wingY, s * S * 0.22, L * 0.2, r * 0.6, m.accent));
        parts.push(rotor('x', propR, m.blades, [-0.05 * L, wingY, s * S * 0.22]));
      }
  } else if (n === 1) {
    parts.push(ell([L * 0.05, r * 0.6, r * 0.6], [0.5 * L, 0, 0], m.accent));
    parts.push(rotor('x', propR, m.blades, [0.52 * L, 0, 0]));
  } else {
    const zs = n === 2 ? [0.2] : n === 3 ? [0, 0.28] : [0.17, 0.33];
    const offsets = zs.flatMap((z) => (z === 0 ? [0] : [z, -z]));
    for (const z of offsets) {
      if (z === 0) {
        parts.push(rotor('x', propR, m.blades, [0.52 * L, 0, 0]));
        continue;
      }
      const ny = wingY - r * (m.highWing ? 0.35 : -0.15);
      const nx = 0.04 * L + chord * 0.15 - Math.abs(z) * chord * 0.3;
      parts.push(nacelle(nx, ny, z * S, chord * 1.35, r * 0.48, m.accent));
      parts.push(ell([r * 0.5, r * 0.4, r * 0.4], [nx + chord * 0.7, ny, z * S], m.accent));
      parts.push(rotor('x', propR * 0.9, m.blades, [nx + chord * 0.72, ny, z * S]));
    }
  }

  // Carga.
  if (m.payload === 'camara') {
    parts.push(cyl('y', r * 0.3, r * 0.4, [0.28 * L, -r * 0.95, 0], m.accent));
    parts.push(ell([r * 1.2, r * 1.2, r * 1.2], [0.28 * L, -r * 1.4, 0], m.accent));
    parts.push(ell([r * 0.5, r * 0.5, r * 0.3], [0.28 * L + r * 0.4, -r * 1.4, 0], GLASS));
  }
  if (m.payload === 'misiles')
    for (const s of [1, -1])
      for (const z of [0.24, 0.36]) {
        const my = wingY - thick - r * 0.32;
        parts.push(
          box(
            [chord * 0.5, r * 0.25, thick],
            [0.04 * L, wingY - thick - r * 0.1, s * z * S],
            m.color,
          ),
        );
        parts.push(...missile(0.05 * L, my, s * z * S, chord * 1.2, Math.max(r * 0.16, 0.03)));
      }
  if (m.payload === 'carga')
    parts.push(
      lathe(
        [
          [-L * 0.13, 0],
          [-L * 0.12, r * 0.4],
          [L * 0.1, r * 0.4],
          [L * 0.13, 0],
        ],
        [0, -r * 1.1, 0],
        m.accent,
      ),
    );
  return parts;
}

/** Caza a reacción: ala en flecha, toma de aire lateral y tobera. */
export function jetParts(m: Model3D): Part[] {
  const L = m.length;
  const S = m.span;
  const r = L * 0.05;
  const twin = m.engines >= 2;
  const parts: Part[] = [
    lathe(
      [
        [-0.5 * L, 0],
        [-0.5 * L, r * (twin ? 1.1 : 0.8)],
        [-0.38 * L, r * (twin ? 1.25 : 0.95)],
        [-0.05 * L, r * 1.1],
        [0.18 * L, r],
        [0.32 * L, r * 0.75],
        [0.44 * L, r * 0.35],
        [0.5 * L, 0],
      ],
      [0, 0, 0],
      m.color,
      0.9,
    ),
    // Cabina burbuja.
    ell([L * 0.17, r * 1.05, r * 1.05], [0.25 * L, r * 0.72, 0], GLASS),
    // Lomo detrás de la cabina.
    side(
      [
        [0.17 * L, r * 0.3],
        [0.2 * L, r * 0.85],
        [-0.25 * L, r * 0.75],
        [-0.3 * L, r * 0.3],
      ],
      r * 1.1,
      m.color,
    ),
    // Ala en flecha y estabilizadores.
    wing(-0.08 * L, -r * 0.15, L * 0.36, L * 0.06, S, L * 0.25, Math.max(r * 0.2, 0.04), m.color),
    wing(
      -0.43 * L,
      -r * 0.05,
      L * 0.12,
      L * 0.05,
      S * 0.45,
      L * 0.07,
      Math.max(r * 0.15, 0.03),
      m.color,
    ),
  ];
  // Tomas de aire.
  for (const s of [1, -1])
    parts.push(
      side(
        [
          [0.1 * L, -r * 0.55],
          [0.1 * L, r * 0.45],
          [-0.2 * L, r * 0.35],
          [-0.2 * L, -r * 0.55],
        ],
        r * 0.55,
        m.color,
        [0, 0, s * r * 1.05],
      ),
      box([L * 0.01, r * 0.9, r * 0.45], [0.105 * L, -r * 0.05, s * r * 1.05], DARK),
    );
  // Derivas: una vertical o dos inclinadas.
  const finH = L * 0.17;
  if (m.tail === 'en-v')
    for (const s of [1, -1])
      parts.push(
        fin(
          -0.38 * L,
          r * 0.6,
          s * r * 0.7,
          L * 0.15,
          L * 0.06,
          finH,
          L * 0.08,
          Math.max(r * 0.12, 0.03),
          m.color,
          s * 0.3,
        ),
      );
  else
    parts.push(
      fin(
        -0.38 * L,
        r * 0.7,
        0,
        L * 0.18,
        L * 0.06,
        finH,
        L * 0.1,
        Math.max(r * 0.14, 0.03),
        m.color,
      ),
    );
  // Toberas.
  const zs = twin ? [r * 0.55, -r * 0.55] : [0];
  for (const z of zs)
    parts.push(
      cyl('x', r * (twin ? 0.5 : 0.7), L * 0.05, [-0.51 * L, 0, z], DARK, {
        r2: r * (twin ? 0.42 : 0.6),
      }),
    );
  if (m.payload === 'misiles') {
    for (const s of [1, -1]) {
      parts.push(...missile(-0.12 * L, -r * 0.15, s * S * 0.5, L * 0.18, r * 0.12));
      for (const z of [0.2, 0.32]) {
        parts.push(box([L * 0.08, r * 0.3, r * 0.08], [-0.06 * L, -r * 0.45, s * z * S], m.color));
        parts.push(...missile(-0.04 * L, -r * 0.75, s * z * S, L * 0.2, r * 0.13));
      }
    }
  }
  if (m.payload === 'carga')
    for (const s of [1, -1])
      parts.push(
        lathe(
          [
            [-L * 0.12, 0],
            [-L * 0.1, r * 0.35],
            [L * 0.08, r * 0.35],
            [L * 0.12, 0],
          ],
          [-0.05 * L, -r * 0.8, s * S * 0.22],
          m.accent,
        ),
      );
  return parts;
}

/** Helicóptero utilitario (cabina amplia y patines) o de ataque (cabina en tándem). */
export function helicopterParts(m: Model3D): Part[] {
  const L = m.length;
  const R = m.span / 2;
  const attack = m.variant === 'ataque';
  const W = attack ? L * 0.09 : L * 0.16;
  const H = L * 0.1;
  const parts: Part[] = [];

  if (attack) {
    // Fuselaje estrecho con cabinas escalonadas.
    parts.push(
      side(
        [
          [-0.14 * L, -H],
          [0.3 * L, -H * 0.85],
          [0.42 * L, -H * 0.35],
          [0.43 * L, H * 0.1],
          [0.36 * L, H * 0.35],
          [-0.14 * L, H * 0.75],
        ],
        W,
        m.color,
      ),
      ell([L * 0.13, H * 0.8, W * 1.05], [0.31 * L, H * 0.4, 0], GLASS),
      ell([L * 0.13, H * 0.85, W * 1.05], [0.16 * L, H * 0.75, 0], GLASS),
      // Cañón bajo la nariz.
      ell([L * 0.04, L * 0.04, L * 0.04], [0.36 * L, -H * 1.05, 0], DARK),
      cyl('x', L * 0.006, L * 0.08, [0.4 * L, -H * 1.1, 0], DARK),
      // Alas cortas para armamento.
      box([L * 0.08, L * 0.008, L * 0.3], [0.04 * L, -H * 0.35, 0], m.color),
      // Rueda de cola y tren.
      ...[1, -1].map((s) =>
        cyl('z', L * 0.022, L * 0.012, [0.22 * L, -H * 1.3, s * W * 0.9], DARK),
      ),
    );
  } else {
    parts.push(
      side(
        [
          [-0.16 * L, -H],
          [0.27 * L, -H],
          [0.36 * L, -H * 0.4],
          [0.34 * L, H * 0.35],
          [0.22 * L, H],
          [-0.16 * L, H],
        ],
        W,
        m.color,
      ),
      // Parabrisas y ventanas laterales.
      side(
        [
          [0.2 * L, H * 1.04],
          [0.226 * L, H * 1.04],
          [0.352 * L, H * 0.35],
          [0.37 * L, -H * 0.38],
          [0.3 * L, -H * 0.38],
          [0.2 * L, H * 0.45],
        ],
        W * 1.02,
        GLASS,
      ),
      // Puerta de carga.
      box([L * 0.14, H * 1.1, W * 1.01], [0.05 * L, -H * 0.1, 0], m.accent, undefined),
      box([L * 0.12, H * 0.45, W * 1.02], [0.05 * L, H * 0.25, 0], GLASS),
    );
  }

  // Botalón de cola, deriva, estabilizador y rotor de cola.
  parts.push(
    lathe(
      [
        [-0.58 * L, 0],
        [-0.58 * L, L * 0.018],
        [-0.3 * L, L * 0.03],
        [-0.12 * L, H * 0.75],
        [-0.1 * L, 0],
      ],
      [0, H * 0.2, 0],
      m.color,
    ),
    fin(-0.56 * L, H * 0.2, 0, L * 0.09, L * 0.05, L * 0.12, L * 0.05, L * 0.012, m.color),
    box([L * 0.05, L * 0.01, L * 0.13], [-0.5 * L, H * 0.25, 0], m.color),
    rotor('z', Math.max(R * 0.18, L * 0.065), attack ? 4 : 2, [
      -0.57 * L,
      H * 0.2 + L * 0.09,
      L * 0.025,
    ]),
  );

  // Carenado de turbinas, mástil y rotor principal.
  parts.push(
    side(
      [
        [-0.12 * L, 0],
        [0.18 * L, 0],
        [0.13 * L, H * 0.6],
        [-0.08 * L, H * 0.6],
      ],
      W * (attack ? 1.4 : 0.7),
      m.color,
      [0, attack ? H * 0.7 : H, 0],
    ),
    cyl('y', L * 0.014, L * 0.06, [0.08 * L, H * (attack ? 1.5 : 1.8), 0], DARK),
    rotor('y', R, m.blades, [0.08 * L, H * (attack ? 1.75 : 2.05), 0]),
  );
  for (let i = 0; i < m.engines; i++) {
    const z = m.engines === 1 ? 0 : (i ? -1 : 1) * W * (attack ? 0.75 : 0.32);
    parts.push(
      cyl('x', L * 0.028, L * 0.04, [-0.13 * L, (attack ? H * 0.7 : H) + H * 0.3, z], DARK),
    );
  }

  // Patines (utilitario).
  if (!attack)
    for (const s of [1, -1]) {
      parts.push(cyl('x', L * 0.008, L * 0.42, [0.09 * L, -H * 1.55, s * W * 0.62], m.accent));
      for (const x of [-0.02, 0.2])
        parts.push(
          box([L * 0.012, H * 0.6, L * 0.012], [x * L, -H * 1.25, s * W * 0.58], m.accent, [
            s * 0.25,
            0,
            0,
          ]),
        );
    }

  if (m.payload === 'camara') {
    parts.push(ell([L * 0.05, L * 0.05, L * 0.05], [0.31 * L, -H * 1.2, 0], m.accent));
    parts.push(ell([L * 0.02, L * 0.02, L * 0.015], [0.33 * L, -H * 1.2, 0], GLASS));
  }
  if (m.payload === 'misiles')
    for (const s of [1, -1]) {
      if (!attack)
        parts.push(
          box(
            [L * 0.06, L * 0.01, L * 0.16],
            [0.05 * L, -H * 0.3, s * (W / 2 + L * 0.08)],
            m.color,
          ),
        );
      const z = s * (attack ? L * 0.12 : W / 2 + L * 0.13);
      parts.push(
        lathe(
          [
            [-L * 0.07, 0],
            [-L * 0.07, L * 0.025],
            [L * 0.05, L * 0.025],
            [L * 0.07, L * 0.012],
            [L * 0.07, 0],
          ],
          [0.05 * L, -H * 0.6, z],
          LIGHT_METAL,
        ),
      );
      if (attack) parts.push(...missile(0.05 * L, -H * 0.6, s * L * 0.065, L * 0.12, L * 0.008));
    }
  if (m.payload === 'carga') {
    parts.push(cyl('y', L * 0.002, H * 1.4, [0.06 * L, -H * 1.9, 0], DARK));
    parts.push(box([L * 0.12, L * 0.08, L * 0.1], [0.06 * L, -H * 3, 0], m.accent));
  }
  return parts;
}

/** Dron multirrotor: cuerpo central, brazos con motor y hélices. */
export function multirotorParts(m: Model3D): Part[] {
  const L = m.length;
  const n = m.engines;
  const armLen = L * 0.48;
  const propR = Math.min(L * 0.19, (Math.PI * armLen) / n) * 0.95;
  const parts: Part[] = [
    lathe(
      [
        [-L * 0.16, 0],
        [-L * 0.16, L * 0.05],
        [-L * 0.08, L * 0.1],
        [L * 0.1, L * 0.1],
        [L * 0.17, L * 0.05],
        [L * 0.17, 0],
      ],
      [0, 0, 0],
      m.color,
      0.55,
    ),
    ell([L * 0.12, L * 0.05, L * 0.1], [0.02 * L, L * 0.05, 0], m.accent),
    box([L * 0.06, L * 0.012, L * 0.03], [-0.1 * L, L * 0.055, 0], DARK),
  ];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n + Math.PI / n;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    parts.push(
      box([armLen, L * 0.03, L * 0.035], [(cx * armLen) / 2, 0, (cz * armLen) / 2], m.color, [
        0,
        -a,
        0,
      ]),
      cyl('y', L * 0.035, L * 0.06, [cx * armLen, L * 0.03, cz * armLen], m.accent),
      cyl('y', L * 0.012, L * 0.03, [cx * armLen, L * 0.07, cz * armLen], DARK),
      rotor('y', propR, m.blades, [cx * armLen, L * 0.08, cz * armLen], PROP),
      // Luz de navegación: verde a la derecha, roja a la izquierda.
      ell(
        [L * 0.02, L * 0.02, L * 0.02],
        [cx * armLen, -L * 0.02, cz * armLen],
        cz > 0 ? '#3fd06a' : '#e5484d',
      ),
    );
  }
  for (const s of [1, -1]) {
    parts.push(cyl('x', L * 0.008, L * 0.32, [0, -L * 0.14, s * L * 0.11], m.accent));
    for (const x of [-0.08, 0.08])
      parts.push(
        box([L * 0.01, L * 0.12, L * 0.01], [x * L, -L * 0.08, s * L * 0.09], m.accent, [
          s * 0.3,
          0,
          0,
        ]),
      );
  }
  if (m.payload === 'camara') {
    parts.push(box([L * 0.04, L * 0.04, L * 0.04], [0.1 * L, -L * 0.06, 0], DARK));
    parts.push(ell([L * 0.08, L * 0.08, L * 0.08], [0.1 * L, -L * 0.1, 0], m.accent));
    parts.push(ell([L * 0.03, L * 0.03, L * 0.02], [0.13 * L, -L * 0.1, 0], GLASS));
  }
  if (m.payload === 'carga')
    parts.push(box([L * 0.16, L * 0.08, L * 0.12], [0, -L * 0.1, 0], m.accent));
  if (m.payload === 'misiles')
    for (const s of [1, -1])
      parts.push(...missile(0, -L * 0.08, s * L * 0.07, L * 0.22, L * 0.018));
  return parts;
}
