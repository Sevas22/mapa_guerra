/**
 * Fichas que se colocan en el mapa: perfiles de operación y grafos de vínculos. Devuelven
 * el mismo `IconSpec` que los símbolos, así que sirven en Leaflet (2D) y MapLibre (3D).
 */
import { profileMap, renderChartSVG, type LinkChart } from './linkChart';
import { ROLE_DEFS, ROLE_ORDER, SOURCE_DEFS, profileTitle, type Profile } from './profiles';
import { iconSpecFor, type IconSpec } from './symbols';
import type { MapObject, PointObject } from './types';

export interface DocContext {
  profiles?: Profile[];
  charts?: LinkChart[];
}

export const isDocPoint = (o: MapObject): o is PointObject =>
  o.kind === 'point' && (o.type === 'perfil' || o.type === 'grafo');

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );

export const PROFILE_CARD = { single: 300, row: 46, header: 28, singleBody: 124 } as const;

const photoHtml = (p: Profile, w: number, h: number) =>
  p.foto
    ? `<img src="${esc(p.foto)}" alt="" style="width:${w}px;height:${h}px">`
    : `<span class="pc-nofoto" style="width:${w}px;height:${h}px"><svg viewBox="-25 -25 50 50" width="${w * 0.7}" height="${h * 0.7}"><circle cy="-6" r="8" fill="currentColor"/><path d="M-16 16Q-15 2 0 2.5Q15 2 16 16Z" fill="currentColor"/></svg></span>`;

const roleTag = (p: Profile) => {
  const color =
    p.rol === 'fuente' && p.fuente ? SOURCE_DEFS[p.fuente].color : ROLE_DEFS[p.rol].color;
  const name = p.rol === 'fuente' && p.fuente ? SOURCE_DEFS[p.fuente].name : ROLE_DEFS[p.rol].name;
  return `<span class="pc-tag" style="--tag:${color}">${esc(name)}</span>`;
};

const field = (k: string, v: string) =>
  v ? `<div class="pc-f"><b>${esc(k)}</b> ${esc(v)}</div>` : '';

/** Perfiles de la ficha en el orden guardado (los que ya no existen se omiten). */
export function cardProfiles(o: PointObject, profiles: readonly Profile[] = []): Profile[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return (o.profileIds ?? []).flatMap((id) => {
    const p = byId.get(id);
    return p ? [p] : [];
  });
}

/** Ficha de perfiles: completa si es una persona, en lista si son varias. */
export function profileCardSpec(o: PointObject, ctx: DocContext, selected: boolean): IconSpec {
  const list = cardProfiles(o, ctx.profiles);
  const sel = selected ? ' sel' : '';
  const title = o.label || (list.length === 1 ? 'Perfil' : 'Perfiles de operación');
  const { header, row, singleBody } = PROFILE_CARD;
  let body: string;
  let w = o.cardWidth ?? PROFILE_CARD.single;
  let h: number;
  if (list.length === 1) {
    const p = list[0]!;
    h = header + singleBody;
    body = `<div class="pc-one">${photoHtml(p, 84, 104)}<div class="pc-data">${roleTag(p)}<div class="pc-name">${esc(profileTitle(p))}</div>${field('Grado', p.grado)}${field('Cargo', p.cargo)}${field('Org.', p.organizacion)}${field('Estructura', p.estructura)}${field('Ubicación', p.ubicacion)}${field('Tel.', p.telefono)}${field('Doc.', p.documento)}</div></div>`;
  } else if (list.length) {
    const sorted = [...list].sort((a, b) => ROLE_ORDER[a.rol] - ROLE_ORDER[b.rol]);
    const cols = sorted.length > 8 ? 2 : 1;
    w = o.cardWidth ?? (cols === 2 ? 520 : PROFILE_CARD.single);
    const rows = Math.ceil(sorted.length / cols);
    h = header + rows * row + 6;
    body = `<div class="pc-list" style="grid-template-columns:repeat(${cols},1fr)">${sorted
      .map(
        (p) =>
          `<div class="pc-row" style="--tag:${p.rol === 'fuente' && p.fuente ? SOURCE_DEFS[p.fuente].color : ROLE_DEFS[p.rol].color}">${photoHtml(p, 32, 38)}<div class="pc-data"><div class="pc-name">${esc(profileTitle(p))}</div><div class="pc-f">${esc([p.grado, p.cargo].filter(Boolean).join(' · ') || ROLE_DEFS[p.rol].name)}</div></div></div>`,
      )
      .join('')}</div>`;
  } else {
    h = header + 40;
    body = '<div class="pc-empty">Sin perfiles. Elígelos en el inspector.</div>';
  }
  return {
    className: 'symwrap',
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
    html: `<div class="doccard pcard${sel}" style="width:${w}px;height:${h}px"><div class="pc-h">${esc(title)}<span>${list.length || ''}</span></div>${body}</div>`,
  };
}

/** Ficha con el grafo de vínculos dibujado. */
export function chartCardSpec(o: PointObject, ctx: DocContext, selected: boolean): IconSpec {
  const chart = ctx.charts?.find((c) => c.id === o.chartId);
  const sel = selected ? ' sel' : '';
  const w = o.cardWidth ?? 460;
  if (!chart) {
    return {
      className: 'symwrap',
      iconSize: [w, 60],
      iconAnchor: [w / 2, 30],
      html: `<div class="doccard${sel}" style="width:${w}px;height:60px"><div class="pc-empty">Grafo no disponible. Elige uno en el inspector.</div></div>`,
    };
  }
  const svg = renderChartSVG(chart, profileMap(ctx.profiles), { width: w });
  const m = /height="(\d+)"/.exec(svg.slice(0, 400));
  const h = m ? Number(m[1]) : w;
  return {
    className: 'symwrap',
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
    html: `<div class="doccard gcard${sel}" style="width:${w}px;height:${h}px">${svg}</div>`,
  };
}

/** Símbolo de cualquier unidad o punto, incluidas las fichas. */
export function markerSpecFor(
  o: Extract<MapObject, { kind: 'unit' | 'point' }>,
  selected: boolean,
  ctx: DocContext,
): IconSpec {
  if (o.kind === 'point' && o.type === 'perfil') return profileCardSpec(o, ctx, selected);
  if (o.kind === 'point' && o.type === 'grafo') return chartCardSpec(o, ctx, selected);
  return iconSpecFor(o, selected);
}
