'use client';

import { useMemo } from 'react';
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
import {
  KM_PER_NM,
  TRAVEL_DEFS,
  forceSummary,
  hasTravel,
  pathKm,
  travelSpeed,
  travelSummary,
} from '@/domain/travel';
import type {
  Effectiveness,
  FactionId,
  MapObject,
  Mobility,
  Phase,
  Reinforcement,
  SymbolStatus,
  TravelMode,
} from '@/domain/types';
import { isDocPoint } from '@/domain/docCards';
import { BASE_DEFS, DEFAULT_ALTITUDE, domainOf } from '@/domain/models3d';
import { ROLE_DEFS, ROLE_ORDER, profileTitle } from '@/domain/profiles';
import { useWorkspace } from '@/store/workspaceStore';
import { MediaEditor } from '../media/Media';
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

/** Unidades y efectivos (PAX) visibles en la fase actual, por identidad. */
function ForceSummarySection() {
  const scenario = useEditorStore((s) => s.scenario);
  const current = useEditorStore((s) => s.current);
  const rows = useMemo(() => forceSummary(scenario, current), [scenario, current]);
  if (!rows.length) return null;
  return (
    <section className="sec">
      <h2 className="sec-h">Fuerza en esta fase</h2>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.faction} className="border-b border-line last:border-0">
              <td className="py-1">
                <i
                  className="mr-1.5 inline-block size-2.5 rounded-[2px] align-middle"
                  style={{ background: FACTIONS[r.faction].fill }}
                />
                {FACTIONS[r.faction].name}
              </td>
              <td className="py-1 text-right font-mono">{r.units} und.</td>
              <td className="py-1 text-right font-mono">{r.pax ? `${r.pax} PAX` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">Los PAX salen de la ficha de cada unidad.</p>
    </section>
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
        <h2 className="sec-h">Imágenes y videos de la fase</h2>
        <p className="note">Se muestran junto a la narración y se abren a pantalla completa.</p>
        <MediaEditor media={p.media} onChange={(media) => updatePhase({ media })} />
      </section>
      <ForceSummarySection />
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

/** Ficha de efectivos, medios y misión (unidades y puntos). */
function CardSection({ o }: { o: MapObject }) {
  const update = useEditorStore((s) => s.updateObject);
  if (o.kind === 'line') return null;
  const card = o.card ?? {};
  const set = (patch: Partial<typeof card>) => update(o.id, { card: { ...card, ...patch } });
  return (
    <section className="sec">
      <h2 className="sec-h">Ficha</h2>
      <div className="row">
        <label className="field">
          Efectivos (PAX)
          <input
            type="number"
            min={0}
            step={1}
            value={card.pax ?? ''}
            onChange={(e) =>
              set({
                pax: e.target.value === '' ? undefined : Math.max(0, Math.round(+e.target.value)),
              })
            }
          />
        </label>
        <label className="field">
          Medios
          <input
            type="text"
            value={card.medios ?? ''}
            placeholder="02 UH-60, 01 AH-60…"
            onChange={(e) => set({ medios: e.target.value || undefined })}
          />
        </label>
      </div>
      <label className="field">
        Misión
        <textarea
          value={card.mision ?? ''}
          placeholder="Tarea asignada en la operación"
          onChange={(e) => set({ mision: e.target.value || undefined })}
        />
      </label>
    </section>
  );
}

/** Distancia del trazo y tiempo estimado según el medio de desplazamiento. */
function TravelSection({ o }: { o: Extract<MapObject, { kind: 'line' }> }) {
  const current = useEditorStore((s) => s.current);
  const update = useEditorStore((s) => s.updateObject);
  if (!hasTravel(o.type)) return null;
  const pts = frameAt(o, current).pts;
  const km = pathKm(pts);
  const t = o.travel;
  return (
    <>
      <div className="row">
        <label className="field">
          Desplazamiento
          <select
            value={t?.mode ?? ''}
            onChange={(e) =>
              update(o.id, {
                travel: e.target.value ? { mode: e.target.value as TravelMode } : undefined,
              })
            }
          >
            <option value="">Sin calcular tiempo</option>
            {(Object.entries(TRAVEL_DEFS) as [TravelMode, { name: string }][]).map(([k, d]) => (
              <option key={k} value={k}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        {t ? (
          <label className="field">
            Velocidad (km/h)
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={t.speed ?? TRAVEL_DEFS[t.mode].speed}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) update(o.id, { travel: { ...t, speed: v } });
              }}
            />
          </label>
        ) : null}
      </div>
      <p className="note">
        <span className="font-mono text-fg">{travelSummary(pts, t)}</span>
        {t ? ` a ${travelSpeed(t)} km/h` : ` · ${(km / KM_PER_NM).toFixed(1).replace('.', ',')} MN`}
        . Se muestra junto a la etiqueta en el mapa.
      </p>
    </>
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

/** Modelo 3D de una unidad (aeronave, vehículo, embarcación o tropa) y su altura de vuelo. */
function ModelSection({ o }: { o: Extract<MapObject, { kind: 'unit' }> }) {
  const models = useEditorStore((s) => s.scenario.models);
  const update = useEditorStore((s) => s.updateObject);
  const show = useWorkspace((s) => s.show);
  const current = useEditorStore((s) => s.current);
  const setFrame = useEditorStore((s) => s.setFrame);
  const m = models?.find((x) => x.id === o.model3d);
  const frameAlt = hasOwnFrame(o, current) ? o.frames[current]?.alt : undefined;
  return (
    <section className="sec">
      <h2 className="sec-h">Modelo 3D</h2>
      <label className="field">
        Equipo o tropa
        <select
          value={o.model3d ?? ''}
          onChange={(e) => {
            const id = e.target.value;
            const next = models?.find((x) => x.id === id);
            update(
              o.id,
              next
                ? { model3d: id, altitude: o.altitude ?? DEFAULT_ALTITUDE[next.base] }
                : { model3d: undefined },
            );
          }}
        >
          <option value="">Sin modelo</option>
          {models?.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {BASE_DEFS[x.base].name}
            </option>
          ))}
        </select>
      </label>
      {m && domainOf(m.base) === 'aire' ? (
        <div className="row">
          <label className="field">
            Altura general (m)
            <input
              type="number"
              min={0}
              max={20000}
              step={10}
              value={o.altitude ?? 0}
              onChange={(e) => update(o.id, { altitude: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label className="field" title="Vacío = altura general. 0 = posado en tierra.">
            En esta fase (m)
            <input
              type="number"
              min={0}
              max={20000}
              step={10}
              placeholder={String(o.altitude ?? 0)}
              value={frameAlt ?? ''}
              onChange={(e) => {
                const f = frameAt(o, current);
                const v = e.target.value;
                setFrame(o.id, {
                  lat: f.lat,
                  lng: f.lng,
                  alt: v === '' ? undefined : Math.max(0, Number(v) || 0),
                });
              }}
            />
          </label>
        </div>
      ) : null}
      <button type="button" className="btn" onClick={() => show('models', o.model3d ?? null)}>
        {m ? 'Editar en el taller 3D' : 'Abrir el taller 3D'}
      </button>
      {m ? (
        <p className="note mt-1.5">
          {domainOf(m.base) === 'aire'
            ? 'Se ve volando en la vista 3D, orientado según su recorrido.'
            : domainOf(m.base) === 'mar'
              ? 'Se ve a flote en la vista 3D, orientado según su recorrido.'
              : 'Se ve sobre el relieve en la vista 3D, orientado según su recorrido.'}
        </p>
      ) : null}
    </section>
  );
}

/** Contenido de una ficha de perfiles o de grafo colocada en el mapa. */
function DocSection({ o }: { o: Extract<MapObject, { kind: 'point' }> }) {
  const profiles = useEditorStore((s) => s.scenario.profiles);
  const charts = useEditorStore((s) => s.scenario.charts);
  const update = useEditorStore((s) => s.updateObject);
  const show = useWorkspace((s) => s.show);
  const ids = o.profileIds ?? [];
  const sorted = useMemo(
    () => [...(profiles ?? [])].sort((a, b) => ROLE_ORDER[a.rol] - ROLE_ORDER[b.rol]),
    [profiles],
  );
  const width = o.cardWidth ?? (o.type === 'grafo' ? 460 : ids.length > 8 ? 520 : 300);
  return (
    <section className="sec">
      <h2 className="sec-h">{o.type === 'grafo' ? 'Grafo de vínculos' : 'Perfiles de la ficha'}</h2>
      {o.type === 'grafo' ? (
        <>
          <label className="field">
            Grafo
            <select
              value={o.chartId ?? ''}
              onChange={(e) => update(o.id, { chartId: e.target.value })}
            >
              <option value="">Ninguno</option>
              {charts?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || 'Sin título'}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={() => show('charts', o.chartId ?? null)}>
            Editar el grafo
          </button>
        </>
      ) : (
        <>
          {sorted.length ? (
            <ul className="mb-2 max-h-[220px] overflow-auto rounded border border-line bg-bg">
              {sorted.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 px-2 py-1 text-[13px]">
                    <input
                      type="checkbox"
                      className="w-auto!"
                      checked={ids.includes(p.id)}
                      onChange={() =>
                        update(o.id, {
                          profileIds: ids.includes(p.id)
                            ? ids.filter((x) => x !== p.id)
                            : [...ids, p.id],
                        })
                      }
                    />
                    <i
                      className="inline-block size-2 flex-none rounded-full"
                      style={{ background: ROLE_DEFS[p.rol].color }}
                    />
                    <span className="truncate">{profileTitle(p)}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">Aún no hay perfiles en el escenario.</p>
          )}
          <button type="button" className="btn" onClick={() => show('profiles', ids[0] ?? null)}>
            Abrir perfiles de operación
          </button>
        </>
      )}
      <label className="field mt-2">
        <span className="flex justify-between">
          Ancho de la ficha <span className="font-mono text-fg">{width} px</span>
        </span>
        <input
          type="range"
          min={180}
          max={1200}
          step={10}
          value={width}
          onChange={(e) => update(o.id, { cardWidth: Number(e.target.value) })}
        />
      </label>
    </section>
  );
}

function ObjectInspector({ o }: { o: MapObject }) {
  const phases = useEditorStore((s) => s.scenario.phases);
  const update = useEditorStore((s) => s.updateObject);
  const duplicate = useEditorStore((s) => s.duplicateSelected);
  const remove = useEditorStore((s) => s.deleteSelected);
  const select = useEditorStore((s) => s.select);
  const isDoc = isDocPoint(o);
  const allTypes: Record<string, { name: string; group?: string }> =
    o.kind === 'unit' ? UNITS : o.kind === 'point' ? POINTS : LINES;
  // Las fichas no se convierten en símbolos ni al revés.
  const types = Object.fromEntries(
    Object.entries(allTypes).filter(([k, x]) => (isDoc ? k === o.type : x.group !== 'Fichas')),
  );

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
        {isDoc ? null : <SymbolFieldsEditor o={o} />}
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
        {o.kind === 'line' ? <TravelSection o={o} /> : null}
      </section>
      {o.kind === 'unit' ? <ModelSection o={o} /> : null}
      {o.kind === 'point' && isDoc ? <DocSection o={o} /> : <CardSection o={o} />}
      <section className="sec">
        <h2 className="sec-h">Imágenes y videos</h2>
        <MediaEditor media={o.media} onChange={(media) => update(o.id, { media })} />
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
