/**
 * Ejemplo ficticio de red grande para la vista «Red (teoría de grafos)»: un cabecilla
 * principal con su anillo de operativos, seis estructuras (seguridad personal, bienes y
 * evidencia, contratos y servicios, mando y control, finanzas, logística) con su nube de
 * contactos, y dos cabecillas aliados con familia, relaciones sentimentales y operativos,
 * unidos al principal por vínculos puente. Todos los nombres son inventados (OPFOR de
 * entrenamiento) y no corresponden a personas reales.
 */
import {
  newChart,
  newEdge,
  newGroup,
  newNode,
  type ChartEdge,
  type ChartGroup,
  type ChartNode,
  type EdgeKind,
  type LinkChart,
  type NodeKind,
} from './linkChart';

const OPERATIVOS = [
  'Rayo',
  'Trueno',
  'Bisonte',
  'Toro',
  'Oso',
  'Zorro',
  'Lobo',
  'Tigre',
  'Gato o Mono',
  'La Tía',
  'La Enfermera',
  'Avispa',
  'Cobra',
  'Pantera',
  'Halcón',
  'Búfalo',
];

interface Structure {
  title: string;
  prefix: string;
  /** Contactos sueltos de la estructura (la nube de puntos). */
  count: number;
  /** Ángulo alrededor del cabecilla, en grados. */
  angle: number;
}

const STRUCTURES: Structure[] = [
  { title: 'Seguridad personal', prefix: 'SP', count: 12, angle: -90 },
  { title: 'Bienes / evidencia', prefix: 'BE', count: 10, angle: 200 },
  { title: 'Contratos / servicios', prefix: 'CS', count: 12, angle: 160 },
  { title: 'Mando y control', prefix: 'MC', count: 14, angle: 120 },
  { title: 'Finanzas', prefix: 'FI', count: 12, angle: 80 },
  { title: 'Logística', prefix: 'LO', count: 12, angle: 40 },
];

export function sampleNetworkChart(): LinkChart {
  const nodes: ChartNode[] = [];
  const groups: ChartGroup[] = [];
  const edges: ChartEdge[] = [];
  const node = (kind: NodeKind, x: number, y: number, label: string, sub = '') => {
    const n = newNode(kind, Math.round(x), Math.round(y), { label, sub });
    nodes.push(n);
    return n;
  };
  const link = (a: { id: string }, b: { id: string }, kind: EdgeKind = 'confirmado') =>
    edges.push({ ...newEdge(a.id, b.id, kind), arrow: false });
  const polar = (cx: number, cy: number, r: number, deg: number) => [
    cx + r * Math.cos((deg * Math.PI) / 180),
    cy + r * Math.sin((deg * Math.PI) / 180),
  ];

  // Cabecilla principal y su anillo de operativos (vínculos entre vecinos del anillo).
  const C = { x: 1500, y: 1100 };
  const jefe = node('amenaza', C.x, C.y, 'a. Mamut', 'Cabecilla principal');
  const ops = OPERATIVOS.map((alias, i) => {
    const [x, y] = polar(C.x, C.y, 360, (360 / OPERATIVOS.length) * i - 80);
    const n = node('amenaza', x!, y!, `a. ${alias}`, 'Operativo');
    link(jefe, n);
    return n;
  });
  ops.forEach((n, i) => {
    if (i % 2 === 0) link(n, ops[(i + 1) % ops.length]!, 'por-confirmar');
    if (i % 5 === 0) link(n, ops[(i + 3) % ops.length]!, 'por-confirmar');
  });

  // Estructuras: cuadro con su nube de contactos, unido al cabecilla y a dos operativos.
  STRUCTURES.forEach((s, si) => {
    const [gx, gy] = polar(C.x, C.y, 900, s.angle);
    const w = 380;
    const h = 300;
    const g: ChartGroup = newGroup(Math.round(gx! - w / 2), Math.round(gy! - h / 2), {
      title: s.title,
      w,
      h,
    });
    groups.push(g);
    link(g, jefe);
    link(g, ops[(si * 3) % ops.length]!, 'por-confirmar');
    link(g, ops[(si * 3 + 1) % ops.length]!, 'por-confirmar');
    const cols = 4;
    for (let i = 0; i < s.count; i++) {
      const x = g.x + 55 + (i % cols) * 90;
      const y = g.y + 60 + Math.floor(i / cols) * 80;
      node('persona', x, y, `${s.prefix}-${String(i + 1).padStart(2, '0')}`);
    }
    if (s.prefix === 'BE') {
      // Bienes: un inmueble y un vehículo dentro del cuadro, cada uno con sus contactos.
      const inm = node('lugar', g.x - 220, g.y + 60, 'Inmueble (ficticio)');
      const veh = node('vehiculo', g.x - 220, g.y + 260, 'Vehículo', 'Placa ficticia');
      link(g, inm);
      link(g, veh);
      for (let i = 0; i < 5; i++) {
        link(inm, node('persona', g.x - 420, g.y - 40 + i * 50, `IN-${i + 1}`), 'por-confirmar');
        link(veh, node('persona', g.x - 420, g.y + 230 + i * 50, `VE-${i + 1}`), 'por-confirmar');
      }
    }
  });

  // Cabecillas aliados: familia, relaciones sentimentales, operativos y su nube de contactos.
  const ally = (name: string, cx: number, cy: number, bridgeFrom: ChartNode) => {
    const a = node('amenaza', cx, cy, `a. ${name}`, 'Cabecilla aliado');
    const fam = ['Madre', 'Padre', 'Hermano', 'Hija'].map((r, i) => {
      const [x, y] = polar(cx, cy, 230, -150 + i * 35);
      const n = node('persona', x!, y!, `${r} de ${name}`, 'Familia');
      link(a, n, 'fuente-confirmado');
      return n;
    });
    const sent = ['Pareja', 'Expareja'].map((r, i) => {
      const [x, y] = polar(cx, cy, 250, -20 + i * 35);
      const n = node('persona', x!, y!, `${r} de ${name}`, 'Sentimental');
      link(a, n, 'fuente-por-confirmar');
      return n;
    });
    const mem = ['Garza', 'Puma', 'Cóndor', 'Tapir'].map((r, i) => {
      const [x, y] = polar(cx, cy, 240, 80 + i * 40);
      const n = node('amenaza', x!, y!, `a. ${r} (${name.slice(0, 3)})`, 'Operativo');
      link(a, n);
      return n;
    });
    [...fam, ...sent, ...mem].forEach((n, i) => {
      for (let k = 0; k < 2; k++) {
        const [x, y] = polar(cx, cy, 380 + k * 60, -150 + i * 27 + k * 10);
        link(
          n,
          node('persona', x!, y!, `${name.slice(0, 2).toUpperCase()}-${i * 2 + k + 1}`),
          'por-confirmar',
        );
      }
    });
    // Vínculo puente con la red principal (la «ruta estratégica»).
    link(bridgeFrom, a, 'por-confirmar');
    return a;
  };
  ally('Coyote', 2900, 550, ops[5]!);
  ally('Lince', 2900, 1700, ops[7]!);

  return {
    ...newChart('Red de vínculos · ejemplo de teoría de grafos (ficticio)'),
    nodes,
    groups,
    edges,
    legend: true,
  };
}
