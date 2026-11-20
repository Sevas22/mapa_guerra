/**
 * Piezas de vehículos terrestres. El suelo está en y = 0 y las ruedas u orugas lo tocan.
 * Las alturas escalan con el largo (`k`), el ancho con la medida «ancho».
 */
import type { Model3D } from '../models3d';
import {
  DARK,
  GLASS,
  LIGHT_METAL,
  STEEL,
  TIRE,
  axle,
  box,
  cabin,
  cyl,
  ell,
  lathe,
  plan,
  side,
  type Part,
} from './parts';

/** Ametralladora sobre montaje: base, cajón de munición y cañón. */
function machineGun(x: number, y: number, z: number, s: number, shield = false): Part[] {
  const parts: Part[] = [
    cyl('y', 0.05 * s, 0.35 * s, [x, y + 0.17 * s, z], DARK),
    box([0.7 * s, 0.14 * s, 0.13 * s], [x + 0.1 * s, y + 0.4 * s, z], DARK),
    cyl('x', 0.025 * s, 0.7 * s, [x + 0.75 * s, y + 0.42 * s, z], DARK),
    box([0.2 * s, 0.14 * s, 0.12 * s], [x, y + 0.36 * s, z + 0.14 * s], '#4a4f38'),
  ];
  if (shield) parts.push(box([0.04 * s, 0.5 * s, 0.7 * s], [x + 0.32 * s, y + 0.45 * s, z], STEEL));
  return parts;
}

/** Estación de armas a control remoto: caja con sensores y cañón corto. */
function weaponStation(x: number, y: number, s: number): Part[] {
  return [
    cyl('y', 0.3 * s, 0.12 * s, [x, y + 0.06 * s, 0], DARK),
    box([0.55 * s, 0.35 * s, 0.45 * s], [x, y + 0.3 * s, 0], STEEL),
    box([0.16 * s, 0.2 * s, 0.2 * s], [x + 0.1 * s, y + 0.55 * s, 0.18 * s], DARK),
    ell([0.08 * s, 0.08 * s, 0.05 * s], [x + 0.19 * s, y + 0.55 * s, 0.18 * s], GLASS),
    cyl('x', 0.035 * s, 0.9 * s, [x + 0.7 * s, y + 0.32 * s, 0], DARK),
  ];
}

/** Lanzador de misiles antitanque: tubo doble. */
function atgm(x: number, y: number, z: number, s: number): Part[] {
  return [
    box([0.12 * s, 0.4 * s, 0.12 * s], [x, y + 0.2 * s, z], DARK),
    cyl('x', 0.09 * s, 1.3 * s, [x + 0.1 * s, y + 0.48 * s, z - 0.1 * s], '#55603f'),
    cyl('x', 0.09 * s, 1.3 * s, [x + 0.1 * s, y + 0.48 * s, z + 0.1 * s], '#55603f'),
  ];
}

/**
 * Tren de rodaje de orugas: banda de perfil redondeado, ruedas de rodaje, rueda motriz y
 * faldón. `n` ruedas por lado.
 */
function tracks(
  L: number,
  W: number,
  k: number,
  n: number,
  accent: string,
  skirt?: string,
): Part[] {
  const tw = Math.min(0.62 * k, W * 0.22);
  const h = 1.0 * k;
  const r = 0.36 * k;
  const parts: Part[] = [];
  for (const s of [1, -1]) {
    const z = s * (W / 2 - tw / 2);
    parts.push(
      side(
        [
          [-L / 2, 0.55 * h],
          [-L / 2 + 0.35 * k, 0.05],
          [L / 2 - 0.45 * k, 0.05],
          [L / 2, 0.62 * h],
          [L / 2 - 0.2 * k, h * 0.88],
          [-L / 2 + 0.15 * k, h * 0.88],
        ],
        tw,
        TIRE,
        [0, 0, z],
      ),
    );
    const span = L - 1.1 * k;
    for (let i = 0; i < n; i++) {
      const x = -span / 2 + (span * i) / Math.max(1, n - 1);
      parts.push(cyl('z', r, 0.06, [x, r + 0.04, z + s * tw * 0.51], accent));
      parts.push(cyl('z', r * 0.3, 0.08, [x, r + 0.04, z + s * tw * 0.53], DARK));
    }
    parts.push(cyl('z', 0.3 * k, 0.06, [L / 2 - 0.3 * k, 0.62 * h, z + s * tw * 0.51], DARK));
    parts.push(cyl('z', 0.3 * k, 0.06, [-L / 2 + 0.25 * k, 0.55 * h, z + s * tw * 0.51], DARK));
    if (skirt)
      parts.push(box([L * 0.88, 0.32 * k, 0.05], [0.02 * L, h * 0.78, z + s * tw * 0.55], skirt));
  }
  return parts;
}

/** Carro de combate: casco de orugas, torreta en cuña y cañón largo. */
export function tankParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  const k = L / 9.5;
  const H = L * 0.8; // casco sin el cañón
  const n = Math.max(5, Math.min(7, m.engines));
  const hullTop = 1.75 * k;
  const parts: Part[] = [
    ...tracks(H, W, k, n, m.accent, m.color),
    // Casco: glacis inclinado delante, motor atrás.
    side(
      [
        [-H / 2, 0.55 * k],
        [H / 2 - 0.7 * k, 0.45 * k],
        [H / 2, 1.1 * k],
        [H / 2 - 1.7 * k, hullTop],
        [-H / 2, hullTop],
        [-H / 2 - 0.05 * k, 1.2 * k],
      ],
      W * 0.64,
      m.color,
    ),
    // Guardabarros sobre las orugas.
    box([H * 0.98, 0.06 * k, W], [0, 1.0 * k, 0], m.color),
    // Rejillas del motor y faros.
    box([1.6 * k, 0.04 * k, W * 0.5], [-H / 2 + 1.1 * k, hullTop + 0.02 * k, 0], DARK),
    box([0.1 * k, 0.12 * k, 0.2 * k], [H / 2 - 0.3 * k, 1.05 * k, W * 0.4], LIGHT_METAL),
    box([0.1 * k, 0.12 * k, 0.2 * k], [H / 2 - 0.3 * k, 1.05 * k, -W * 0.4], LIGHT_METAL),
  ];
  // Torreta.
  const T = L * 0.38;
  const tx = -0.02 * L;
  const ty = hullTop + 0.38 * k;
  parts.push(
    plan(
      [
        [T * 0.55, W * 0.17],
        [T * 0.55, -W * 0.17],
        [T * 0.15, -W * 0.31],
        [-T * 0.5, -W * 0.3],
        [-T * 0.55, -W * 0.2],
        [-T * 0.55, W * 0.2],
        [-T * 0.5, W * 0.3],
        [T * 0.15, W * 0.31],
      ],
      0.78 * k,
      m.color,
      [tx, ty, 0],
    ),
    // Cesta trasera de la torreta.
    box([0.5 * k, 0.4 * k, W * 0.5], [tx - T * 0.62, ty, 0], m.accent),
    // Manto, cañón con evacuador y freno de boca.
    box([0.35 * k, 0.45 * k, 0.6 * k], [tx + T * 0.58, ty, 0], m.color),
    cyl('x', 0.085 * k, L * 0.52, [tx + T * 0.55 + L * 0.26, ty, 0], m.color, { r2: 0.1 * k }),
    cyl('x', 0.14 * k, 0.6 * k, [tx + T * 0.55 + L * 0.2, ty, 0], m.color),
    cyl('x', 0.12 * k, 0.3 * k, [tx + T * 0.55 + L * 0.5, ty, 0], DARK),
    // Escotilla del jefe y periscopio.
    cyl('y', 0.32 * k, 0.22 * k, [tx - T * 0.15, ty + 0.5 * k, -W * 0.13], m.color),
    box([0.25 * k, 0.25 * k, 0.25 * k], [tx + T * 0.15, ty + 0.5 * k, W * 0.15], DARK),
    ell([0.12 * k, 0.12 * k, 0.12 * k], [tx + T * 0.23, ty + 0.55 * k, W * 0.15], GLASS),
    // Lanzagranadas de humo.
    ...[1, -1].map((s) =>
      box([0.25 * k, 0.2 * k, 0.35 * k], [tx + T * 0.25, ty + 0.2 * k, s * W * 0.33], DARK, [
        0,
        s * 0.4,
        0,
      ]),
    ),
  );
  if (m.payload === 'ametralladora')
    parts.push(...machineGun(tx - T * 0.15, ty + 0.6 * k, -W * 0.13, k));
  if (m.payload === 'misiles') parts.push(...atgm(tx - T * 0.1, ty + 0.38 * k, W * 0.36, k));
  return parts;
}

/** Blindado de transporte de tropas: de ruedas (4×4 a 8×8) o de orugas. */
export function apcParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  const k = L / 8;
  const tracked = m.variant === 'orugas';
  const top = 2.05 * k;
  const parts: Part[] = [];
  if (tracked) {
    parts.push(...tracks(L, W, k * 0.95, m.engines + 2, m.accent));
  } else {
    const n = m.engines;
    const r = 0.55 * k;
    const span = L * 0.62;
    for (let i = 0; i < n; i++) {
      const x = L * 0.31 - (span * i) / Math.max(1, n - 1) - (i >= n / 2 && n > 2 ? 0.25 * k : 0);
      parts.push(...axle(x, W - 0.45 * k, r, 0.45 * k, m.accent));
    }
  }
  // Casco en V con frente inclinado.
  parts.push(
    side(
      [
        [-L / 2, 0.6 * k],
        [L / 2 - 1.1 * k, 0.5 * k],
        [L / 2, 1.3 * k],
        [L / 2 - 1.5 * k, top],
        [-L / 2 + 0.1 * k, top],
        [-L / 2, top - 0.2 * k],
      ],
      W * (tracked ? 0.92 : 0.86),
      m.color,
    ),
    // Frente: rejilla y faros; atrás: rampa; costado: escotillas.
    box([0.06 * k, 0.4 * k, W * 0.5], [L / 2 - 0.4 * k, 1.12 * k, 0], DARK, [0, 0, -0.75]),
    box([0.08 * k, 1.2 * k, W * 0.5], [-L / 2 - 0.02, 1.25 * k, 0], m.accent),
    ...[1, -1].map((s) =>
      box([0.8 * k, 0.04 * k, 0.5 * k], [-L * 0.2, top + 0.02 * k, s * W * 0.2], m.accent),
    ),
    ...[1, -1].map((s) =>
      box(
        [0.5 * k, 0.15 * k, 0.04],
        [L * 0.28, 1.75 * k, s * W * (tracked ? 0.461 : 0.431)],
        GLASS,
      ),
    ),
  );
  const wx = L * 0.1;
  if (m.payload === 'ametralladora') parts.push(...weaponStation(wx, top, k));
  if (m.payload === 'canon' || m.payload === 'misiles') {
    parts.push(
      plan(
        [
          [0.9 * k, 0.45 * k],
          [0.9 * k, -0.45 * k],
          [0.3 * k, -0.75 * k],
          [-0.8 * k, -0.75 * k],
          [-0.8 * k, 0.75 * k],
          [0.3 * k, 0.75 * k],
        ],
        0.6 * k,
        m.color,
        [wx, top + 0.3 * k, 0],
      ),
      cyl('x', 0.06 * k, 2.4 * k, [wx + 2 * k, top + 0.32 * k, 0], DARK),
      cyl('x', 0.1 * k, 0.4 * k, [wx + 1.05 * k, top + 0.32 * k, 0], m.color),
      box([0.3 * k, 0.25 * k, 0.25 * k], [wx - 0.1 * k, top + 0.7 * k, -0.4 * k], DARK),
    );
    if (m.payload === 'misiles') parts.push(...atgm(wx - 0.3 * k, top + 0.45 * k, 0.9 * k, k));
  }
  return parts;
}

/** Camión militar: cabina, chasis y caja según la carga. */
export function truckParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  const k = L / 8;
  const r = 0.55 * k;
  const cabL = 1.9 * k;
  const xf = L / 2;
  const bedX0 = -L / 2;
  const bedX1 = xf - cabL - 0.25 * k;
  const bedY = 1.25 * k;
  const parts: Part[] = [
    // Chasis y defensa.
    box([L * 0.95, 0.28 * k, W * 0.7], [0, 0.9 * k, 0], DARK),
    box([0.15 * k, 0.3 * k, W * 0.98], [xf - 0.05 * k, 0.75 * k, 0], DARK),
    // Capó corto y cabina.
    side(
      [
        [xf - cabL, 1.0 * k],
        [xf, 1.0 * k],
        [xf, 1.75 * k],
        [xf - 0.5 * k, 1.9 * k],
        [xf - cabL, 1.9 * k],
      ],
      W * 0.96,
      m.color,
    ),
    ...cabin(xf - cabL, xf - 0.5 * k, 1.9 * k, 2.85 * k, 0.35 * k, W * 0.92, m.color),
    box([0.04 * k, 0.25 * k, W * 0.6], [xf + 0.01, 1.4 * k, 0], DARK),
    ...[1, -1].map((s) =>
      box([0.06 * k, 0.12 * k, 0.25 * k], [xf + 0.01, 1.2 * k, s * W * 0.38], '#f2eecf'),
    ),
    ...[1, -1].map((s) =>
      box([0.05 * k, 0.3 * k, 0.15 * k], [xf - 0.45 * k, 2.35 * k, s * (W * 0.5 + 0.08 * k)], DARK),
    ),
    // Tanque de combustible lateral.
    cyl('x', 0.25 * k, 0.9 * k, [xf - cabL - 0.6 * k, 0.8 * k, W * 0.4], STEEL),
  ];
  // Ruedas: eje delantero y traseros.
  parts.push(...axle(xf - 1.15 * k, W * 0.88, r, 0.38 * k, m.accent));
  const rear = Math.max(1, m.engines - 1);
  for (let i = 0; i < rear; i++)
    parts.push(...axle(bedX0 + 1.3 * k + i * 1.25 * k, W * 0.88, r, 0.38 * k, m.accent));
  if (m.engines >= 4) parts.push(...axle(xf - 2.4 * k, W * 0.88, r, 0.38 * k, m.accent));

  const bedL = bedX1 - bedX0;
  const bedC = (bedX0 + bedX1) / 2;
  const floor = box([bedL, 0.12 * k, W], [bedC, bedY, 0], m.color);
  switch (m.payload) {
    case 'carga':
      parts.push(
        floor,
        ...[1, -1].map((s) =>
          box([bedL, 0.55 * k, 0.06], [bedC, bedY + 0.3 * k, (s * W) / 2], m.color),
        ),
        box([0.06, 0.55 * k, W], [bedX0, bedY + 0.3 * k, 0], m.color),
        box(
          [bedL * 0.35, 0.7 * k, W * 0.4],
          [bedC - bedL * 0.2, bedY + 0.4 * k, -W * 0.22],
          '#7a6a4a',
        ),
        box(
          [bedL * 0.3, 0.5 * k, W * 0.4],
          [bedC + bedL * 0.2, bedY + 0.3 * k, W * 0.2],
          '#6e7552',
        ),
        box(
          [bedL * 0.25, 0.4 * k, W * 0.38],
          [bedC - bedL * 0.2, bedY + 0.95 * k, -W * 0.22],
          '#6e7552',
        ),
      );
      break;
    case 'cisterna':
      parts.push(
        lathe(
          [
            [-bedL / 2, 0],
            [-bedL / 2, 0.7 * k],
            [-bedL / 2 + 0.2 * k, 0.85 * k],
            [bedL / 2 - 0.2 * k, 0.85 * k],
            [bedL / 2, 0.7 * k],
            [bedL / 2, 0],
          ],
          [bedC, bedY + 0.8 * k, 0],
          m.accent,
          0.85,
        ),
        box([bedL * 0.9, 0.1 * k, 0.4 * k], [bedC, bedY + 1.55 * k, 0], DARK),
      );
      break;
    case 'lanzacohetes': {
      parts.push(
        floor,
        box([0.8 * k, 0.5 * k, W * 0.5], [bedX1 - 0.6 * k, bedY + 0.3 * k, 0], DARK),
      );
      const podL = bedL * 0.85;
      const tilt = 0.32;
      parts.push(
        box([podL, 0.9 * k, W * 0.82], [bedC - 0.1 * k, bedY + 1.05 * k, 0], m.accent, [
          0,
          0,
          tilt,
        ]),
      );
      // Bocas de los tubos en la cara delantera del contenedor.
      const fx = bedC - 0.1 * k + (podL / 2) * Math.cos(tilt);
      const fy = bedY + 1.05 * k + (podL / 2) * Math.sin(tilt);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 4; j++)
          parts.push(
            cyl(
              'x',
              0.1 * k,
              0.06,
              [fx + 0.01, fy + (i - 1) * 0.26 * k, (j - 1.5) * W * 0.19],
              DARK,
              { rot: [0, 0, tilt] },
            ),
          );
      break;
    }
    case 'radar':
      parts.push(
        floor,
        box([bedL * 0.55, 1.4 * k, W * 0.95], [bedC - bedL * 0.2, bedY + 0.75 * k, 0], m.accent),
        cyl('y', 0.1 * k, 1.6 * k, [bedC + bedL * 0.25, bedY + 0.85 * k, 0], DARK),
        box(
          [0.12 * k, 1.1 * k, 2.4 * k],
          [bedC + bedL * 0.25, bedY + 2.2 * k, 0],
          LIGHT_METAL,
          [0, 0, -0.35],
        ),
        box(
          [0.05 * k, 0.9 * k, 2.2 * k],
          [bedC + bedL * 0.25 + 0.06 * k, bedY + 2.2 * k, 0],
          DARK,
          [0, 0, -0.35],
        ),
      );
      break;
    case 'contenedor':
      parts.push(floor, box([bedL, 1.75 * k, W], [bedC, bedY + 0.93 * k, 0], m.accent));
      break;
    default: {
      // Carpa de lona sobre arcos.
      const y0 = bedY;
      parts.push(
        floor,
        side(
          [
            [bedX0, y0],
            [bedX1, y0],
            [bedX1, y0 + 1.55 * k],
            [bedX1 - 0.2 * k, y0 + 1.8 * k],
            [bedX0 + 0.2 * k, y0 + 1.8 * k],
            [bedX0, y0 + 1.55 * k],
          ],
          W,
          m.accent,
        ),
        box([0.03, 0.9 * k, W * 0.8], [bedX0 - 0.01, y0 + 1.0 * k, 0], DARK),
      );
    }
  }
  return parts;
}

/** Camioneta tipo pick-up: cabina sencilla o doble y platón. */
export function pickupParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  const k = L / 5.3;
  const r = 0.38 * k;
  const xf = L / 2;
  const double = m.variant !== 'sencilla';
  const cabF = xf - 1.45 * k;
  const cabR = cabF - (double ? 2.0 * k : 1.35 * k);
  const parts: Part[] = [
    side(
      [
        [-L / 2, 0.5 * k],
        [xf - 0.1 * k, 0.5 * k],
        [xf, 0.75 * k],
        [xf - 0.05 * k, 1.05 * k],
        [cabF, 1.15 * k],
        [-L / 2, 1.15 * k],
      ],
      W,
      m.color,
    ),
    ...cabin(cabR, cabF, 1.15 * k, 1.85 * k, 0.6 * k, W * 0.92, m.color),
    // Rejilla, faros, defensa y espejos.
    box([0.04 * k, 0.25 * k, W * 0.6], [xf - 0.03 * k, 0.88 * k, 0], DARK),
    ...[1, -1].map((s) =>
      box([0.05 * k, 0.12 * k, 0.28 * k], [xf - 0.02 * k, 0.9 * k, s * W * 0.38], '#f2eecf'),
    ),
    box([0.12 * k, 0.18 * k, W * 1.02], [xf, 0.55 * k, 0], DARK),
    ...[1, -1].map((s) =>
      box(
        [0.08 * k, 0.12 * k, 0.1 * k],
        [cabF - 0.1 * k, 1.35 * k, s * (W * 0.5 + 0.06 * k)],
        DARK,
      ),
    ),
    // Platón: piso hundido y compuerta.
    box([cabR + L / 2 - 0.1 * k, 0.4 * k, W * 0.86], [(cabR - L / 2) / 2, 1.0 * k, 0], DARK),
    // Pasos de rueda.
    ...[1, -1].flatMap((s) => [
      box([0.95 * k, 0.12 * k, 0.1 * k], [xf - 0.95 * k, 1.0 * k, s * W * 0.5], DARK),
      box([0.95 * k, 0.12 * k, 0.1 * k], [-L / 2 + 1.05 * k, 1.0 * k, s * W * 0.5], DARK),
    ]),
    ...axle(xf - 0.95 * k, W * 0.86, r, 0.28 * k, m.accent),
    ...axle(-L / 2 + 1.05 * k, W * 0.86, r, 0.28 * k, m.accent),
  ];
  const bedC = (cabR - L / 2) / 2;
  if (m.payload === 'ametralladora') {
    parts.push(cyl('y', 0.06 * k, 0.7 * k, [bedC, 1.5 * k, 0], DARK));
    parts.push(...machineGun(bedC, 1.75 * k, 0, 1.15 * k, true));
    parts.push(box([0.05 * k, 0.9 * k, W * 0.9], [cabR - 0.1 * k, 2.0 * k, 0], DARK));
  }
  if (m.payload === 'carga')
    parts.push(
      box([0.6 * k, 0.5 * k, W * 0.35], [bedC - 0.2 * k, 1.4 * k, W * 0.2], '#7a6a4a'),
      box([0.5 * k, 0.4 * k, W * 0.35], [bedC + 0.3 * k, 1.35 * k, -W * 0.2], '#6e7552'),
      cyl('z', 0.25 * k, W * 0.3, [bedC - 0.5 * k, 1.45 * k, -W * 0.2], '#3e5a3a'),
    );
  return parts;
}

/** Vehículo táctico ligero: bajo y ancho, cerrado o abierto. */
export function lightVehicleParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  const k = L / 4.9;
  const r = 0.45 * k;
  const xf = L / 2;
  const open = m.variant === 'abierto';
  const cabF = xf - 1.35 * k;
  const cabR = -L / 2 + 0.6 * k;
  const parts: Part[] = [
    side(
      [
        [-L / 2, 0.6 * k],
        [xf - 0.15 * k, 0.6 * k],
        [xf, 0.95 * k],
        [xf - 0.1 * k, 1.3 * k],
        [cabF, 1.38 * k],
        [-L / 2, 1.38 * k],
      ],
      W * 0.92,
      m.color,
    ),
    ...cabin(cabR, cabF, 1.38 * k, 2.0 * k, 0.25 * k, W * 0.86, m.color, { roof: !open }),
    box([0.04 * k, 0.3 * k, W * 0.55], [xf - 0.06 * k, 1.05 * k, 0], DARK),
    ...[1, -1].map((s) =>
      box([0.05 * k, 0.12 * k, 0.22 * k], [xf - 0.08 * k, 1.12 * k, s * W * 0.36], '#f2eecf'),
    ),
    // Guardabarros anchos.
    ...[1, -1].flatMap((s) => [
      box([1.1 * k, 0.12 * k, 0.25 * k], [xf - 0.85 * k, 1.12 * k, s * W * 0.48], m.color),
      box([1.1 * k, 0.12 * k, 0.25 * k], [-L / 2 + 0.85 * k, 1.12 * k, s * W * 0.48], m.color),
    ]),
    ...axle(xf - 0.85 * k, W * 0.88, r, 0.32 * k, m.accent),
    ...axle(-L / 2 + 0.85 * k, W * 0.88, r, 0.32 * k, m.accent),
    // Rueda de repuesto atrás.
    cyl('x', r * 0.9, 0.3 * k, [-L / 2 - 0.12 * k, 1.1 * k, W * 0.25], TIRE),
  ];
  if (open)
    parts.push(
      box([0.05 * k, 0.55 * k, W * 0.86], [cabF - 0.1 * k, 1.65 * k, 0], DARK, [0, 0, 0.3]),
      ...[1, -1].map((s) =>
        cyl('x', 0.03 * k, (cabF - cabR) * 0.9, [(cabF + cabR) / 2, 2.0 * k, s * W * 0.4], DARK),
      ),
    );
  const gx = (cabF + cabR) / 2 - 0.2 * k;
  const gy = open ? 1.4 * k : 2.0 * k;
  if (m.payload === 'ametralladora') {
    parts.push(cyl('y', 0.45 * k, 0.15 * k, [gx, gy + 0.07 * k, 0], DARK));
    parts.push(...machineGun(gx, gy, 0, 1.1 * k, true));
  }
  if (m.payload === 'misiles') {
    parts.push(cyl('y', 0.45 * k, 0.15 * k, [gx, gy + 0.07 * k, 0], DARK));
    parts.push(...atgm(gx, gy, 0, 1.1 * k));
  }
  return parts;
}

/** Artillería: obús remolcado (afustes abiertos) o autopropulsado (torreta grande). */
export function artilleryParts(m: Model3D): Part[] {
  const L = m.length;
  const W = m.span;
  if (m.variant === 'autopropulsada') {
    const k = L / 10;
    const H = L * 0.72;
    const hullTop = 1.75 * k;
    const tx = -0.08 * L;
    const ty = hullTop + 0.6 * k;
    return [
      ...tracks(H, W, k, Math.max(5, Math.min(7, m.engines)), m.accent),
      side(
        [
          [-H / 2, 0.55 * k],
          [H / 2 - 0.7 * k, 0.45 * k],
          [H / 2, 1.15 * k],
          [H / 2 - 1.2 * k, hullTop],
          [-H / 2, hullTop],
        ],
        W * 0.66,
        m.color,
      ),
      box([H * 0.98, 0.06 * k, W], [0, 1.0 * k, 0], m.color),
      // Torreta alta y cuadrada.
      side(
        [
          [-H * 0.38, -0.6 * k],
          [H * 0.22, -0.6 * k],
          [H * 0.3, 0.2 * k],
          [H * 0.22, 0.6 * k],
          [-H * 0.38, 0.6 * k],
        ],
        W * 0.86,
        m.color,
        [tx, ty, 0],
      ),
      cyl(
        'x',
        0.12 * k,
        L * 0.55,
        [tx + H * 0.28 + L * 0.27 * Math.cos(0.18), ty + L * 0.27 * Math.sin(0.18), 0],
        m.color,
        { rot: [0, 0, 0.18] },
      ),
      cyl(
        'x',
        0.2 * k,
        0.5 * k,
        [tx + H * 0.28 + L * 0.53 * Math.cos(0.18), ty + L * 0.53 * Math.sin(0.18), 0],
        DARK,
        { rot: [0, 0, 0.18] },
      ),
      cyl('y', 0.3 * k, 0.2 * k, [tx - H * 0.1, ty + 0.7 * k, W * 0.2], m.color),
      ...(m.payload === 'ametralladora' ? machineGun(tx - H * 0.1, ty + 0.75 * k, W * 0.2, k) : []),
    ];
  }
  // Remolcado: cuna y tubo elevados, escudo, dos ruedas y afustes abiertos hacia atrás.
  const k = L / 9;
  const el = 0.38;
  const px = 0.6 * k;
  const py = 1.25 * k;
  const tubeL = L * 0.7;
  const parts: Part[] = [
    box([1.4 * k, 0.4 * k, 0.9 * k], [0.2 * k, 1.0 * k, 0], m.color),
    box([0.08 * k, 1.1 * k, W * 0.75], [0.9 * k, 1.35 * k, 0], m.color),
    box([2.2 * k, 0.35 * k, 0.5 * k], [px, py, 0], m.color, [0, 0, el]),
    cyl(
      'x',
      0.09 * k,
      tubeL,
      [px + (tubeL / 2) * Math.cos(el), py + (tubeL / 2) * Math.sin(el), 0],
      m.color,
      { rot: [0, 0, el] },
    ),
    cyl('x', 0.15 * k, 0.45 * k, [px + tubeL * Math.cos(el), py + tubeL * Math.sin(el), 0], DARK, {
      rot: [0, 0, el],
    }),
    ...axle(0.2 * k, W * 0.85, 0.6 * k, 0.35 * k, m.accent),
  ];
  for (const s of [1, -1]) {
    const a = s * 0.32;
    const tl = L * 0.45;
    parts.push(
      box(
        [tl, 0.22 * k, 0.22 * k],
        [-(tl / 2) * Math.cos(a) + 0.2 * k, 0.55 * k, (tl / 2) * Math.sin(a) * s * s],
        m.color,
        [0, a, -0.1],
      ),
      box(
        [0.5 * k, 0.1 * k, 0.4 * k],
        [-tl * Math.cos(a) + 0.2 * k, 0.08 * k, tl * Math.sin(a)],
        DARK,
        [0, a, 0],
      ),
    );
  }
  return parts;
}
