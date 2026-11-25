/**
 * «Operación Telaraña»: operación ficticia de entrenamiento que usa todas las herramientas a
 * la vez y las deja conectadas entre sí.
 *
 * - Fichas (perfiles) de la estructura ficticia «Mamut», sus aliados y las fuentes, con
 *   morfología para los cabecillas.
 * - Grafo de vínculos (y su red de teoría de grafos) en el que cada persona es su ficha.
 * - Mapa por fases: inteligencia, vigilancia, aislamiento, inserción aérea, asalto, acciones
 *   simultáneas contra bienes y finanzas, neutralización de los enlaces y consolidación.
 * - Fichas y grafo colocados en el mapa, y modelos 3D reales (helicóptero, dron, vehículos) y
 *   la figura del cabecilla para la vista 3D.
 *
 * Todo es inventado: nombres, alias, lugares y hechos no corresponden a personas ni a
 * operaciones reales. La fuerza opositora es un OPFOR de entrenamiento.
 */
import catalog from '../../public/models/vehiculos/catalogo.json';
import { line, off, phase, point, unit, type P } from './builders';
import { newEdge, nodeForProfile, type LinkChart } from './linkChart';
import type { Model3D } from './models3d';
import { newMorphology, type Morphology } from './morphology';
import { sampleNetworkChart } from './networkSample';
import { builtinHuman, defaultOutfit, personModel } from './personModel';
import { newProfile, profileTitle, type Profile } from './profiles';
import { assetModel, parseCatalog } from './realCatalog';
import type { MapObject, Phase, PointObject, Scenario, UnitObject } from './types';

// ---------------------------------------------------------------- lugares (ficticios)

const BASE: P = [4.352, -73.985]; // FOB Alfa: puesto de mando de la FT Centauro
const CAMP: P = [4.218, -73.878]; // OBJ 1: campamento La Cumbre (cabecilla Mamut)
const FINCA: P = [4.286, -73.812]; // OBJ 2: finca El Recreo (bienes y finanzas)
const PC1: P = [4.3, -73.905]; // puesto de control en la vía norte
const PC2: P = [4.245, -73.835]; // puesto de control en la vía oriental
const COYOTE: P = [4.172, -73.778]; // OBJ 3: estructura aliada Coyote
const LINCE: P = [4.16, -73.955]; // OBJ 4: estructura aliada Lince
const ZD = off(CAMP, 0.013, -0.011); // zona de desembarco
const PA = off(CAMP, 0.006, -0.005); // posición de asalto
const ESPERA = off(BASE, -0.035, 0.03); // punto de espera de los helicópteros
const ORBITA = off(CAMP, 0.01, 0.012); // órbita del dron sobre el objetivo

// ---------------------------------------------------------------- fichas

const fis = (patch: Partial<Morphology>) => newMorphology(patch);

interface Who {
  alias: string;
  cargo: string;
  estructura: string;
  rol?: Profile['rol'];
  nombre?: string;
  fisico?: Morphology;
  notas?: string;
}

const ORG = 'Estructura Mamut (OPFOR de entrenamiento)';

/** Las 16 personas del anillo del cabecilla, en el orden del grafo de ejemplo. */
const OPERATIVOS: Who[] = [
  { alias: 'Rayo', cargo: 'Escolta', estructura: 'Seguridad personal' },
  { alias: 'Trueno', cargo: 'Jefe de seguridad personal', estructura: 'Seguridad personal' },
  { alias: 'Bisonte', cargo: 'Explosivista', estructura: 'Mando y control' },
  { alias: 'Toro', cargo: 'Custodio de bienes', estructura: 'Bienes / evidencia' },
  { alias: 'Oso', cargo: 'Administrador de fincas', estructura: 'Bienes / evidencia' },
  {
    alias: 'Zorro',
    cargo: 'Enlace con la estructura Coyote',
    estructura: 'Mando y control',
    notas:
      'Punto de corte de la red: es el único puente entre la estructura Mamut y la Coyote. Neutralizarlo divide la red.',
  },
  { alias: 'Lobo', cargo: 'Gestor de contratos', estructura: 'Contratos / servicios' },
  {
    alias: 'Tigre',
    cargo: 'Enlace con la estructura Lince',
    estructura: 'Contratos / servicios',
    notas: 'Puente hacia la estructura Lince (ruta estratégica de abastecimiento).',
  },
  { alias: 'Gato o Mono', cargo: 'Conductor', estructura: 'Logística' },
  {
    alias: 'La Tía',
    cargo: 'Segunda al mando',
    estructura: 'Mando y control',
    fisico: fis({ sexo: 'femenino', edad: 44, estatura: 158, peso: 64, somatotipo: 'endomorfo' }),
  },
  {
    alias: 'La Enfermera',
    cargo: 'Sanidad',
    estructura: 'Mando y control',
    fisico: fis({ sexo: 'femenino', edad: 31, peinado: 'recogido' }),
  },
  { alias: 'Avispa', cargo: 'Radista', estructura: 'Mando y control' },
  { alias: 'Cobra', cargo: 'Cobrador', estructura: 'Finanzas' },
  {
    alias: 'Pantera',
    cargo: 'Contadora',
    estructura: 'Finanzas',
    fisico: fis({ sexo: 'femenino', edad: 36, peinado: 'largo' }),
  },
  { alias: 'Halcón', cargo: 'Observador', estructura: 'Seguridad personal' },
  { alias: 'Búfalo', cargo: 'Jefe de logística', estructura: 'Logística' },
];

const MAMUT: Who = {
  alias: 'Mamut',
  cargo: 'Cabecilla principal',
  estructura: 'Mando y control',
  notas:
    'Hub principal de la red: concentra el grado y la intermediación. Objetivo de alto valor del OBJ 1.',
  fisico: fis({
    sexo: 'masculino',
    edad: 48,
    estatura: 168,
    peso: 92,
    somatotipo: 'endomorfo',
    piel: '#a87653',
    cabello: '#a8a8a2',
    peinado: 'corto',
    barba: 'bigote',
    ojos: 'Cafés',
    senas: 'Cicatriz en la ceja izquierda; cojera leve en la pierna derecha.',
  }),
};

const ALIADOS: Who[] = [
  {
    alias: 'Coyote',
    cargo: 'Cabecilla aliado',
    estructura: 'Estructura Coyote',
    fisico: fis({
      sexo: 'masculino',
      edad: 39,
      estatura: 181,
      peso: 78,
      somatotipo: 'mesomorfo',
      piel: '#c99a72',
      cabello: '#1c1916',
      peinado: 'rapado',
      barba: 'barba',
      senas: 'Tatuaje de un coyote en el antebrazo derecho.',
    }),
  },
  {
    alias: 'Lince',
    cargo: 'Cabecilla aliado',
    estructura: 'Estructura Lince',
    fisico: fis({
      sexo: 'masculino',
      edad: 34,
      estatura: 174,
      peso: 66,
      somatotipo: 'ectomorfo',
      piel: '#7e5236',
      cabello: '#1c1916',
      peinado: 'corto',
      senas: 'Usa lentes; cicatriz en el mentón.',
    }),
  },
];

/** Allegados de los aliados que tienen ficha (el resto queda solo en el grafo). */
const ALLEGADOS: { nombre: string; cargo: string; estructura: string }[] = [
  { nombre: 'Madre de Coyote', cargo: 'Familia', estructura: 'Estructura Coyote' },
  { nombre: 'Pareja de Coyote', cargo: 'Sentimental', estructura: 'Estructura Coyote' },
  { nombre: 'Madre de Lince', cargo: 'Familia', estructura: 'Estructura Lince' },
  { nombre: 'Pareja de Lince', cargo: 'Sentimental', estructura: 'Estructura Lince' },
];

function threat(w: Who): Profile {
  return newProfile({
    rol: w.rol ?? 'amenaza',
    alias: w.alias,
    nombre: w.nombre ?? '',
    cargo: w.cargo,
    organizacion: ORG,
    estructura: w.estructura,
    ubicacion: 'Sector Telaraña (ficticio)',
    notas: w.notas ?? '',
    ...(w.fisico ? { fisico: w.fisico } : {}),
  });
}

// ---------------------------------------------------------------- modelos 3D

const ASSETS = parseCatalog(catalog).assets;
function real(file: string, id: string): Model3D {
  const a = ASSETS.find((x) => x.file === file);
  if (!a) throw new Error(`Falta ${file} en el catálogo de modelos reales`);
  return { ...assetModel(a), id };
}

/** Fija la altura de vuelo (m sobre el terreno) de cada fase del objeto. */
function withAltitude(o: UnitObject, alts: Record<number, number>): UnitObject {
  const frames = { ...o.frames };
  for (const [k, alt] of Object.entries(alts)) {
    const f = frames[Number(k)];
    if (f) frames[Number(k)] = { ...f, alt };
  }
  return { ...o, frames };
}

const card = (
  type: 'perfil' | 'grafo',
  label: string,
  at: P,
  start: number,
  end: number | null,
  ref: { profileIds?: string[]; chartId?: string; cardWidth?: number },
): PointObject => ({ ...point(type, label, at, start, end), ...ref });

// ---------------------------------------------------------------- escenario

export function telaranaScenario(): Scenario {
  // Fichas.
  const mamut = threat(MAMUT);
  const ops = OPERATIVOS.map(threat);
  const [coyote, lince] = ALIADOS.map(threat) as [Profile, Profile];
  const allegados = ALLEGADOS.map((a) =>
    newProfile({
      rol: 'persona',
      nombre: a.nombre,
      cargo: a.cargo,
      organizacion: 'Entorno de la estructura',
      estructura: a.estructura,
      ubicacion: 'Sector Telaraña (ficticio)',
    }),
  );
  const abeja = newProfile({
    rol: 'fuente',
    fuente: 'directa',
    alias: 'Abeja',
    cargo: 'Fuente humana',
    organizacion: 'Red de fuentes FT Centauro',
    estructura: 'Inteligencia',
    notas: 'Reporta movimientos del enlace Zorro y la ubicación del campamento La Cumbre.',
  });
  const colmena = newProfile({
    rol: 'fuente',
    fuente: 'indirecta',
    alias: 'Colmena',
    cargo: 'Fuente humana',
    organizacion: 'Red de fuentes FT Centauro',
    estructura: 'Inteligencia',
    notas: 'Aporta el flujo de dinero de la estructura de finanzas hacia la finca El Recreo.',
  });
  const comandante = newProfile({
    rol: 'propio',
    nombre: 'Comandante FT Centauro (ficticio)',
    grado: 'CR',
    cargo: 'Comandante de la fuerza de tarea',
    organizacion: 'Fuerza de Tarea Centauro',
    estructura: 'Mando y control',
    ubicacion: 'FOB Alfa',
  });
  const s2 = newProfile({
    rol: 'propio',
    nombre: 'Oficial de inteligencia FT Centauro (ficticio)',
    grado: 'MY',
    cargo: 'Oficial de inteligencia (S-2)',
    organizacion: 'Fuerza de Tarea Centauro',
    estructura: 'Inteligencia',
    ubicacion: 'FOB Alfa',
  });
  const profiles = [mamut, ...ops, coyote, lince, ...allegados, abeja, colmena, comandante, s2];
  const byTitle = new Map(profiles.map((p) => [profileTitle(p), p]));
  const op = (alias: string) => ops.find((p) => p.alias === alias)!;

  // Grafo: el ejemplo de red grande, con cada persona enlazada a su ficha y las fuentes.
  const base = sampleNetworkChart();
  const nodes = base.nodes.map((n) => {
    const p = byTitle.get(n.label);
    return p ? { ...n, profileId: p.id, label: '', sub: '' } : n;
  });
  const fA = nodeForProfile(abeja, 2250, 950);
  const fC = nodeForProfile(colmena, 2050, 1720);
  const nodeOf = (p: Profile) => nodes.find((n) => n.profileId === p.id)!;
  const finanzas = base.groups.find((g) => g.title === 'Finanzas')!;
  const chart: LinkChart = {
    ...base,
    title: 'Red Mamut · Operación Telaraña (ficticia)',
    nodes: [...nodes, fA, fC],
    edges: [
      ...base.edges,
      { ...newEdge(fA.id, nodeOf(op('Zorro')).id, 'fuente-confirmado'), arrow: false },
      { ...newEdge(fA.id, nodeOf(coyote).id, 'fuente-por-confirmar'), arrow: false },
      { ...newEdge(fC.id, finanzas.id, 'fuente-confirmado'), arrow: false },
      { ...newEdge(fC.id, nodeOf(op('Cobra')).id, 'fuente-por-confirmar'), arrow: false },
    ],
  };

  // Modelos 3D: equipos reales del catálogo y la figura del cabecilla.
  const HELO = real('helicoptero-uh60.glb', 'md-tel-uh60');
  const UAS = real('dron-mq9.glb', 'md-tel-mq9');
  const HMMWV = real('ligero-hmmwv.glb', 'md-tel-hmmwv');
  const URAL = real('camion-ural.glb', 'md-tel-ural');
  const FIG = personModel(
    mamut,
    defaultOutfit('amenaza'),
    'md-tel-mamut',
    builtinHuman(mamut.fisico!),
  );

  const phases: Phase[] = [
    phase(
      'Inteligencia: la red',
      'D-10',
      'Operación ficticia de entrenamiento. El análisis de vínculos identifica la estructura Mamut: un cabecilla con seis componentes (seguridad, bienes, contratos, mando y control, finanzas y logística) y dos estructuras aliadas, Coyote y Lince, unidas a la red solo por los enlaces Zorro y Tigre. Abre «Perfiles y vínculos» para ver las fichas, el grafo y la red.',
      [4.26, -73.94],
      11,
    ),
    phase(
      'Vigilancia y confirmación',
      'D-3',
      'La fuente Abeja ubica el campamento La Cumbre y un dron MQ-9 lo vigila en órbita. Se confirma la presencia del cabecilla Mamut; el OBJ 1 se declara área de interés.',
      off(CAMP, 0.006, 0.004),
      13,
    ),
    phase(
      'Aislamiento del área',
      'D-1 · 22:00',
      'Dos elementos motorizados ocupan los puestos de control de las vías norte y oriental y bloquean las rutas de escape. El área del campamento queda aislada.',
      [4.27, -73.87],
      12,
    ),
    phase(
      'Inserción aérea',
      'Día D · H-0:15',
      'Dos UH-60 llevan a la agrupación de fuerzas especiales desde el FOB Alfa hasta la zona de desembarco, al noroeste del campamento.',
      [4.285, -73.93],
      12,
    ),
    phase(
      'Asalto al OBJ 1',
      'Día D · H',
      'La agrupación asalta el campamento La Cumbre desde la posición de asalto. Captura del cabecilla Mamut: el hub principal de la red queda neutralizado.',
      off(CAMP, 0.004, -0.002),
      14,
    ),
    phase(
      'Acciones simultáneas',
      'Día D · H+1',
      'Con la información de la fuente Colmena, el GAULA ocupa la finca El Recreo (bienes y finanzas) y en el puesto de control norte se intercepta la camioneta de la logística.',
      [4.285, -73.85],
      12,
    ),
    phase(
      'Neutralización de los enlaces',
      'Día D · H+6',
      'Se cortan los vínculos puente: capturas en las estructuras Coyote y Lince. Sin Zorro ni Tigre, la red queda dividida en componentes aislados.',
      [4.19, -73.866],
      11,
    ),
    phase(
      'Consolidación',
      'D+1',
      'Área consolidada y tropas de regreso al FOB Alfa. El grafo de la red se actualiza con las capturas para la siguiente fase de explotación de la información.',
      [4.26, -73.94],
      11,
    ),
  ];

  const objects: MapObject[] = [
    // --- Marco de la operación
    line('ao', 'AO Telaraña', [
      [4.39, -74.03],
      [4.39, -73.74],
      [4.13, -73.74],
      [4.13, -74.03],
    ]),
    point('base', 'FOB Alfa', BASE),
    unit(
      'pc',
      'FT Centauro',
      { 0: off(BASE, 0.006, -0.008) },
      {
        echelon: 'X',
        taskForce: true,
        card: {
          pax: 420,
          medios: 'Mando, inteligencia y apoyo',
          mision: 'Desarticular la red Mamut',
        },
        notes: 'Comandante y oficial de inteligencia con ficha en «Perfiles y vínculos».',
      },
    ),
    card('grafo', 'Red Mamut', [4.27, -74.112], 0, null, {
      chartId: chart.id,
      cardWidth: 300,
    }),

    // --- Estructura Mamut (OPFOR de entrenamiento)
    point('campamento', 'Campamento La Cumbre', CAMP, 0, 4, { faction: 'roja' }),
    point('objetivo', 'OBJ 1', off(CAMP, -0.004, 0.006), 1, null, {
      iconText: '1',
      notes: 'Campamento del cabecilla Mamut.',
    }),
    unit(
      'persona',
      'a. Mamut',
      { 0: off(CAMP, 0.001, 0.001) },
      {
        faction: 'roja',
        echelon: '',
        end: 4,
        model3d: FIG.id,
        notes: 'Cabecilla principal. Ficha con morfología y figura 3D.',
      },
    ),
    unit(
      'gao',
      'Seguridad Mamut',
      { 0: off(CAMP, -0.003, -0.004) },
      {
        faction: 'roja',
        echelon: '••',
        end: 4,
        card: { pax: 35, medios: 'Armamento largo, radios', mision: 'Seguridad del cabecilla' },
      },
    ),
    card('perfil', 'Objetivos de alto valor', [4.264, -73.827], 1, 1, {
      profileIds: [mamut.id, op('Zorro').id, op('Tigre').id, op('La Tía').id],
      cardWidth: 300,
    }),
    point('lugar', 'Finca El Recreo', FINCA, 0, 4, {
      faction: 'roja',
      notes: 'Bienes y finanzas de la estructura (ficticia).',
    }),
    unit(
      'gao',
      'Estructura Coyote',
      { 0: COYOTE },
      { faction: 'roja', echelon: '•••', end: 5, card: { pax: 22 } },
    ),
    unit(
      'gao',
      'Estructura Lince',
      { 0: LINCE },
      { faction: 'roja', echelon: '•••', end: 5, card: { pax: 18 } },
    ),
    // Rutas que unen al cabecilla con los aliados (los vínculos puente de la red).
    line('ruta', 'Enlace Zorro', [CAMP, off(CAMP, -0.02, 0.05), COYOTE], 0, 5, {
      faction: 'roja',
      notes: 'Ruta del enlace Zorro hacia la estructura Coyote.',
    }),
    line('ruta', 'Enlace Tigre', [CAMP, off(CAMP, -0.03, -0.035), LINCE], 0, 5, {
      faction: 'roja',
      notes: 'Ruta del enlace Tigre hacia la estructura Lince.',
    }),

    // --- Fase 1: vigilancia
    point('vigilancia', 'Fuente Abeja', off(CAMP, 0.03, -0.035), 1, 2, {
      notes: 'HUMINT: ubica el campamento y los movimientos de Zorro.',
    }),
    withAltitude(
      unit(
        'aviacion-fija',
        'MQ-9',
        { 1: ORBITA, 2: ORBITA, 3: ORBITA, 4: off(CAMP, 0.004, 0.006) },
        {
          echelon: '',
          mod1: 'UAS',
          start: 1,
          end: 4,
          model3d: UAS.id,
          altitude: 2500,
          card: { medios: '01 MQ-9 (ISR)', mision: 'Vigilancia permanente del OBJ 1' },
        },
      ),
      { 1: 2500, 2: 2500, 3: 2500, 4: 1800 },
    ),
    line(
      'ani',
      'ANI OBJ 1',
      [
        off(CAMP, 0.012, -0.012),
        off(CAMP, 0.012, 0.012),
        off(CAMP, -0.012, 0.012),
        off(CAMP, -0.012, -0.012),
      ],
      1,
      4,
    ),
    point('evento', 'Mamut confirmado', off(CAMP, -0.002, 0.003), 1, 1, {
      notes: 'Confirmación cruzada: fuente Abeja y video del MQ-9.',
    }),

    // --- Fase 2: aislamiento
    point('control', 'PC norte', PC1, 2, 6, { iconText: '1' }),
    point('control', 'PC oriental', PC2, 2, 6, { iconText: '2' }),
    unit(
      'infanteria',
      'Pelotón móvil 1',
      {
        2: off(PC1, 0.003, -0.004),
        5: off(PC1, 0.003, -0.004),
        6: off(LINCE, 0.01, 0.006),
        7: off(BASE, -0.004, 0.006),
      },
      {
        echelon: '•••',
        mobility: 'ruedas',
        start: 2,
        model3d: HMMWV.id,
        card: { pax: 28, medios: '04 HMMWV', mision: 'Bloquear la vía norte' },
      },
    ),
    unit(
      'infanteria',
      'Compañía B',
      {
        2: off(PC2, 0.003, 0.004),
        5: off(PC2, 0.003, 0.004),
        6: off(COYOTE, 0.01, -0.006),
        7: off(BASE, -0.008, 0.012),
      },
      {
        echelon: 'I',
        mobility: 'ruedas',
        start: 2,
        model3d: URAL.id,
        card: { pax: 96, medios: '06 camiones Ural', mision: 'Bloquear la vía oriental' },
      },
    ),
    line('ruta', 'Ruta motorizada norte', [BASE, off(BASE, -0.03, 0.04), PC1], 2, 2, {
      travel: { mode: 'motorizado-destapado' },
    }),
    line('ruta', 'Ruta motorizada oriental', [BASE, off(BASE, -0.04, 0.09), PC2], 2, 2, {
      travel: { mode: 'motorizado-destapado' },
    }),
    line('bloquear', '', [off(PC1, 0.012, -0.01), PC1], 2, 5),
    line('bloquear', '', [off(PC2, 0.01, 0.012), PC2], 2, 5),
    line('aislar', '', [CAMP, off(CAMP, 0.018, 0)], 2, 3),

    // --- Fase 3: inserción aérea (helicópteros en el FOB hasta la inserción)
    ...[0, 1].map((i) =>
      withAltitude(
        unit(
          'aviacion',
          `UH-60 ${i + 1}`,
          {
            2: off(BASE, -0.004, 0.012 + i * 0.006),
            3: off(ZD, i * 0.002, i * 0.003),
            4: off(ESPERA, 0, i * 0.004),
            6: off(ESPERA, 0, i * 0.004),
            7: off(BASE, -0.004, 0.012 + i * 0.006),
          },
          {
            echelon: 'Ø',
            mod1: 'ASLT',
            start: 2,
            model3d: HELO.id,
            altitude: 150,
            card: { pax: 4, medios: '01 UH-60M', mision: 'Insertar la agrupación de FF.EE' },
          },
        ),
        { 2: 0, 3: 0, 4: 0, 6: 0, 7: 0 },
      ),
    ),
    point('zd', '', ZD, 3, 4, { iconText: 'ZD' }),
    line('ruta', 'Ruta aérea', [BASE, off(BASE, -0.07, 0.03), ZD], 3, 3, {
      travel: { mode: 'aereo' },
    }),
    unit(
      'especiales',
      'AFEAU',
      { 3: off(ZD, -0.003, 0.004), 4: PA, 5: off(CAMP, 0.002, -0.002), 7: off(BASE, 0.004, 0.012) },
      {
        echelon: 'I',
        mobility: 'asalto-aereo',
        start: 3,
        card: {
          pax: 64,
          medios: 'Armamento individual, visión nocturna',
          mision: 'Capturar al cabecilla Mamut',
        },
      },
    ),

    // --- Fase 4: asalto
    line('capturar', '', [PA, CAMP], 4, 4),
    point('evento', 'Combate', off(CAMP, -0.001, -0.003), 4, 4, { faction: 'roja' }),
    point('captura', 'Captura de a. Mamut', off(CAMP, 0.001, 0.001), 4, null, {
      notes: 'Hub principal neutralizado.',
    }),

    // --- Fase 5: acciones simultáneas (bienes y finanzas)
    unit(
      'gaula',
      'GAULA',
      { 4: off(PC2, -0.004, 0.006), 5: off(FINCA, 0.002, -0.003), 7: off(BASE, -0.012, 0.004) },
      {
        echelon: '•••',
        mobility: 'ruedas',
        start: 4,
        model3d: HMMWV.id,
        card: { pax: 24, mision: 'Ocupar la finca El Recreo' },
      },
    ),
    line('ruta', '', [off(PC2, -0.004, 0.006), off(FINCA, 0.002, -0.003)], 5, 5, {
      travel: { mode: 'motorizado-destapado' },
    }),
    point('captura', 'Ocupación de bienes', FINCA, 5, null, {
      notes: 'Finca El Recreo (ficticia): bienes y documentos de finanzas.',
    }),
    point('evento', 'Camioneta interceptada', off(PC1, -0.002, 0.003), 5, 5, {
      notes: 'Camioneta gris de la logística (placa ficticia).',
    }),
    point('vigilancia', 'Fuente Colmena', off(FINCA, 0.03, 0.03), 5, 5, {
      notes: 'Aporta el flujo de dinero hacia la finca.',
    }),
    card('perfil', 'Finanzas y bienes', [4.366, -73.757], 5, 5, {
      profileIds: [op('Pantera').id, op('Cobra').id, op('Toro').id, op('Oso').id],
      cardWidth: 300,
    }),

    // --- Fase 6: neutralización de los enlaces
    line('capturar', '', [off(LINCE, 0.01, 0.006), LINCE], 6, 6),
    line('capturar', '', [off(COYOTE, 0.01, -0.006), COYOTE], 6, 6),
    point('captura', 'Captura de a. Lince', LINCE, 6, null),
    point('captura', 'Captura de a. Coyote', COYOTE, 6, null),
    card('perfil', 'Estructuras aliadas', [4.351, -73.729], 6, 6, {
      profileIds: [coyote.id, lince.id, op('Zorro').id, op('Tigre').id],
      cardWidth: 300,
    }),

    // --- Fase 7: consolidación
    line(
      'zona',
      'Área consolidada',
      [
        off(CAMP, 0.09, -0.08),
        off(CAMP, 0.09, 0.1),
        off(CAMP, -0.07, 0.11),
        off(CAMP, -0.07, -0.09),
      ],
      7,
      7,
    ),
  ];

  return {
    v: 1,
    name: 'Operación Telaraña (ficticia)',
    speed: 2,
    phases,
    objects,
    profiles,
    charts: [chart],
    models: [HELO, UAS, HMMWV, URAL, FIG],
  };
}
