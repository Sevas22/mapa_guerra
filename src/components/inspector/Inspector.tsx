'use client';

import {
  ECHELONS,
  EFFECTIVENESS,
  FACTIONS,
  LINES,
  MOBILITY,
  POINTS,
  REINFORCEMENT,
  UNITS,
  forcesFor,
  plainName,
  usesIconText,
} from '@/domain/catalog';
import { frameAt, hasOwnFrame, visibleAt } from '@/domain/timeline';
import type {
  Effectiveness,
  FactionId,
  MapObject,
  Mobility,
  Phase,
  Reinforcement,
  SymbolStatus,
} from '@/domain/types';
import { currentView } from '@/lib/mapBridge';
import { selectSelected, useEditorStore } from '@/store/editorStore';

const KIND_NAME = { unit: 'Unidad', point: 'Punto', line: 'Trazo' } as const;

function PhaseOptions({ phases, from }: { phases: Phase[]; from: number }) {
  return (
    <>
      {phases.slice(from).map((p, j) => (
        <option key={p.id} value={from + j}>
          {from + j + 1} · {p.title}
        </option>
      ))}
    </>
  );
}

/** Editor de la fase actual y del escenario cuando no hay nada seleccionado. */
function PhaseInspector() {
  const current = useEditorStore((s) => s.current);
  const phases = useEditorStore((s) => s.scenario.phases);
  const name = useEditorStore((s) => s.scenario.name);
  const nVis = useEditorStore(
    (s) => s.scenario.objects.filter((o) => visibleAt(o, s.current)).length,
  );
  const updatePhase = useEditorStore((s) => s.updatePhase);
  const setPhaseView = useEditorStore((s) => s.setPhaseView);
  const setScenarioName = useEditorStore((s) => s.setScenarioName);
  const p = phases[current];
  if (!p) return null;

  return (
    <>
      <section className="sec">
        <h3 className="sec-h big">
          Fase {current + 1} de {phases.length}
        </h3>
        <label className="field">
          Título
          <input
            type="text"
            value={p.title}
            onChange={(e) => updatePhase({ title: e.target.value })}
          />
        </label>
        <label className="field">
          Fecha / hora
          <input
            type="text"
            value={p.date}
            placeholder="12 mar 1998 06:00 · Día 3 · H+2"
            onChange={(e) => updatePhase({ date: e.target.value })}
          />
        </label>
        <label className="field">
          Narración
          <textarea
            value={p.desc}
            placeholder="Qué ocurre en esta fase"
            onChange={(e) => updatePhase({ desc: e.target.value })}
          />
        </label>
        <div className="note">
          Vista de cámara:{' '}
          {p.view ? (
            <span className="font-mono text-xs">
              {p.view.c[0].toFixed(3)}, {p.view.c[1].toFixed(3)} · z{p.view.z}
            </span>
          ) : (
            'sin guardar'
          )}
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => setPhaseView(currentView())}>
            Guardar vista actual
          </button>
          <button
            type="button"
            className="btn"
            disabled={!p.view}
            onClick={() => setPhaseView(null)}
          >
            Quitar
          </button>
        </div>
        <p className="note">
          {nVis} objeto(s) visibles en esta fase. Al reproducir, la cámara viaja a la vista guardada
          de cada fase.
        </p>
      </section>
      <section className="sec">
        <h2 className="sec-h">Escenario</h2>
        <label className="field">
          Nombre
          <input type="text" value={name} onChange={(e) => setScenarioName(e.target.value)} />
        </label>
      </section>
      <section className="sec">
        <h2 className="sec-h">Cómo funciona</h2>
        <p className="note">
          Elige una fase abajo y coloca o arrastra objetos. Mover un objeto guarda su posición para
          esa fase; las fases siguientes la heredan hasta que lo vuelvas a mover. Al reproducir, el
          mapa anima el paso entre posiciones.
        </p>
        <p className="note">
          <kbd>←</kbd> <kbd>→</kbd> cambiar fase · <kbd>Espacio</kbd> reproducir · <kbd>Supr</kbd>{' '}
          borrar · <kbd>Esc</kbd> soltar herramienta
        </p>
      </section>
    </>
  );
}

/** Campo numérico que confirma al salir o con Enter, como `onchange` del prototipo. */
function CoordInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const commit = (raw: string) => {
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v !== value) onCommit(v);
  };
  return (
    <label className="field">
      {label}
      <input
        // La clave reinicia el campo cuando cambia el valor desde fuera (arrastre, fase).
        key={value}
        type="number"
        step="0.0001"
        className="font-mono text-xs"
        defaultValue={value}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value);
        }}
      />
    </label>
  );
}

function PositionSection({ o }: { o: MapObject }) {
  const current = useEditorStore((s) => s.current);
  const setFrame = useEditorStore((s) => s.setFrame);
  const setTool = useEditorStore((s) => s.setTool);
  const vis = visibleAt(o, current);
  const own = hasOwnFrame(o, current);

  if (o.kind === 'line') {
    const f = frameAt(o, current);
    return (
      <>
        <p className="note">
          {f.pts.length} vértices ·{' '}
          {own ? `trazado propio en la fase ${current + 1}` : 'heredado de una fase anterior'}.
        </p>
        <button
          type="button"
          className="btn"
          disabled={!vis}
          onClick={() => setTool({ mode: 'draw', kind: 'line', type: o.type, redrawId: o.id })}
        >
          Redibujar en esta fase
        </button>
      </>
    );
  }

  if (!vis) return <p className="note">No es visible en esta fase.</p>;
  const f = frameAt(o, current);
  return (
    <>
      <div className="row">
        <CoordInput
          label="Latitud"
          value={f.lat}
          onCommit={(lat) => setFrame(o.id, { lat, lng: f.lng })}
        />
        <CoordInput
          label="Longitud"
          value={f.lng}
          onCommit={(lng) => setFrame(o.id, { lat: f.lat, lng })}
        />
      </div>
      <p className="note">
        {own
          ? `Posición propia en la fase ${current + 1}.`
          : 'Hereda la posición de una fase anterior. Arrástralo para moverlo en esta fase.'}
      </p>
    </>
  );
}

/** Campos del MFRE 1-02: fuerza, texto del ícono, escalón y amplificadores. */
function SymbolFieldsEditor({ o }: { o: MapObject }) {
  const update = useEditorStore((s) => s.updateObject);
  const forces = forcesFor(o.faction);
  const textEditable = o.kind !== 'line' && usesIconText(o.kind, o.type);
  const defaultText =
    o.kind === 'unit'
      ? UNITS[o.type]?.iconText
      : o.kind === 'point'
        ? POINTS[o.type]?.iconText
        : '';
  return (
    <>
      {forces.length && o.kind !== 'line' ? (
        <label className="field">
          {o.faction === 'azul' ? 'Fuerza' : 'Estructura'}
          <select value={o.force ?? ''} onChange={(e) => update(o.id, { force: e.target.value })}>
            <option value="">
              {o.faction === 'azul' ? 'Amigo (sin fuerza)' : 'Hostil genérico'}
            </option>
            {forces.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {textEditable ? (
        <label className="field">
          Texto del símbolo
          <input
            type="text"
            value={o.iconText ?? ''}
            placeholder={defaultText || 'Número o sigla'}
            onChange={(e) => update(o.id, { iconText: e.target.value })}
          />
        </label>
      ) : null}
      {o.kind === 'unit' ? (
        <>
          <div className="row">
            <label className="field">
              Escalón
              <select value={o.echelon} onChange={(e) => update(o.id, { echelon: e.target.value })}>
                {ECHELONS.map(([v, n]) => (
                  <option key={v} value={v}>
                    {v ? `${v} · ` : ''}
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Estado
              <select
                value={o.status ?? 'presente'}
                onChange={(e) => update(o.id, { status: e.target.value as SymbolStatus })}
              >
                <option value="presente">Presente</option>
                <option value="planeado">Planeada (punteado)</option>
              </select>
            </label>
          </div>
          <div className="row">
            <label className="field">
              Modificador 1
              <input
                type="text"
                value={o.mod1 ?? ''}
                placeholder="ASLT, SAR, CBT…"
                onChange={(e) => update(o.id, { mod1: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="field">
              Movilidad
              <select
                value={o.mobility ?? ''}
                onChange={(e) => update(o.id, { mobility: e.target.value as Mobility })}
              >
                {MOBILITY.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <label className="field">
              Refuerzo
              <select
                value={o.reinforced ?? ''}
                onChange={(e) => update(o.id, { reinforced: e.target.value as Reinforcement })}
              >
                {REINFORCEMENT.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Eficacia de combate
              <select
                value={o.effectiveness ?? ''}
                onChange={(e) => update(o.id, { effectiveness: e.target.value as Effectiveness })}
              >
                {EFFECTIVENESS.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              className="accent-accent"
              checked={!!o.taskForce}
              onChange={(e) => update(o.id, { taskForce: e.target.checked })}
            />
            Fuerza de tarea o equipo (campo D)
          </label>
        </>
      ) : null}
    </>
  );
}

function ObjectInspector({ o }: { o: MapObject }) {
  const phases = useEditorStore((s) => s.scenario.phases);
  const update = useEditorStore((s) => s.updateObject);
  const duplicate = useEditorStore((s) => s.duplicateSelected);
  const remove = useEditorStore((s) => s.deleteSelected);
  const select = useEditorStore((s) => s.select);
  const types: Record<string, { name: string }> =
    o.kind === 'unit' ? UNITS : o.kind === 'point' ? POINTS : LINES;

  return (
    <>
      <section className="sec">
        <h3 className="sec-h big">{KIND_NAME[o.kind]}</h3>
        <label className="field">
          Etiqueta
          <input
            type="text"
            value={o.label}
            placeholder="BI-1, OBJ Alfa…"
            onChange={(e) => update(o.id, { label: e.target.value })}
          />
        </label>
        <div className="row">
          <label className="field">
            Identidad
            <select
              value={o.faction}
              onChange={(e) => update(o.id, { faction: e.target.value as FactionId })}
            >
              {Object.entries(FACTIONS).map(([k, x]) => (
                <option key={k} value={k}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tipo
            <select
              value={o.type}
              onChange={(e) => update(o.id, { type: e.target.value as MapObject['type'] })}
            >
              {Object.entries(types).map(([k, x]) => (
                <option key={k} value={k}>
                  {plainName(x.name)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <SymbolFieldsEditor o={o} />
        <label className="field">
          Notas
          <textarea
            value={o.notes}
            placeholder="Efectivos, misión, fuente…"
            onChange={(e) => update(o.id, { notes: e.target.value })}
          />
        </label>
      </section>
      <section className="sec">
        <h2 className="sec-h">En la línea de tiempo</h2>
        <div className="row">
          <label className="field">
            Aparece en
            <select
              value={o.start}
              onChange={(e) => update(o.id, { start: Number(e.target.value) })}
            >
              <PhaseOptions phases={phases} from={0} />
            </select>
          </label>
          <label className="field">
            Visible hasta
            <select
              value={o.end ?? ''}
              onChange={(e) =>
                update(o.id, { end: e.target.value === '' ? null : Number(e.target.value) })
              }
            >
              <option value="">El final</option>
              <PhaseOptions phases={phases} from={o.start} />
            </select>
          </label>
        </div>
        <PositionSection o={o} />
      </section>
      <section className="sec">
        <div className="row">
          <button type="button" className="btn" onClick={duplicate}>
            Duplicar
          </button>
          <button type="button" className="btn danger" onClick={remove}>
            Eliminar
          </button>
        </div>
        <button type="button" className="btn" onClick={() => select(null)}>
          Listo
        </button>
      </section>
    </>
  );
}

/** Columna derecha: edita la fase actual o el objeto seleccionado. */
export function Inspector() {
  const o = useEditorStore(selectSelected);
  return o ? <ObjectInspector key={o.id} o={o} /> : <PhaseInspector />;
}
