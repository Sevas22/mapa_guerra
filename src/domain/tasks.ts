/**
 * Tareas tácticas (MFRE 1-02, capítulo 9, tablas 9-1 a 9-4).
 *
 * Cada tarea se define en un sistema local: el eje x va del primer punto (A) al
 * segundo (B) y mide 1; el eje y es perpendicular (positivo a la izquierda).
 * En las tareas circulares A es el centro y |AB| el radio. `taskGeometry`
 * convierte esa figura a lat/lng, de modo que gira y escala con los dos puntos
 * y se anima entre fases como cualquier trazo.
 */
import type { LatLngTuple } from './types';

export type Pt = [number, number];

export interface TaskPath {
  pts: Pt[];
  dashed?: boolean;
  closed?: boolean;
}

export interface TaskLabel {
  at: Pt;
  text: string;
}

export interface TaskShape {
  paths: TaskPath[];
  labels: TaskLabel[];
}

export const TASK_IDS = [
  // Tabla 9-1: tareas tácticas de la misión.
  'abrir-brecha',
  'aislar',
  'apoyar-fuego',
  'asegurar',
  'atacar-fuego',
  'bloquear',
  'canalizar',
  'capturar',
  'contener',
  'controlar',
  'desarticular',
  'despejar',
  'destruir',
  'amague',
  'desvio',
  'envolver',
  'exfiltrar',
  'explotar',
  'fijar',
  'girar',
  'impedir',
  'infiltrar',
  'neutralizar',
  'ocupar',
  'retener',
  'romper-contacto',
  'seguir-apoyar',
  'seguir-asumir',
  'suprimir',
  // Tabla 9-2: facilitadoras.
  'seguridad-encubrir',
  'seguridad-cubrir',
  'seguridad-proteger',
  'relevo',
  'paso-vanguardia',
  'paso-retaguardia',
  // Tabla 9-3: retrógradas.
  'accion-dilatoria',
  'retirada',
  'repliegue',
  'repliegue-presion',
  // Tabla 9-4: ataques de propósito especial.
  'emboscar',
  'contraataque',
  'demostracion',
  'finta',
] as const;

export type TaskType = (typeof TASK_IDS)[number];

export type TaskGroup = 'Tareas tácticas' | 'Facilitadoras y retrógradas';

export interface TaskDef {
  name: string;
  group: TaskGroup;
  /** Circular: A es el centro y B marca el radio. */
  circular?: boolean;
  shape: () => TaskShape;
}

// ---------------------------------------------------------------- ayudas

const H = 0.1; // largo de la punta de flecha
const ANG = (28 * Math.PI) / 180;

/** Punta de flecha abierta en `tip`, llegando desde `from`. */
function head(tip: Pt, from: Pt, size = H): TaskPath {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const rot = (a: number): Pt => [
    tip[0] - size * (ux * Math.cos(a) - uy * Math.sin(a)),
    tip[1] - size * (ux * Math.sin(a) + uy * Math.cos(a)),
  ];
  return { pts: [rot(ANG), tip, rot(-ANG)] };
}

/** Línea con flecha al final. */
function arrow(pts: Pt[], dashed = false): TaskPath[] {
  const tip = pts[pts.length - 1] as Pt;
  const from = pts[pts.length - 2] as Pt;
  return [{ pts, dashed }, head(tip, from)];
}

/** Arco de circunferencia (ángulos en grados, sentido antihorario si a1 > a0). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 32): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

const lbl = (x: number, y: number, text: string): TaskLabel => ({ at: [x, y], text });
const shape = (paths: TaskPath[], labels: TaskLabel[] = []): TaskShape => ({ paths, labels });

/** Círculo abierto con punta de flecha (asegurar, ocupar, retener, aislar). */
function openCircle(letter: string, extra: TaskPath[] = []): TaskShape {
  const pts = arc(0, 0, 1, -130, 200);
  return shape(
    [{ pts }, head(pts[pts.length - 1] as Pt, pts[pts.length - 3] as Pt, 0.22), ...extra],
    letter ? [lbl(1.18, 0, letter)] : [],
  );
}

/** Corchete con extremos (abrir brecha, canalizar, desvío). */
function bracket(letter: string, ends: 'cortes' | 'flechas'): TaskShape {
  const top: Pt[] = [
    [0.85, 0.25],
    [0, 0.25],
    [0, -0.25],
    [0.85, -0.25],
  ];
  const paths: TaskPath[] = [{ pts: top }];
  if (ends === 'cortes') {
    paths.push({
      pts: [
        [0.75, 0.1],
        [0.97, 0.42],
      ],
    });
    paths.push({
      pts: [
        [0.75, -0.1],
        [0.97, -0.42],
      ],
    });
  } else {
    paths.push(head([0.85, 0.25], [0, 0.25]), head([0.85, -0.25], [0, -0.25]));
  }
  return shape(paths, [lbl(-0.1, 0, letter)]);
}

/** Arco ")" en el lado de B y flecha de regreso hacia A (retrógradas, romper contacto…). */
function backArc(letter: string): TaskShape {
  const a = arc(0.82, 0, 0.18, 90, -90);
  return shape(
    [
      { pts: a },
      ...arrow([
        [0.82, -0.18],
        [0, -0.18],
      ]),
    ],
    [lbl(0.42, -0.18, letter)],
  );
}

/** Arco "(" en el lado de A y flecha hacia B (paso de líneas a la vanguardia). */
function forwardArc(letter: string): TaskShape {
  const a = arc(0.18, 0, 0.18, 90, 270);
  return shape(
    [
      { pts: a },
      ...arrow([
        [0.18, -0.18],
        [1, -0.18],
      ]),
    ],
    [lbl(0.58, -0.18, letter)],
  );
}

/**
 * Aspa con diagonales continuas o punteadas (destruir, neutralizar, suprimir).
 * A y B marcan el ancho del aspa sobre el objetivo.
 */
function cross(letter: string, d1: boolean, d2: boolean): TaskShape {
  return shape(
    [
      {
        pts: [
          [0, 0.5],
          [1, -0.5],
        ],
        dashed: d1,
      },
      {
        pts: [
          [0, -0.5],
          [1, 0.5],
        ],
        dashed: d2,
      },
    ],
    [lbl(0.5, 0, letter)],
  );
}

/** Seguridad: flechas quebradas hacia ambos lados de la fuerza protegida. */
function security(letter: string): TaskShape {
  const left: Pt[] = [
    [0.38, 0],
    [0.24, 0],
    [0.18, 0.08],
    [0.14, -0.04],
    [0, -0.04],
  ];
  const right: Pt[] = [
    [0.62, 0],
    [0.76, 0],
    [0.82, -0.08],
    [0.86, 0.04],
    [1, 0.04],
  ];
  return shape(
    [...arrow(left), ...arrow(right)],
    [lbl(0.44, 0.07, letter), lbl(0.56, 0.07, letter)],
  );
}

function circleRing(n: number, r0: number, r1: number, from: number, to: number): TaskPath[] {
  const out: TaskPath[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((from + ((to - from) * (i + 0.5)) / n) * Math.PI) / 180;
    out.push({
      pts: [
        [r0 * Math.cos(a), r0 * Math.sin(a)],
        [r1 * Math.cos(a), r1 * Math.sin(a)],
      ],
    });
  }
  return out;
}

// ---------------------------------------------------------------- catálogo

const T = 'Tareas tácticas' as const;
const F = 'Facilitadoras y retrógradas' as const;

export const TASKS: Record<TaskType, TaskDef> = {
  'abrir-brecha': { name: 'Abrir brecha', group: T, shape: () => bracket('B', 'cortes') },
  aislar: {
    name: 'Aislar',
    group: T,
    circular: true,
    shape: () => {
      const s = openCircle('');
      // Dientes hacia dentro.
      const teeth: TaskPath[] = [];
      for (let i = 0; i < 7; i++) {
        const a = -130 + 22 + i * 44;
        const r = (d: number) => (d * Math.PI) / 180;
        teeth.push({
          pts: [
            [Math.cos(r(a - 9)), Math.sin(r(a - 9))],
            [0.8 * Math.cos(r(a)), 0.8 * Math.sin(r(a))],
            [Math.cos(r(a + 9)), Math.sin(r(a + 9))],
          ],
        });
      }
      return shape([...s.paths, ...teeth]);
    },
  },
  'apoyar-fuego': {
    name: 'Apoyar con fuego',
    group: T,
    shape: () =>
      shape([
        {
          pts: [
            [0, 0.3],
            [0, -0.3],
          ],
        },
        {
          pts: [
            [-0.22, 0.45],
            [0, 0.3],
          ],
        },
        {
          pts: [
            [-0.22, -0.45],
            [0, -0.3],
          ],
        },
        ...arrow([
          [0, 0.3],
          [0.4, 0.48],
        ]),
        ...arrow([
          [0, -0.3],
          [0.4, -0.48],
        ]),
      ]),
  },
  asegurar: { name: 'Asegurar', group: T, circular: true, shape: () => openCircle('S') },
  'atacar-fuego': {
    name: 'Atacar con fuego',
    group: T,
    shape: () =>
      shape([
        {
          pts: [
            [-0.12, 0.4],
            [0, 0.28],
            [0, -0.28],
            [-0.12, -0.4],
          ],
        },
        ...arrow([
          [0, 0],
          [1, 0],
        ]),
      ]),
  },
  bloquear: {
    name: 'Bloquear',
    group: T,
    shape: () =>
      shape(
        [
          {
            pts: [
              [0, 0],
              [0.8, 0],
            ],
          },
          {
            pts: [
              [0.8, 0.3],
              [0.8, -0.3],
            ],
          },
        ],
        [lbl(0.4, 0, 'B')],
      ),
  },
  canalizar: { name: 'Canalizar', group: T, shape: () => bracket('C', 'cortes') },
  capturar: {
    name: 'Capturar',
    group: T,
    shape: () =>
      shape(
        [
          { pts: arc(0, 0, 0.12, 0, 360, 20), closed: true },
          ...arrow([
            [0.12, 0],
            [0.5, 0.02],
            [0.8, -0.1],
            [0.95, -0.35],
          ]),
        ],
        [lbl(0.62, 0.08, 'S')],
      ),
  },
  contener: {
    name: 'Contener',
    group: T,
    shape: () =>
      shape(
        [
          { pts: arc(0.3, 0, 0.3, 90, 270) },
          ...circleRing(5, 0.3, 0.42, 100, 260).map((p) => ({
            pts: p.pts.map(([x, y]) => [x + 0.3, y] as Pt),
          })),
          {
            pts: [
              [0.3, 0],
              [0.75, 0],
            ],
          },
        ],
        [lbl(0.52, 0, 'C')],
      ),
  },
  controlar: {
    name: 'Controlar',
    group: T,
    circular: true,
    shape: () => {
      const pts = arc(0, 0, 1, 140, -140);
      return shape(
        [
          { pts },
          head(pts[0] as Pt, pts[2] as Pt, 0.22),
          head(pts[pts.length - 1] as Pt, pts[pts.length - 3] as Pt, 0.22),
        ],
        [lbl(1.18, 0, 'C')],
      );
    },
  },
  desarticular: {
    name: 'Desarticular',
    group: T,
    shape: () =>
      shape(
        [
          {
            pts: [
              [0, 0.3],
              [0, -0.3],
            ],
          },
          {
            pts: [
              [-0.12, 0],
              [0, 0],
            ],
          },
          ...arrow([
            [0, 0],
            [0.85, 0],
          ]),
          ...arrow([
            [0, 0.3],
            [0.6, 0.3],
          ]),
          ...arrow([
            [0, -0.3],
            [0.6, -0.3],
          ]),
        ],
        [lbl(0.4, 0, 'D')],
      ),
  },
  despejar: {
    name: 'Despejar',
    group: T,
    shape: () =>
      shape(
        [
          ...[0.25, 0, -0.25].flatMap((y) =>
            arrow([
              [0, y],
              [0.85, y],
            ]),
          ),
          {
            pts: [
              [0.9, 0.38],
              [0.9, -0.38],
            ],
          },
        ],
        [lbl(0.42, 0, 'C')],
      ),
  },
  destruir: { name: 'Destruir', group: T, shape: () => cross('D', false, false) },
  amague: {
    name: 'Efectuar un amague',
    group: T,
    shape: () =>
      shape([
        {
          pts: [
            [0, -0.25],
            [0.15, 0.05],
            [0.4, 0.2],
            [0.6, 0.22],
          ],
        },
        ...arrow(
          [
            [0.6, 0.22],
            [0.8, 0.18],
            [1, 0.1],
          ],
          true,
        ),
      ]),
  },
  desvio: { name: 'Efectuar un desvío', group: T, shape: () => bracket('B', 'flechas') },
  envolver: {
    name: 'Envolver',
    group: T,
    shape: () => {
      const a = arc(0.7, 0, 0.28, 180, 0);
      return shape(
        [
          {
            pts: [
              [0, 0],
              [0.42, 0],
            ],
          },
          { pts: a },
          head(a[a.length - 1] as Pt, [0.98, 0.12], 0.12),
        ],
        [lbl(0.2, 0, 'E')],
      );
    },
  },
  exfiltrar: {
    name: 'Exfiltrar',
    group: T,
    shape: () =>
      shape(
        [
          {
            pts: [
              [1, 0.12],
              [0.62, 0.12],
            ],
          },
          ...arrow([
            [0.62, 0.12],
            [0.45, 0.02],
            [0.3, 0],
            [0, 0],
          ]),
        ],
        [lbl(0.82, 0.12, 'EX')],
      ),
  },
  explotar: {
    name: 'Explotar',
    group: T,
    shape: () =>
      shape([
        {
          pts: [
            [0, 0.22],
            [0.22, 0],
            [0, -0.22],
          ],
          dashed: true,
        },
        ...arrow([
          [0.22, 0],
          [1, 0],
        ]),
      ]),
  },
  fijar: {
    name: 'Fijar',
    group: T,
    shape: () =>
      shape(
        arrow([
          [0, 0],
          [0.28, 0],
          [0.34, 0.12],
          [0.42, -0.12],
          [0.5, 0.12],
          [0.58, -0.12],
          [0.64, 0],
          [1, 0],
        ]),
        [lbl(0.13, 0, 'F')],
      ),
  },
  girar: {
    name: 'Girar',
    group: T,
    shape: () =>
      shape(
        arrow([
          [0, 0],
          [0.5, 0.02],
          [0.8, -0.1],
          [0.95, -0.35],
        ]),
        [lbl(0.62, 0.08, 'T')],
      ),
  },
  impedir: {
    name: 'Impedir',
    group: T,
    shape: () =>
      shape(
        arrow([
          [0, 0],
          [0.42, 0],
          [0.52, 0.16],
          [0.52, -0.16],
          [0.62, 0],
          [1, 0],
        ]),
        [lbl(0.52, 0.28, 'I')],
      ),
  },
  infiltrar: {
    name: 'Infiltrar',
    group: T,
    shape: () =>
      shape(
        [
          {
            pts: [
              [0, 0],
              [0.28, 0],
            ],
          },
          ...arrow([
            [0.28, 0],
            [0.42, -0.02],
            [0.52, -0.1],
            [0.62, -0.15],
            [1, -0.15],
          ]),
        ],
        [lbl(0.14, 0, 'IN')],
      ),
  },
  neutralizar: { name: 'Neutralizar', group: T, shape: () => cross('N', false, true) },
  ocupar: { name: 'Ocupar', group: T, circular: true, shape: () => openCircle('O') },
  retener: {
    name: 'Retener',
    group: T,
    circular: true,
    shape: () => {
      const s = openCircle('R');
      return shape([...s.paths, ...circleRing(10, 1, 1.18, -110, 190)], s.labels);
    },
  },
  'romper-contacto': { name: 'Romper el contacto', group: T, shape: () => backArc('DIS') },
  'seguir-apoyar': {
    name: 'Seguir y apoyar',
    group: T,
    shape: () =>
      shape([
        {
          pts: [
            [-0.06, 0.14],
            [0.06, 0],
            [-0.06, -0.14],
          ],
        },
        ...arrow([
          [0.06, 0],
          [1, 0],
        ]),
      ]),
  },
  'seguir-asumir': {
    name: 'Seguir y asumir',
    group: T,
    shape: () =>
      shape([
        {
          pts: [
            [-0.06, 0.14],
            [0.06, 0],
            [-0.06, -0.14],
          ],
        },
        ...arrow(
          [
            [0.06, 0],
            [1, 0],
          ],
          true,
        ),
      ]),
  },
  suprimir: { name: 'Suprimir', group: T, shape: () => cross('S', true, true) },
  'seguridad-encubrir': { name: 'Seguridad (encubrir)', group: F, shape: () => security('S') },
  'seguridad-cubrir': { name: 'Seguridad (cubrir)', group: F, shape: () => security('C') },
  'seguridad-proteger': { name: 'Seguridad (proteger)', group: F, shape: () => security('G') },
  relevo: {
    name: 'Relevo en posición',
    group: F,
    shape: () => {
      const a = arc(0.82, -0.06, 0.2, 90, -90);
      return shape(
        [
          ...arrow([
            [0, 0.14],
            [0.82, 0.14],
          ]),
          { pts: a },
          ...arrow([
            [0.82, -0.26],
            [0.2, -0.26],
          ]),
        ],
        [lbl(0.42, 0.14, 'RIP')],
      );
    },
  },
  'paso-vanguardia': {
    name: 'Paso de líneas a vanguardia',
    group: F,
    shape: () => forwardArc('P(F)'),
  },
  'paso-retaguardia': {
    name: 'Paso de líneas a retaguardia',
    group: F,
    shape: () => backArc('P(R)'),
  },
  'accion-dilatoria': { name: 'Acción dilatoria', group: F, shape: () => backArc('D') },
  retirada: { name: 'Retirada', group: F, shape: () => backArc('R') },
  repliegue: { name: 'Repliegue', group: F, shape: () => backArc('W') },
  'repliegue-presion': { name: 'Repliegue bajo presión', group: F, shape: () => backArc('WP') },
  emboscar: {
    name: 'Emboscar',
    group: F,
    shape: () => {
      const a = arc(-0.1, 0, 0.3, 70, -70);
      return shape(
        [
          { pts: a },
          ...circleRing(6, 0.3, 0.18, 65, -65).map((p) => ({
            pts: p.pts.map(([x, y]) => [x - 0.1, y] as Pt),
          })),
          ...arrow([
            [0.2, 0],
            [1, 0],
          ]),
        ],
        [],
      );
    },
  },
  contraataque: {
    name: 'Contraataque',
    group: F,
    shape: () =>
      shape(
        [
          {
            pts: [
              [0, -0.12],
              [0.72, -0.12],
              [0.72, -0.26],
              [1, 0],
              [0.72, 0.26],
              [0.72, 0.12],
              [0, 0.12],
            ],
            dashed: true,
          },
        ],
        [lbl(0.4, 0, 'CATK')],
      ),
  },
  demostracion: { name: 'Demostración', group: F, shape: () => backArc('DEM') },
  finta: { name: 'Finta', group: F, shape: () => backArc('F') },
};

export const isTaskType = (t: string): t is TaskType => (TASK_IDS as readonly string[]).includes(t);

// ---------------------------------------------------------------- conversión

export interface TaskGeo {
  paths: { pts: LatLngTuple[]; dashed: boolean; closed: boolean }[];
  labels: { at: LatLngTuple; text: string }[];
}

/**
 * Lleva la figura local de la tarea al mapa a partir de dos puntos [lat, lng].
 * Usa una proyección local equirectangular (escala la longitud por cos(lat)),
 * suficiente para las distancias de una maniobra.
 */
export function taskGeometry(type: TaskType, a: LatLngTuple, b: LatLngTuple): TaskGeo {
  const k = Math.cos((a[0] * Math.PI) / 180) || 1;
  const dx = (b[1] - a[1]) * k;
  const dy = b[0] - a[0];
  const toGeo = ([x, y]: Pt): LatLngTuple => {
    const px = x * dx - y * dy;
    const py = x * dy + y * dx;
    return [a[0] + py, a[1] + px / k];
  };
  const s = TASKS[type].shape();
  return {
    paths: s.paths.map((p) => ({
      pts: p.pts.map(toGeo),
      dashed: !!p.dashed,
      closed: !!p.closed,
    })),
    labels: s.labels.map((l) => ({ at: toGeo(l.at), text: l.text })),
  };
}

/** Vista previa en SVG para la paleta: la figura ajustada a la caja. */
export function previewTask(type: TaskType, color: string, w = 44, h = 34): string {
  const s = TASKS[type].shape();
  const all = [...s.paths.flatMap((p) => p.pts), ...s.labels.map((l) => l.at)];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 4;
  const sc = Math.min((w - pad * 2) / (maxX - minX || 1), (h - pad * 2) / (maxY - minY || 1));
  const ox = (w - (maxX - minX) * sc) / 2;
  const oy = (h - (maxY - minY) * sc) / 2;
  const X = (x: number) => +(ox + (x - minX) * sc).toFixed(1);
  const Y = (y: number) => +(h - oy - (y - minY) * sc).toFixed(1);
  const paths = s.paths
    .map(
      (p) =>
        `<path d="M${p.pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}${p.closed ? 'Z' : ''}"${p.dashed ? ' stroke-dasharray="2.5 2"' : ''}/>`,
    )
    .join('');
  const labels = s.labels
    .map(
      (l) =>
        `<text x="${X(l.at[0])}" y="${Y(l.at[1]) + 2.8}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${color}" stroke="#10161F" stroke-width="2" paint-order="stroke" font-family="IBM Plex Sans,sans-serif">${l.text}</text>`,
    )
    .join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">${paths}</g>${labels}</svg>`;
}
