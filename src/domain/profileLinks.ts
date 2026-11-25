/**
 * Puente entre los perfiles de operación y los grafos de vínculos: en qué grafos aparece
 * cada perfil y con quién está unido, y fichas nuevas a partir de lo que se dibuja en el
 * grafo (para que ambas herramientas trabajen sobre las mismas personas).
 */
import {
  insideGroup,
  nodeText,
  type ChartNode,
  type EdgeKind,
  type LinkChart,
  type NodeKind,
} from './linkChart';
import { newProfile, type Profile, type ProfileRole } from './profiles';

export interface ProfileLink {
  /** Nodo o cuadro del otro extremo. */
  id: string;
  label: string;
  /** Tipo de vínculo legible («confirmado», «integra la estructura»…). */
  kind: string;
  /** Perfil del otro extremo, si tiene. */
  profileId?: string;
}

export interface ProfileAppearance {
  chartId: string;
  chartTitle: string;
  nodeId: string;
  links: ProfileLink[];
}

/** Clases de nodo que representan personas (las que pueden tener ficha). */
const PERSON_KINDS: Partial<Record<NodeKind, ProfileRole>> = {
  amenaza: 'amenaza',
  persona: 'persona',
  fuente: 'fuente',
  propio: 'propio',
};

/** Nombre corto del vínculo para las etiquetas de la ficha. */
export const LINK_SHORT: Record<EdgeKind, string> = {
  confirmado: 'confirmado',
  'por-confirmar': 'por confirmar',
  'fuente-confirmado': 'fuente, confirmado',
  'fuente-por-confirmar': 'fuente, por confirmar',
};

export const isPersonNode = (n: ChartNode) => n.kind in PERSON_KINDS;

/** Grafos donde aparece un perfil, con sus vínculos y las estructuras que integra. */
export function profileAppearances(
  profileId: string,
  charts: readonly LinkChart[],
  profiles: ReadonlyMap<string, Profile>,
): ProfileAppearance[] {
  const out: ProfileAppearance[] = [];
  for (const c of charts) {
    for (const n of c.nodes) {
      if (n.profileId !== profileId) continue;
      const links: ProfileLink[] = [];
      for (const e of c.edges) {
        const other = e.from === n.id ? e.to : e.to === n.id ? e.from : null;
        if (!other) continue;
        const on = c.nodes.find((x) => x.id === other);
        const og = on ? undefined : c.groups.find((g) => g.id === other);
        if (!on && !og) continue;
        links.push({
          id: other,
          label: on ? nodeText(on, profiles).label || 'Sin rótulo' : og!.title || 'Estructura',
          kind: LINK_SHORT[e.kind],
          ...(on?.profileId ? { profileId: on.profileId } : {}),
        });
      }
      for (const g of c.groups)
        if (insideGroup(n, g) && !links.some((l) => l.id === g.id))
          links.push({ id: g.id, label: g.title || 'Estructura', kind: 'integra la estructura' });
      out.push({ chartId: c.id, chartTitle: c.title || 'Sin título', nodeId: n.id, links });
    }
  }
  return out;
}

/** Cuántos grafos usa cada perfil (para la lista de fichas). */
export function chartCountByProfile(charts: readonly LinkChart[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of charts) {
    const ids = new Set(c.nodes.flatMap((n) => (n.profileId ? [n.profileId] : [])));
    for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

/** Personas dibujadas en el grafo que todavía no tienen ficha. */
export function nodesWithoutProfile(
  c: LinkChart,
  profiles: ReadonlyMap<string, Profile>,
): ChartNode[] {
  return c.nodes.filter((n) => isPersonNode(n) && !(n.profileId && profiles.has(n.profileId)));
}

/** Ficha nueva con lo que el nodo ya dice: alias o nombre, cargo, estructura y foto. */
export function profileFromNode(c: LinkChart, n: ChartNode): Profile {
  const label = n.label.replace(/\s+/g, ' ').trim();
  const alias = /^a\.\s*/i.test(label) ? label.replace(/^a\.\s*/i, '') : '';
  const group = c.groups.find((g) => insideGroup(n, g) && g.title);
  const rol = PERSON_KINDS[n.kind] ?? 'persona';
  return newProfile({
    rol,
    nombre: alias ? '' : label,
    alias,
    cargo: n.sub,
    estructura: group?.title ?? '',
    ...(rol === 'fuente' ? { fuente: n.source ?? 'estudio' } : {}),
    ...(n.photo ? { foto: n.photo } : {}),
  });
}

/**
 * Crea fichas para las personas del grafo que no tienen y las enlaza a sus nodos. El rótulo
 * y la foto del nodo pasan a la ficha (el nodo los toma de ella desde entonces).
 */
export function syncChartProfiles(
  c: LinkChart,
  profiles: ReadonlyMap<string, Profile>,
  only?: string,
): { chart: LinkChart; created: Profile[] } {
  const todo = nodesWithoutProfile(c, profiles).filter((n) => !only || n.id === only);
  if (!todo.length) return { chart: c, created: [] };
  const made = new Map(todo.map((n) => [n.id, profileFromNode(c, n)]));
  const nodes = c.nodes.map((n) => {
    const p = made.get(n.id);
    return p ? { ...n, profileId: p.id, label: '', sub: '', photo: undefined } : n;
  });
  return { chart: { ...c, nodes }, created: [...made.values()] };
}
