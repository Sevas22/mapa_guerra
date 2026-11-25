'use client';

import { useEffect, useRef, useState } from 'react';
import { plainName, UNITS } from '@/domain/catalog';
import {
  BASE_DEFS,
  DEFAULT_ALTITUDE,
  DOMAIN_NAMES,
  MESH_ACCEPT,
  MODEL_BASES,
  PAYLOAD_NAMES,
  PRESETS,
  TAIL_NAMES,
  domainOf,
  newModel,
  normalizeModel,
  type Model3D,
  type ModelBase,
  type ModelDomain,
  type Payload,
  type TailType,
} from '@/domain/models3d';
import { CATALOG_URL, assetModel, parseCatalog, type RealAsset } from '@/domain/realCatalog';
import { addMeshFile } from '@/lib/mediaStore';
import { NO_ANIM, meshClipNames } from '@/lib/model3dThree';
import { selectSelected, useEditorStore } from '@/store/editorStore';
import { useWorkspace } from '@/store/workspaceStore';
import { ModelViewer } from './ModelViewer';

const EMPTY: Model3D[] = [];

/**
 * Modelo realista propio: un .glb hecho en Blender o descargado de una biblioteca. Reemplaza a
 * las piezas paramétricas y conserva las medidas, la formación y la colocación en el mapa.
 */
function MeshSection({ model, set }: { model: Model3D; set: (patch: Partial<Model3D>) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clips, setClips] = useState<{ id: string; names: string[] } | null>(null);
  const mesh = model.mesh;

  useEffect(() => {
    if (!mesh) return;
    let live = true;
    void meshClipNames(mesh.id).then((names) => {
      if (live) setClips({ id: mesh.id, names });
    });
    return () => {
      live = false;
    };
  }, [mesh]);
  const names = mesh && clips?.id === mesh.id ? clips.names : [];

  const load = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    const r = await addMeshFile(file);
    setBusy(false);
    if ('error' in r) return setError(r.error);
    // Los .glb miran hacia +z por convención; el taller usa +x como frente.
    set({ mesh: { id: r.id, name: file.name, yaw: 90, anim: '' } });
  };

  return (
    <section className="sec">
      <h3 className="sec-h">Modelo realista (.glb)</h3>
      {mesh ? (
        <>
          <p className="mb-2 truncate text-[13px]" title={mesh.name}>
            {mesh.name}
          </p>
          <div className="row">
            <label className="field">
              Frente
              <select
                value={String(mesh.yaw)}
                onChange={(e) => set({ mesh: { ...mesh, yaw: Number(e.target.value) } })}
              >
                <option value="0">0°</option>
                <option value="90">90°</option>
                <option value="180">180°</option>
                <option value="270">270°</option>
              </select>
            </label>
            <label className="field">
              Animación
              <select
                value={mesh.anim}
                onChange={(e) => set({ mesh: { ...mesh, anim: e.target.value } })}
              >
                <option value="">{names.length ? 'Automática' : 'Sin animaciones'}</option>
                {names.length ? <option value={NO_ANIM}>Ninguna (quieto)</option> : null}
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="note mb-2">
            Se escala {model.base === 'soldados' ? 'a la estatura' : 'al largo'} indicado en
            Medidas. Si no mira hacia adelante, cambia «Frente».
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={() => input.current?.click()}>
              Cambiar archivo
            </button>
            <button type="button" className="btn" onClick={() => set({ mesh: undefined })}>
              Usar el paramétrico
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="note mb-2">
            Para un acabado de videojuego carga un modelo con texturas (y animaciones de caminar o
            reposo, si las trae) en formato .glb: hecho en Blender o descargado de una biblioteca
            con licencia libre. Mantiene medidas, formación y colocación en el mapa.
          </p>
          <button
            type="button"
            className="btn w-full"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? 'Cargando…' : 'Cargar modelo .glb…'}
          </button>
        </>
      )}
      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}
      <input
        ref={input}
        type="file"
        accept={MESH_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void load(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </section>
  );
}

function Num({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span className="flex justify-between">
        {label}
        <span className="font-mono text-fg">
          {String(value).replace('.', ',')}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

const DOMAINS = Object.keys(DOMAIN_NAMES) as ModelDomain[];
const dec = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');

const SWATCHES: Record<ModelDomain, [string, string][]> = {
  aire: [
    ['Gris', '#8a949c'],
    ['Verde oliva', '#5d6b4a'],
    ['Camuflaje', '#4f5d3f'],
    ['Arena', '#b39d76'],
    ['Blanco', '#e3e6ea'],
    ['Negro', '#30353b'],
  ],
  tierra: [
    ['Verde oliva', '#5d6b4a'],
    ['Verde OTAN', '#4b5a3a'],
    ['Arena', '#b39d76'],
    ['Pardo', '#7a6a4a'],
    ['Blanco', '#d9dcdf'],
    ['Gris', '#6f767c'],
  ],
  mar: [
    ['Gris naval', '#8c949b'],
    ['Gris oscuro', '#5a636b'],
    ['Verde río', '#4f5b4a'],
    ['Negro', '#2b2f33'],
    ['Blanco', '#e3e6ea'],
    ['Azul', '#2e4a66'],
  ],
  personal: [
    ['Camuflaje selva', '#5b6146'],
    ['Verde', '#4d5a3c'],
    ['Arena', '#a8956c'],
    ['Pardo', '#6b5a43'],
    ['Negro', '#2b2e30'],
    ['Civil', '#5d6f86'],
  ],
};

/** Taller 3D: modelar aeronaves, vehículos, embarcaciones e infantería y llevarlos al mapa. */
export default function ModelWorkshop() {
  const models = useEditorStore((s) => s.scenario.models ?? EMPTY);
  const objects = useEditorStore((s) => s.scenario.objects);
  const selected = useEditorStore(selectSelected);
  const upsert = useEditorStore((s) => s.upsertItem);
  const removeItem = useEditorStore((s) => s.removeItem);
  const updateObject = useEditorStore((s) => s.updateObject);
  const setTool = useEditorStore((s) => s.setTool);
  const focusId = useWorkspace((s) => s.focusId);
  const close = useWorkspace((s) => s.close);
  const [currentId, setCurrentId] = useState<string | null>(focusId ?? models[0]?.id ?? null);
  const [spin, setSpin] = useState(true);
  const model = models.find((m) => m.id === currentId) ?? models[0];
  const [tab, setTab] = useState<ModelDomain>(model ? domainOf(model.base) : 'aire');

  // Modelos reales del catálogo (`public/models/vehiculos/catalogo.json`).
  const [real, setReal] = useState<RealAsset[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch(CATALOG_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((data: unknown) => {
        if (live) setReal(parseCatalog(data).assets);
      });
    return () => {
      live = false;
    };
  }, []);
  const realHere = (real ?? []).filter((a) => domainOf(a.base) === tab);

  const create = (p: Omit<Model3D, 'id'>) => {
    const m = newModel(p);
    upsert('models', m);
    setCurrentId(m.id);
  };
  const set = (patch: Partial<Model3D>) => {
    if (!model) return;
    upsert(
      'models',
      normalizeModel({ ...model, ...patch }),
      `model:${model.id}:${Object.keys(patch).join(',')}`,
    );
  };
  const changeBase = (base: ModelBase) => {
    const preset = PRESETS.find((p) => p.base === base) ?? PRESETS[0]!;
    // Se toma la receta del primer modelo de partida de ese tipo, conservando nombre y código.
    set({ ...preset, base, name: model?.name ?? preset.name, code: model?.code ?? '' });
  };
  const place = () => {
    if (!model) return;
    const def = BASE_DEFS[model.base];
    setTool({
      mode: 'place',
      kind: 'unit',
      type: def.unit,
      extra: { model3d: model.id, altitude: def.altitude, label: model.name },
    });
    close();
  };

  const users = model ? objects.filter((o) => o.kind === 'unit' && o.model3d === model.id) : [];
  const selUnit = selected?.kind === 'unit' ? selected : undefined;
  const def = model ? BASE_DEFS[model.base] : null;
  const domain = model ? domainOf(model.base) : 'aire';

  return (
    <>
      <div className="ws-h">
        <h2>
          Taller 3D <span className="text-accent">·</span> equipos y tropas
        </h2>
        <span className="flex-1" />
        <button type="button" className="btn primary" onClick={close}>
          Volver al mapa
        </button>
      </div>
      <div className="ws-body grid-cols-[250px_1fr_300px] max-[900px]:grid-cols-1">
        <aside className="ws-side border-r border-line">
          <section className="sec">
            <h3 className="sec-h">Nuevo modelo</h3>
            <div className="mb-2 grid grid-cols-4 gap-1" role="tablist">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={tab === d}
                  className="rounded border border-line px-1 py-1 text-[11px] text-muted aria-selected:border-accent aria-selected:text-accent"
                  onClick={() => setTab(d)}
                >
                  {DOMAIN_NAMES[d]}
                </button>
              ))}
            </div>
            <h4 className="mb-1 font-mono text-[10px] tracking-wider text-accent uppercase">
              Modelos reales
            </h4>
            {realHere.length ? (
              <div className="mb-3 grid gap-1">
                {realHere.map((a) => (
                  <button
                    key={a.file}
                    type="button"
                    title={`${a.author ? `Por ${a.author} · ` : ''}${a.license}`}
                    className="btn justify-start! border-accent/50! text-left text-[13px]!"
                    onClick={() => create(assetModel(a))}
                  >
                    + {a.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="note mb-3">
                {real == null
                  ? 'Cargando…'
                  : 'Aún no hay modelos reales de este tipo. Se agregan en public/models/vehiculos (ver la guía).'}
              </p>
            )}
            <h4 className="mb-1 font-mono text-[10px] tracking-wider text-muted uppercase">
              Paramétricos
            </h4>
            <div className="grid gap-1">
              {PRESETS.filter((p) => domainOf(p.base) === tab).map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="btn justify-start! text-left text-[13px]!"
                  onClick={() => create(p)}
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </section>
          <section className="sec">
            <h3 className="sec-h">Modelos del escenario</h3>
            {models.length ? (
              <div className="grid gap-1">
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={m.id === model?.id}
                    className="rounded border border-line bg-bg px-2 py-1.5 text-left text-[13px] aria-pressed:border-accent aria-pressed:bg-panel-2"
                    onClick={() => setCurrentId(m.id)}
                  >
                    <div className="truncate">{m.name}</div>
                    <div className="text-[11px] text-muted">
                      {BASE_DEFS[m.base].name} · {dec(m.length)} m
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="note">Aún no hay modelos. Empieza con uno de arriba.</p>
            )}
          </section>
        </aside>

        <main className="relative min-h-[320px]">
          {model && def ? (
            <>
              <ModelViewer model={model} spin={spin} />
              <div className="pointer-events-none absolute top-3 left-3 rounded bg-[rgba(16,22,31,.85)] px-3 py-2">
                <div className="font-display text-lg font-bold tracking-wider uppercase">
                  {model.name}
                  {model.code ? (
                    <span className="ml-2 font-mono text-sm text-accent">{model.code}</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted">
                  {def.name}
                  {def.variants
                    ? ` (${def.variants.options[model.variant]?.toLowerCase() ?? ''})`
                    : ''}{' '}
                  · {def.lengthLabel.toLowerCase()} {dec(model.length)} m ·{' '}
                  {def.spanLabel.toLowerCase()} {dec(model.span)} m
                  {model.base === 'soldados' ? ` · ${model.engines} soldados` : ''}
                </div>
                {model.mesh?.credit ? (
                  <div className="mt-1 max-w-[420px] text-[11px] text-soft">
                    Modelo 3D: {model.mesh.credit}
                  </div>
                ) : null}
              </div>
              <div className="absolute bottom-3 left-3 flex gap-2 text-xs text-muted">
                <button type="button" className="btn text-xs!" onClick={() => setSpin(!spin)}>
                  {spin ? 'Pausar animación' : 'Animar'}
                </button>
                <span className="self-center">
                  Flecha amarilla: frente · arrastra para girar · rueda para acercar · clic derecho
                  para desplazar
                </span>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center text-muted">
              Crea un modelo para verlo en 3D.
            </div>
          )}
        </main>

        <aside className="ws-side border-l border-line">
          {model && def ? (
            <>
              <section className="sec">
                <h3 className="sec-h big">Modelo</h3>
                <label className="field">
                  Nombre
                  <input
                    type="text"
                    value={model.name}
                    onChange={(e) => set({ name: e.target.value })}
                  />
                </label>
                <div className="row">
                  <label className="field">
                    Tipo
                    <select
                      value={model.base}
                      onChange={(e) => changeBase(e.target.value as ModelBase)}
                    >
                      {DOMAINS.map((d) => (
                        <optgroup key={d} label={DOMAIN_NAMES[d]}>
                          {MODEL_BASES.filter((b) => domainOf(b) === d).map((b) => (
                            <option key={b} value={b}>
                              {BASE_DEFS[b].name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  {def.variants ? (
                    <label className="field">
                      {def.variants.label}
                      <select
                        value={model.variant}
                        onChange={(e) => set({ variant: e.target.value })}
                      >
                        {Object.entries(def.variants.options).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                <label className="field">
                  {domain === 'personal'
                    ? 'Distintivo'
                    : domain === 'mar'
                      ? 'Numeral'
                      : 'Matrícula'}
                  <input
                    type="text"
                    value={model.code}
                    placeholder="Opcional"
                    onChange={(e) => set({ code: e.target.value })}
                  />
                </label>
              </section>
              <section className="sec">
                <h3 className="sec-h">Medidas</h3>
                <Num
                  label={def.lengthLabel}
                  unit=" m"
                  value={model.length}
                  {...def.length}
                  onChange={(length) => set({ length })}
                />
                <Num
                  label={def.spanLabel}
                  unit=" m"
                  value={model.span}
                  {...def.span}
                  onChange={(span) => set({ span })}
                />
                {def.count ? (
                  <Num
                    label={def.count.label}
                    value={model.engines}
                    min={def.count.min}
                    max={def.count.max}
                    step={def.count.step}
                    onChange={(engines) => set({ engines })}
                  />
                ) : null}
                {def.blades ? (
                  <Num
                    label="Palas por hélice o rotor"
                    value={model.blades}
                    min={2}
                    max={6}
                    step={1}
                    onChange={(blades) => set({ blades })}
                  />
                ) : null}
                {def.tails || def.wings ? (
                  <div className="row">
                    {def.tails ? (
                      <label className="field">
                        Cola
                        <select
                          value={model.tail}
                          onChange={(e) => set({ tail: e.target.value as TailType })}
                        >
                          {def.tails.map((t) => (
                            <option key={t} value={t}>
                              {TAIL_NAMES[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {def.wings ? (
                      <label className="field">
                        Alas
                        <select
                          value={model.highWing ? 'alta' : 'baja'}
                          onChange={(e) => set({ highWing: e.target.value === 'alta' })}
                        >
                          <option value="alta">Altas</option>
                          <option value="baja">Bajas</option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : null}
                {def.payloads.length > 1 ? (
                  <label className="field">
                    {def.payloadLabel}
                    <select
                      value={model.payload}
                      onChange={(e) => set({ payload: e.target.value as Payload })}
                    >
                      {def.payloads.map((p) => (
                        <option key={p} value={p}>
                          {PAYLOAD_NAMES[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </section>
              <MeshSection model={model} set={set} />
              <section className="sec">
                <h3 className="sec-h">Pintura</h3>
                <div className="row">
                  <label className="field">
                    {domain === 'personal' ? 'Uniforme' : domain === 'mar' ? 'Casco' : 'Principal'}
                    <input
                      type="color"
                      value={model.color}
                      onChange={(e) => set({ color: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    {domain === 'personal' ? 'Equipo y casco' : 'Detalles'}
                    <input
                      type="color"
                      value={model.accent}
                      onChange={(e) => set({ accent: e.target.value })}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SWATCHES[domain].map(([n, c]) => (
                    <button
                      key={c}
                      type="button"
                      title={n}
                      aria-label={n}
                      className="size-6 rounded border border-line"
                      style={{ background: c }}
                      onClick={() => set({ color: c })}
                    />
                  ))}
                </div>
              </section>
              <section className="sec">
                <h3 className="sec-h">En el mapa</h3>
                <button type="button" className="btn primary mb-2 w-full" onClick={place}>
                  Colocar en el mapa
                </button>
                <p className="note mb-2">
                  Haz clic en el mapa para poner una unidad de{' '}
                  {plainName(UNITS[def.unit].name).toLowerCase()} con este modelo. En la vista 3D se
                  ve{' '}
                  {domain === 'aire'
                    ? 'volando a su altura'
                    : domain === 'mar'
                      ? 'a flote'
                      : 'sobre el relieve'}
                  , orientada según su recorrido.
                </p>
                {users.length ? (
                  <ul className="mb-2 text-[13px]">
                    {users.map((u) => (
                      <li key={u.id}>
                        ·{' '}
                        {u.label ||
                          plainName(UNITS[u.type as keyof typeof UNITS]?.name ?? 'Unidad')}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selUnit ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={selUnit.model3d === model.id}
                    onClick={() =>
                      updateObject(selUnit.id, {
                        model3d: model.id,
                        altitude: selUnit.altitude ?? DEFAULT_ALTITUDE[model.base],
                      })
                    }
                  >
                    Asignar a «{selUnit.label || plainName(UNITS[selUnit.type].name)}»
                  </button>
                ) : null}
              </section>
              <section className="sec">
                <div className="row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const c = { ...model, id: newModel().id, name: `${model.name} (copia)` };
                      upsert('models', c);
                      setCurrentId(c.id);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => {
                      if (!confirm(`¿Eliminar el modelo «${model.name}»?`)) return;
                      removeItem('models', model.id);
                      setCurrentId(null);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </aside>
      </div>
    </>
  );
}
