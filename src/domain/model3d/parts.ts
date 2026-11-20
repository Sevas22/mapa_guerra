/**
 * Piezas geométricas de los modelos 3D y ayudas para componerlas. Son datos puros (sin
 * three.js): `lib/model3dThree` las convierte en mallas.
 *
 * Ejes, en metros: x hacia el frente (nariz o proa), y hacia arriba, z hacia la derecha.
 */

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

interface PartBase {
  pos: Vec3;
  /** Giro en radianes (orden XYZ), alrededor de `pos`. */
  rot?: Vec3;
  color: string;
  opacity?: number;
}

/**
 * - `box`: caja de medidas `size`.
 * - `cyl`: cilindro (o cono si `r2` es 0) de largo `len` a lo largo de `axis`.
 * - `ellipsoid`: esfera escalada a los diámetros `size`.
 * - `rotor`: disco translúcido con `blades` palas que gira sobre `axis`.
 * - `prism`: polígono `pts` extruido `depth`. En el plano `xy` es un perfil lateral (x, y)
 *   extruido a lo ancho (z); en `xz` es una planta (x, z) extruida en altura (y). Centrado en
 *   la extrusión. Da siluetas realistas: cascos, cabinas, alas, torretas.
 * - `lathe`: sólido de revolución alrededor del eje x; `pts` son pares (x, radio). `squash`
 *   achata la sección en y (1 = circular). Fuselajes, cascos de submarino, tanques cisterna.
 * - `limb`: cápsula redondeada de `pos` a `to`, con radio `r` en el origen y `r2` en el final.
 *   Miembros de las figuras humanas (muslos, antebrazos, cuello) y piezas orgánicas.
 */
export type Part =
  | (PartBase & { shape: 'box'; size: Vec3 })
  | (PartBase & { shape: 'cyl'; r: number; r2?: number; len: number; axis: 'x' | 'y' | 'z' })
  | (PartBase & { shape: 'ellipsoid'; size: Vec3 })
  | (PartBase & { shape: 'rotor'; r: number; blades: number; axis: 'x' | 'y' | 'z' })
  | (PartBase & { shape: 'prism'; pts: Vec2[]; depth: number; plane: 'xy' | 'xz' })
  | (PartBase & { shape: 'lathe'; pts: Vec2[]; squash?: number })
  | (PartBase & { shape: 'limb'; to: Vec3; r: number; r2?: number });

export const GLASS = '#1d2a36';
export const PROP = '#20252b';
export const TIRE = '#1b1d20';
export const STEEL = '#5b6168';
export const DARK = '#2a2e33';
export const LIGHT_METAL = '#9aa0a6';

// ------------------------------------------------------------------ atajos

export const box = (size: Vec3, pos: Vec3, color: string, rot?: Vec3): Part => ({
  shape: 'box',
  size,
  pos,
  color,
  ...(rot ? { rot } : {}),
});

export const cyl = (
  axis: 'x' | 'y' | 'z',
  r: number,
  len: number,
  pos: Vec3,
  color: string,
  extra: { r2?: number; rot?: Vec3 } = {},
): Part => ({ shape: 'cyl', axis, r, len, pos, color, ...extra });

export const ell = (size: Vec3, pos: Vec3, color: string, opacity?: number): Part => ({
  shape: 'ellipsoid',
  size,
  pos,
  color,
  ...(opacity != null ? { opacity } : {}),
});

/** Perfil lateral (x, y) extruido a lo ancho, centrado en z = pos[2]. */
export const side = (
  pts: Vec2[],
  depth: number,
  color: string,
  pos: Vec3 = [0, 0, 0],
  rot?: Vec3,
): Part => ({
  shape: 'prism',
  plane: 'xy',
  pts,
  depth,
  pos,
  color,
  ...(rot ? { rot } : {}),
});

/** Planta (x, z) extruida en altura `depth`, centrada en y = pos[1]. */
export const plan = (
  pts: Vec2[],
  depth: number,
  color: string,
  pos: Vec3 = [0, 0, 0],
  rot?: Vec3,
): Part => ({
  shape: 'prism',
  plane: 'xz',
  pts,
  depth,
  pos,
  color,
  ...(rot ? { rot } : {}),
});

export const lathe = (pts: Vec2[], pos: Vec3, color: string, squash?: number): Part => ({
  shape: 'lathe',
  pts,
  pos,
  color,
  ...(squash != null && squash !== 1 ? { squash } : {}),
});

/** Cápsula de `a` a `b` (radios `r` y `r2`). */
export const limb = (a: Vec3, b: Vec3, r: number, color: string, r2?: number): Part => ({
  shape: 'limb',
  pos: a,
  to: b,
  r,
  color,
  ...(r2 != null ? { r2 } : {}),
});

export const rotor = (
  axis: 'x' | 'y' | 'z',
  r: number,
  blades: number,
  pos: Vec3,
  color = PROP,
): Part => ({ shape: 'rotor', axis, r, blades, pos, color });

/** Rueda con llanta: neumático oscuro y rin del color dado. Eje a lo ancho (z). */
export function wheel(x: number, z: number, r: number, w: number, hub: string): Part[] {
  const y = r;
  return [
    cyl('z', r, w, [x, y, z], TIRE),
    cyl('z', r * 0.55, w * 1.06, [x, y, z], hub),
    cyl('z', r * 0.18, w * 1.12, [x, y, z], DARK),
  ];
}

/** Par de ruedas (izquierda y derecha) en la posición x. */
export const axle = (x: number, track: number, r: number, w: number, hub: string): Part[] =>
  [1, -1].flatMap((s) => wheel(x, (s * track) / 2, r, w, hub));

/**
 * Cabina con parabrisas inclinado: cuerpo sólido y ventanas. `xr`, `xf`: atrás y adelante;
 * `y0`, `y1`: base y techo; `slope`: retroceso del techo respecto al frente.
 */
export function cabin(
  xr: number,
  xf: number,
  y0: number,
  y1: number,
  slope: number,
  width: number,
  color: string,
  opts: { roof?: boolean; glass?: string } = {},
): Part[] {
  const h = y1 - y0;
  const glass = opts.glass ?? GLASS;
  const parts: Part[] = [];
  const at = (y: number) => xf - (slope * (y - y0)) / h;
  if (opts.roof !== false)
    parts.push(
      side(
        [
          [xr, y0],
          [xf, y0],
          [xf - slope, y1],
          [xr + 0.02 * h, y1],
        ],
        width,
        color,
      ),
    );
  // Ventanas: banda un poco más ancha que la cabina y asomada sobre el parabrisas.
  const g0 = y0 + h * 0.3;
  const g1 = y0 + h * 0.9;
  const ins = Math.min(0.12, (xf - xr) * 0.08);
  parts.push(
    side(
      [
        [xr + ins, g0],
        [at(g0) + 0.03, g0],
        [at(g1) + 0.03, g1],
        [xr + ins, g1],
      ],
      opts.roof === false ? width * 0.96 : width * 1.015,
      glass,
    ),
  );
  return parts;
}

/** Ala o plano (planta trapezoidal simétrica) con flecha. */
export function wing(
  x: number,
  y: number,
  rootChord: number,
  tipChord: number,
  span: number,
  sweep: number,
  thick: number,
  color: string,
): Part {
  const le = x + rootChord / 2;
  const h = span / 2;
  return plan(
    [
      [le, 0],
      [le - sweep, h],
      [le - sweep - tipChord, h],
      [x - rootChord / 2, 0],
      [le - sweep - tipChord, -h],
      [le - sweep, -h],
    ],
    thick,
    color,
    [0, y, 0],
  );
}

/** Deriva (perfil lateral trapezoidal) con raíz en (x, y); `cant` la inclina hacia un lado. */
export function fin(
  x: number,
  y: number,
  z: number,
  rootChord: number,
  tipChord: number,
  height: number,
  sweep: number,
  thick: number,
  color: string,
  cant = 0,
): Part {
  return side(
    [
      [x - rootChord / 2, 0],
      [x + rootChord / 2, 0],
      [x + rootChord / 2 - sweep, height],
      [x + rootChord / 2 - sweep - tipChord, height],
    ],
    thick,
    color,
    [0, y, z],
    cant ? [cant, 0, 0] : undefined,
  );
}

/** Góndola de motor (revolución) centrada en x. */
export const nacelle = (
  x: number,
  y: number,
  z: number,
  len: number,
  r: number,
  color: string,
): Part =>
  lathe(
    [
      [-len / 2, 0],
      [-len / 2, r * 0.55],
      [-len * 0.3, r * 0.95],
      [len * 0.35, r],
      [len / 2, r * 0.8],
      [len / 2, 0],
    ],
    [x, y, z],
    color,
  );

// ------------------------------------------------------------------ medidas

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/** Caja que contiene la pieza (aproximada si está girada). */
function partBounds(p: Part): Bounds {
  let lo: Vec3;
  let hi: Vec3;
  const half = (a: Vec3): void => {
    lo = [-a[0], -a[1], -a[2]];
    hi = [a[0], a[1], a[2]];
  };
  switch (p.shape) {
    case 'box':
    case 'ellipsoid':
      half([p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]);
      break;
    case 'cyl': {
      const r = Math.max(p.r, p.r2 ?? 0);
      half(
        p.axis === 'x' ? [p.len / 2, r, r] : p.axis === 'y' ? [r, p.len / 2, r] : [r, r, p.len / 2],
      );
      break;
    }
    case 'rotor':
      half(
        p.axis === 'x'
          ? [0.05 * p.r, p.r, p.r]
          : p.axis === 'y'
            ? [p.r, 0.05 * p.r, p.r]
            : [p.r, p.r, 0.05 * p.r],
      );
      break;
    case 'prism': {
      const a = p.pts.map((q) => q[0]);
      const b = p.pts.map((q) => q[1]);
      const d = p.depth / 2;
      if (p.plane === 'xy') {
        lo = [Math.min(...a), Math.min(...b), -d];
        hi = [Math.max(...a), Math.max(...b), d];
      } else {
        lo = [Math.min(...a), -d, Math.min(...b)];
        hi = [Math.max(...a), d, Math.max(...b)];
      }
      break;
    }
    case 'limb': {
      const r = Math.max(p.r, p.r2 ?? p.r);
      const d: Vec3 = [p.to[0] - p.pos[0], p.to[1] - p.pos[1], p.to[2] - p.pos[2]];
      lo = [Math.min(0, d[0]) - r, Math.min(0, d[1]) - r, Math.min(0, d[2]) - r];
      hi = [Math.max(0, d[0]) + r, Math.max(0, d[1]) + r, Math.max(0, d[2]) + r];
      break;
    }
    case 'lathe': {
      const r = Math.max(...p.pts.map((q) => q[1]));
      const sy = r * (p.squash ?? 1);
      lo = [Math.min(...p.pts.map((q) => q[0])), -sy, -r];
      hi = [Math.max(...p.pts.map((q) => q[0])), sy, r];
      break;
    }
  }
  if (p.rot && p.rot.some((v) => Math.abs(v) > 1e-6)) {
    // Girada: se giran las ocho esquinas (orden XYZ de three.js: v' = Rx·Ry·Rz·v).
    const [ax, ay, az] = p.rot;
    const nlo: Vec3 = [Infinity, Infinity, Infinity];
    const nhi: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const cx of [lo![0], hi![0]])
      for (const cy of [lo![1], hi![1]])
        for (const cz of [lo![2], hi![2]]) {
          let x = cx * Math.cos(az) - cy * Math.sin(az);
          let y = cx * Math.sin(az) + cy * Math.cos(az);
          let z = cz;
          [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
          [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
          const v: Vec3 = [x, y, z];
          for (let i = 0; i < 3; i++) {
            nlo[i] = Math.min(nlo[i]!, v[i]!);
            nhi[i] = Math.max(nhi[i]!, v[i]!);
          }
        }
    lo = nlo;
    hi = nhi;
  }
  return {
    min: [lo![0] + p.pos[0], lo![1] + p.pos[1], lo![2] + p.pos[2]],
    max: [hi![0] + p.pos[0], hi![1] + p.pos[1], hi![2] + p.pos[2]],
  };
}

/** Caja que contiene todas las piezas. */
export function partsBounds(parts: Part[]): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const b = partBounds(p);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i]!, b.min[i]!);
      max[i] = Math.max(max[i]!, b.max[i]!);
    }
  }
  return { min, max };
}
