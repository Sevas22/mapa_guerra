'use client';

import {
  FACTIONS,
  LINES,
  POINTS,
  UNITS,
  forcesFor,
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
import { useWorkspace, type WorkspaceId } from '@/store/workspaceStore';
import { GotoCoords } from './GotoCoords';

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

const LINE_GROUPS: LineGroup[] = [
  'Trazos',
  'Áreas',
  'Tareas tácticas',
  'Facilitadoras y retrógradas',
];

type ToolSpec =
  | { kind: 'unit'; type: UnitType }
  | { kind: 'point'; type: PointType }
  | { kind: 'line'; type: LineType };

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

function ToolButton({ spec, name, icon }: { spec: ToolSpec; name: string; icon: React.ReactNode }) {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const active = isActive(tool, spec);
  return (
    <button
      type="button"
      className="tool"
      title={name.replaceAll('­', '')}
      aria-pressed={active}
      onClick={() => setTool(active ? { mode: 'select' } : toToolMode(spec))}
    >
      {icon}
      <span>{name}</span>
    </button>
  );
}

const WORKSPACES: { id: WorkspaceId; name: string; desc: string; icon: string }[] = [
  {
    id: 'models',
    name: 'Taller 3D',
    desc: 'Modela aviones, helicópteros y drones y velos volar en 3D',
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v18M4 11l8 2 8-2M8 19l4-1 4 1"/></svg>',
  },
  {
    id: 'profiles',
    name: 'Perfiles de operación',
    desc: 'Fichas de las personas relacionadas con la operación',
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.6-2 2-3 3.5-3s2.9 1 3.5 3M14 9h4M14 13h4"/></svg>',
  },
  {
    id: 'charts',
    name: 'Grafos de vínculos',
    desc: 'Redes de la amenaza, estructuras, fuentes y convenciones',
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l4 4-4 4-4-4z" fill="currentColor" fill-opacity=".35"/><rect x="2.5" y="15" width="7" height="6"/><circle cx="18" cy="18" r="3"/><path d="M12 11v2H6v2M12 13h6v2"/></svg>',
  },
];

/** Accesos a las áreas de trabajo a pantalla completa. */
function WorkspaceButtons() {
  const show = useWorkspace((s) => s.show);
  return (
    <section className="sec">
      <h2 className="sec-h">Herramientas</h2>
      <div className="grid gap-1.5">
        {WORKSPACES.map((w) => (
          <button
            key={w.id}
            type="button"
            title={w.desc}
            className="flex min-w-0 items-center gap-2 overflow-hidden rounded border border-line bg-bg px-2 py-1.5 text-left hover:border-muted"
            onClick={() => show(w.id)}
          >
            <span className="text-accent" dangerouslySetInnerHTML={{ __html: w.icon }} />
            <span className="min-w-0">
              <span className="block text-[13px] text-fg">{w.name}</span>
              <span className="block truncate text-[11px] text-muted">{w.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Columna izquierda: coordenadas, bando y herramientas. */
export function Palette() {
  const faction = useEditorStore((s) => s.faction);
  const setFaction = useEditorStore((s) => s.setFaction);
  const isSelect = useEditorStore((s) => s.tool.mode === 'select');
  const setTool = useEditorStore((s) => s.setTool);
  const force = useEditorStore((s) => s.force);
  const setForce = useEditorStore((s) => s.setForce);
  const forces = forcesFor(faction);
  const c = FACTIONS[faction].vivid;

  return (
    <>
      <GotoCoords />
      <WorkspaceButtons />
      <section className="sec">
        <h2 className="sec-h">Identidad</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.entries(FACTIONS) as [FactionId, (typeof FACTIONS)[FactionId]][]).map(
            ([k, f]) => (
              <button
                key={k}
                type="button"
                aria-pressed={k === faction}
                onClick={() => setFaction(k)}
                className="flex items-center gap-[7px] rounded border border-line bg-bg px-2 py-1.5 text-left text-xs aria-pressed:border-accent aria-pressed:bg-panel-2"
              >
                <i className="size-3 flex-none rounded-[2px]" style={{ background: f.fill }} />
                {f.name}
              </button>
            ),
          )}
        </div>
        {forces.length ? (
          <label className="field">
            {faction === 'azul' ? 'Fuerza' : 'Estructura'}
            <select value={force} onChange={(e) => setForce(e.target.value)}>
              <option value="">
                {faction === 'azul' ? 'Amigo (sin fuerza)' : 'Hostil genérico'}
              </option>
              {forces.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>
      <section className="sec">
        <button
          type="button"
          className={`btn justify-between! ${isSelect ? 'primary' : ''}`}
          onClick={() => setTool({ mode: 'select' })}
        >
          Seleccionar y mover <kbd>V</kbd>
        </button>
      </section>
      {UNIT_GROUPS.map((g) => (
        <section key={g} className="sec">
          <h2 className="sec-h">{g}</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(UNITS) as [UnitType, UnitDef][])
              .filter(([, u]) => u.group === g)
              .map(([k, u]) => (
                <ToolButton
                  key={k}
                  spec={{ kind: 'unit', type: k }}
                  name={u.name}
                  icon={<Svg html={unitSVG({ type: k, faction, force }, [42, 45])} />}
                />
              ))}
          </div>
        </section>
      ))}
      {POINT_GROUPS.map((g) => (
        <section key={g} className="sec">
          <h2 className="sec-h">{g}</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(POINTS) as [PointType, PointDef][])
              .filter(([, p]) => p.group === g)
              .map(([k, p]) => (
                <ToolButton
                  key={k}
                  spec={{ kind: 'point', type: k }}
                  name={p.name}
                  icon={
                    k === 'texto' ? (
                      <Svg html={textPreviewSVG(c)} />
                    ) : (
                      <Svg
                        html={pointSVG(k, pointOpts({ type: k, faction, force }))}
                        className="grid h-[34px] place-items-center"
                      />
                    )
                  }
                />
              ))}
          </div>
        </section>
      ))}
      {LINE_GROUPS.map((g) => (
        <section key={g} className="sec">
          <h2 className="sec-h">{g}</h2>
          {g === 'Tareas tácticas' ? (
            <p className="note">
              Dos clics: desde la unidad hacia el objetivo (en las circulares, centro y borde).
            </p>
          ) : null}
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(LINES) as [LineType, LineDef][])
              .filter(([, l]) => l.group === g)
              .map(([k, l]) => (
                <ToolButton
                  key={k}
                  spec={{ kind: 'line', type: k }}
                  name={l.name}
                  icon={<Svg html={previewLine(k, c)} />}
                />
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
