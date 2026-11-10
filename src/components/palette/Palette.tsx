'use client';

import {
  FACTIONS,
  LINES,
  POINTS,
  UNITS,
  forcesFor,
  type PointDef,
  type PointGroup,
  type UnitDef,
  type UnitGroup,
} from '@/domain/catalog';
import { pointOpts, pointSVG, previewLine, textPreviewSVG, unitSVG } from '@/domain/symbols';
import type { FactionId, LineType, PointType, UnitType } from '@/domain/types';
import { useEditorStore, type Tool } from '@/store/editorStore';
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
      <section className="sec">
        <h2 className="sec-h">Trazos</h2>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.entries(LINES) as [LineType, { name: string }][]).map(([k, l]) => (
            <ToolButton
              key={k}
              spec={{ kind: 'line', type: k }}
              name={l.name}
              icon={<Svg html={previewLine(k, c)} />}
            />
          ))}
        </div>
      </section>
    </>
  );
}
