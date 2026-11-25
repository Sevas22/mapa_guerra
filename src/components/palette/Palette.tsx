'use client';

import { useMemo, useState } from 'react';
import {
  FACTIONS,
  LINES,
  POINTS,
  UNITS,
  forcesFor,
  plainName,
  type LineDef,
  type LineGroup,
  type PointDef,
  type PointGroup,
  type UnitDef,
  type UnitGroup,
} from '@/domain/catalog';
import { pointOpts, pointSVG, previewLine, textPreviewSVG, unitSVG } from '@/domain/symbols';
import type { FactionId, LineType, PointType, UnitType } from '@/domain/types';
import { useEditorStore, type Tool } from '@/store/editorStore';

const UNIT_GROUPS: UnitGroup[] = [
  'Armas y servicios',
  'Unidades especiales',
  'Otras fuerzas y GAO',
];
const POINT_GROUPS: PointGroup[] = [
  'Objetivos y hechos',
  'Puntos de control',
  'Aéreos',
  'Instalaciones y lugares',
];

type Category = 'unidades' | 'puntos' | 'trazos' | 'tareas';

const CATEGORIES: { id: Category; name: string; groups: (UnitGroup | PointGroup | LineGroup)[] }[] =
  [
    { id: 'unidades', name: 'Unidades', groups: UNIT_GROUPS },
    { id: 'puntos', name: 'Puntos', groups: POINT_GROUPS },
    { id: 'trazos', name: 'Trazos y áreas', groups: ['Trazos', 'Áreas'] },
    { id: 'tareas', name: 'Tareas', groups: ['Tareas tácticas', 'Facilitadoras y retrógradas'] },
  ];

type ToolSpec =
  | { kind: 'unit'; type: UnitType }
  | { kind: 'point'; type: PointType }
  | { kind: 'line'; type: LineType };

interface Entry {
  spec: ToolSpec;
  name: string;
  group: string;
}

/** Todos los símbolos del catálogo, en el orden de la paleta. */
const ENTRIES: Entry[] = [
  ...(Object.entries(UNITS) as [UnitType, UnitDef][]).map(([type, u]) => ({
    spec: { kind: 'unit' as const, type },
    name: u.name,
    group: u.group,
  })),
  ...(Object.entries(POINTS) as [PointType, PointDef][]).map(([type, p]) => ({
    spec: { kind: 'point' as const, type },
    name: p.name,
    group: p.group,
  })),
  ...(Object.entries(LINES) as [LineType, LineDef][]).map(([type, l]) => ({
    spec: { kind: 'line' as const, type },
    name: l.name,
    group: l.group,
  })),
];

const fold = (s: string) => plainName(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const isActive = (tool: Tool, spec: ToolSpec) =>
  tool.mode !== 'select' && tool.kind === spec.kind && tool.type === spec.type;

const toToolMode = (spec: ToolSpec): Tool =>
  spec.kind === 'line'
    ? { mode: 'draw', kind: 'line', type: spec.type }
    : spec.kind === 'unit'
      ? { mode: 'place', kind: 'unit', type: spec.type }
      : { mode: 'place', kind: 'point', type: spec.type };

/** SVG generado por `domain/symbols` (cadenas propias, con el texto escapado). */
function Svg({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Vista previa del símbolo con el bando y la fuerza elegidos. */
function Icon({ spec, faction, force }: { spec: ToolSpec; faction: FactionId; force: string }) {
  const c = FACTIONS[faction].vivid;
  if (spec.kind === 'unit')
    return <Svg html={unitSVG({ type: spec.type, faction, force }, [42, 45])} />;
  if (spec.kind === 'line') return <Svg html={previewLine(spec.type, c)} />;
  if (spec.type === 'texto') return <Svg html={textPreviewSVG(c)} />;
  return (
    <Svg
      html={pointSVG(spec.type, pointOpts({ type: spec.type, faction, force }))}
      className="grid h-[34px] place-items-center"
    />
  );
}

function ToolButton({ e, faction, force }: { e: Entry; faction: FactionId; force: string }) {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const active = isActive(tool, e.spec);
  return (
    <button
      type="button"
      className="tool"
      title={plainName(e.name)}
      aria-pressed={active}
      onClick={() => setTool(active ? { mode: 'select' } : toToolMode(e.spec))}
    >
      <Icon spec={e.spec} faction={faction} force={force} />
      <span>{e.name}</span>
    </button>
  );
}

function Grid({ items, faction, force }: { items: Entry[]; faction: FactionId; force: string }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((e) => (
        <ToolButton key={`${e.spec.kind}:${e.spec.type}`} e={e} faction={faction} force={force} />
      ))}
    </div>
  );
}

/** Columna izquierda: bando, buscador y símbolos por categoría. */
export function Palette() {
  const faction = useEditorStore((s) => s.faction);
  const setFaction = useEditorStore((s) => s.setFaction);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const force = useEditorStore((s) => s.force);
  const setForce = useEditorStore((s) => s.setForce);
  const forces = forcesFor(faction);
  const [cat, setCat] = useState<Category>('unidades');
  const [query, setQuery] = useState('');

  const found = useMemo(() => {
    const q = fold(query.trim());
    return q ? ENTRIES.filter((e) => fold(`${e.name} ${e.group}`).includes(q)) : null;
  }, [query]);
  const current = CATEGORIES.find((x) => x.id === cat)!;
  // Categoría del símbolo activo, para marcarla aunque se esté viendo otra.
  const activeGroup =
    tool.mode === 'select'
      ? null
      : ENTRIES.find((e) => e.spec.kind === tool.kind && e.spec.type === tool.type)?.group;
  const activeCat = CATEGORIES.find((x) => x.groups.some((g) => g === activeGroup))?.id;

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 grid gap-2.5 border-b border-line bg-panel p-3">
        <div className="pal-side" role="radiogroup" aria-label="Bando de los símbolos">
          {(Object.entries(FACTIONS) as [FactionId, (typeof FACTIONS)[FactionId]][]).map(
            ([k, f]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={k === faction}
                onClick={() => setFaction(k)}
                style={{ '--side': f.fill } as React.CSSProperties}
              >
                <i aria-hidden="true" />
                {f.name}
              </button>
            ),
          )}
        </div>
        {forces.length ? (
          <select
            aria-label={faction === 'azul' ? 'Fuerza' : 'Estructura'}
            value={force}
            onChange={(e) => setForce(e.target.value)}
          >
            <option value="">
              {faction === 'azul' ? 'Amigo (sin fuerza)' : 'Hostil genérico'}
            </option>
            {forces.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="search"
          className="pal-search"
          placeholder="Buscar símbolo…"
          aria-label="Buscar símbolo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('');
          }}
        />
        <button
          type="button"
          aria-pressed={tool.mode === 'select'}
          className="pal-select"
          onClick={() => setTool({ mode: 'select' })}
        >
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M3 2l9 5.2-4 .9 2.3 4.4-1.7.9L6.3 9 3.4 11.6z" fill="currentColor" />
          </svg>
          Seleccionar y mover
          <kbd>V</kbd>
        </button>
      </div>

      {found ? (
        <section className="sec">
          <h2 className="sec-h">
            {found.length
              ? `${found.length} símbolo${found.length > 1 ? 's' : ''} con «${query.trim()}»`
              : `Ningún símbolo tiene «${query.trim()}». Prueba con otra palabra.`}
          </h2>
          <Grid items={found} faction={faction} force={force} />
        </section>
      ) : (
        <>
          <div className="pal-tabs" role="tablist" aria-label="Categorías de símbolos">
            {CATEGORIES.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={x.id === cat}
                data-active={x.id === activeCat ? '' : undefined}
                onClick={() => setCat(x.id)}
              >
                {x.name}
              </button>
            ))}
          </div>
          {current.groups.map((g) => (
            <section key={g} className="sec">
              <h2 className="sec-h">{g}</h2>
              {g === 'Tareas tácticas' ? (
                <p className="note">
                  Dos clics: desde la unidad hacia el objetivo (en las circulares, centro y borde).
                </p>
              ) : null}
              <Grid items={ENTRIES.filter((e) => e.group === g)} faction={faction} force={force} />
            </section>
          ))}
        </>
      )}
    </div>
  );
}
