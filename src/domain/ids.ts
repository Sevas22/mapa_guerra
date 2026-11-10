/**
 * Identificadores válidos del modelo. Se conservan todos los del prototipo para
 * que sus archivos JSON sigan importándose; los nuevos siguen el manual
 * MFRE 1-02 «Términos y símbolos militares» y la graficación estandarizada DIVFE.
 */

/** Identidad estándar (MFRE 1-02, tabla 3-1). Los valores son los del prototipo. */
export const FACTION_IDS = ['azul', 'roja', 'verde', 'amarilla'] as const;

export const UNIT_TYPES = [
  // Del prototipo (algunos cambian de nombre o de dibujo para ajustarse al MFRE).
  'infanteria',
  'mecanizada',
  'blindados',
  'reconocimiento',
  'artilleria',
  'antiaerea',
  'aviacion',
  'naval',
  'ingenieros',
  'comunicaciones',
  'sanidad',
  'logistica',
  'especiales',
  'policia',
  'pc',
  // MFRE 1-02, tabla 4-1.
  'antitanque',
  'aviacion-fija',
  'inteligencia',
  'mantenimiento',
  'morteros',
  'policia-militar',
  'transportes',
  'vigilancia',
  'desminado',
  'accion-integral',
  // Unidades de la graficación DIVFE.
  'alta-montana',
  'gaula',
  'energetico-vial',
  'narcotrafico',
  'mineria',
  'infanteria-marina',
  'organizacion-gubernamental',
  // GAO y personas.
  'gao',
  'persona',
  // Texto libre como ícono (MFRE tabla 4-2: «unidades que usan el nombre»).
  'nombre',
] as const;

export const POINT_TYPES = [
  // Del prototipo.
  'objetivo',
  'base',
  'evento',
  'control',
  'punto',
  'texto',
  // Hechos operacionales DIVFE.
  'campamento',
  'ied',
  'drug',
  'captura',
  // Puntos de control pedestre.
  'seguridad',
  'insercion',
  'decision',
  'disloque',
  'vigilancia',
  'vigilancia-tiro',
  // Aéreos.
  'pca',
  'zd',
  'ze',
  'rp',
  'ip',
  'coordinacion',
  // Instalaciones y convenciones.
  'base-fac',
  'aeropuerto',
  'antena',
  'lugar',
] as const;

export const LINE_TYPES = ['frente', 'eje', 'ruta', 'zona'] as const;

/** Modificadores del sector 2: movilidad (MFRE tabla 4-6). */
export const MOBILITY_IDS = [
  '',
  'asalto-aereo',
  'aerotransportada',
  'anfibia',
  'fluvial',
  'montana',
  'motorizado',
  'ruedas',
  'orugas',
  'animal',
] as const;

/** Amplificador de unidades reforzadas y reducidas (campo F, tabla 4-11). */
export const REINFORCEMENT_IDS = ['', '+', '-', '±'] as const;

/** Eficacia de combate (campo AL, tabla 4-12). */
export const EFFECTIVENESS_IDS = ['', 'FO', 'BO', 'EO', 'NO'] as const;

/** Presente (marco continuo) o planeada (marco punteado), tabla 3-1. */
export const STATUS_IDS = ['presente', 'planeado'] as const;
