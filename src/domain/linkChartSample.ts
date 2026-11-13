/**
 * Ejemplo ficticio de grafo de vínculos, con la estructura de una lámina de análisis: el
 * cabecilla al centro, cuadros de seguridad, mando y control, finanzas, logística y
 * contactos, un vehículo y dos fuentes. Todos los nombres son inventados (OPFOR de
 * entrenamiento) y no corresponden a personas reales.
 */
import {
  newChart,
  newEdge,
  newGroup,
  newNode,
  nodeForProfile,
  type ChartNode,
  type LinkChart,
} from './linkChart';
import { newProfile, type Profile } from './profiles';

export function sampleLinkChart(): { profiles: Profile[]; chart: LinkChart } {
  const P = (patch: Partial<Profile>) =>
    newProfile({ organizacion: 'OPFOR de entrenamiento', ...patch });
  const jefe = P({
    alias: 'Cóndor',
    cargo: 'Cabecilla principal',
    estructura: 'Mando y control',
    rol: 'amenaza',
    ubicacion: 'Sector K (ficticio)',
  });
  const seg = ['Halcón', 'Búho', 'Jaguar', 'Puma'].map((alias, i) =>
    P({
      alias,
      cargo:
        i === 3 ? 'Conductor' : i === 0 ? 'Responsable de seguridad' : 'Integrante de seguridad',
      estructura: 'Seguridad personal',
      rol: 'amenaza',
    }),
  );
  const mando = [
    ['Roble', 'Cabecilla de compañía'],
    ['Ceiba', 'Cabecilla de comisión'],
    ['Guadua', 'Cabecilla político'],
    ['Nogal', 'Segundo cabecilla'],
  ].map(([alias, cargo]) => P({ alias, cargo, estructura: 'Mando y control', rol: 'amenaza' }));
  const fin = [
    ['Tucán', 'Cabecilla de finanzas'],
    ['Loro', 'Cabecilla de comisión'],
  ].map(([alias, cargo]) => P({ alias, cargo, estructura: 'Finanzas', rol: 'amenaza' }));
  const contactos = [
    ['La Abuela', 'Contacto en el casco urbano'],
    ['El Mono', 'Apoyo logístico'],
  ].map(([alias, cargo]) =>
    P({ alias, cargo, estructura: 'Contactos de interés', rol: 'persona' }),
  );
  const f1 = newProfile({
    alias: 'K-Tauro',
    cargo: 'Vereda El Alto (ficticia)',
    rol: 'fuente',
    fuente: 'area',
  });
  const f2 = newProfile({
    alias: 'K-Libra',
    cargo: 'Vereda La Loma (ficticia)',
    rol: 'fuente',
    fuente: 'estudio',
  });
  const profiles = [jefe, ...seg, ...mando, ...fin, ...contactos, f1, f2];

  const chart = newChart('Red de vínculos · OPFOR Cóndor (ejercicio ficticio)');
  const at = (p: Profile, x: number, y: number): ChartNode => nodeForProfile(p, x, y);

  const gSeg = newGroup(300, 40, { title: 'Seguridad personal', w: 460, h: 120, tab: 'bottom' });
  const gJefe = newGroup(465, 245, { title: '', w: 190, h: 190, tab: 'top' });
  const gMando = newGroup(420, 500, { title: 'Mando y control', w: 340, h: 120, tab: 'top' });
  const gFin = newGroup(830, 110, { title: 'Finanzas', w: 200, h: 180, tab: 'left' });
  const gLog = newGroup(830, 370, { title: 'Logística', w: 180, h: 160, tab: 'left' });
  const gCon = newGroup(110, 360, { title: 'Contactos de interés', w: 220, h: 170, tab: 'right' });

  const nJefe = at(jefe, 560, 300);
  const nSeg = seg.map((p, i) => at(p, 365 + i * 110, 82));
  const nMando = mando.map((p, i) => at(p, 465 + i * 83, 545));
  const nFin = fin.map((p, i) => at(p, 885 + i * 95, 175));
  const nCon = contactos.map((p, i) => at(p, 170 + i * 100, 420));
  const nLog = newNode('lugar', 920, 440, { label: 'Bodega El Mirador', sub: '(ficticia)' });
  const nVeh = newNode('vehiculo', 150, 150, {
    label: 'Camioneta gris',
    sub: 'Placa ficticia XYZ-000',
  });
  const nF1 = at(f1, 1140, 60);
  const nF2 = at(f2, 1140, 190);

  chart.groups = [gSeg, gJefe, gMando, gFin, gLog, gCon];
  chart.nodes = [nJefe, ...nSeg, ...nMando, ...nFin, ...nCon, nLog, nVeh, nF1, nF2];
  chart.edges = [
    newEdge(gSeg.id, gJefe.id, 'confirmado'),
    newEdge(gJefe.id, gMando.id, 'confirmado'),
    newEdge(gJefe.id, gCon.id, 'confirmado'),
    newEdge(gFin.id, gJefe.id, 'por-confirmar'),
    newEdge(gLog.id, gMando.id, 'confirmado'),
    newEdge(nVeh.id, gSeg.id, 'por-confirmar'),
    newEdge(nF1.id, nFin[0]!.id, 'fuente-confirmado'),
    newEdge(nF2.id, gJefe.id, 'fuente-por-confirmar'),
  ];
  return { profiles, chart };
}
