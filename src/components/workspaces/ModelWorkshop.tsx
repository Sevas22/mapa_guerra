'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { plainName, UNITS } from '@/domain/catalog';
import {
  BASE_DEFS,
  DEFAULT_ALTITUDE,
  MODEL_BASES,
  PAYLOADS,
  PAYLOAD_NAMES,
  PRESETS,
  TAIL_NAMES,
  TAIL_TYPES,
  modelSize,
  newModel,
  normalizeModel,
  type Model3D,
  type ModelBase,
  type Payload,
  type TailType,
} from '@/domain/models3d';
import { buildModel, disposeModel, spinRotors } from '@/lib/model3dThree';
import { selectSelected, useEditorStore } from '@/store/editorStore';
import { useWorkspace } from '@/store/workspaceStore';

const EMPTY: Model3D[] = [];

/** Visor three.js con cámara orbital, suelo y sombras. */
function Viewer({ model, spin }: { model: Model3D; spin: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const ctx = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group | null;
    spin: boolean;
  } | null>(null);
  const lastBase = useRef<string>('');

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d131b');
    scene.fog = new THREE.Fog('#0d131b', 60, 240);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight('#dfe8f2', '#2a3020', 1.4));
    const sun = new THREE.DirectionalLight('#fff6e6', 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({ color: '#1a2330', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(2, 20, '#3b4b61', '#253244');
    scene.add(grid);
    ctx.current = { scene, camera, controls, group: null, spin: true };
    scene.userData = { sun, ground, grid };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const timer = new THREE.Timer();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = ctx.current;
      timer.update();
      if (c?.group && c.spin) spinRotors(c.group, timer.getElapsed());
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (ctx.current?.group) disposeModel(ctx.current.group);
      renderer.dispose();
      renderer.domElement.remove();
      ctx.current = null;
    };
  }, []);

  // Reconstruir el modelo con cada cambio; encuadrar al cambiar de modelo o de tipo.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    if (c.group) {
      c.scene.remove(c.group);
      disposeModel(c.group);
    }
    const g = buildModel(model);
    const size = modelSize(model);
    const lift = model.base === 'helicoptero' || model.base === 'dron-multirrotor' ? 0.16 : 0.12;
    g.position.y = size * lift + (model.base === 'avion' ? model.length * 0.06 : 0);
    c.scene.add(g);
    c.group = g;
    const { sun, ground, grid } = c.scene.userData as {
      sun: THREE.DirectionalLight;
      ground: THREE.Mesh;
      grid: THREE.GridHelper;
    };
    ground.scale.setScalar(size * 2);
    grid.scale.setScalar(size * 1.6);
    sun.position.set(size * 1.2, size * 2, size * 0.8);
    const cam = sun.shadow.camera;
    cam.left = cam.bottom = -size;
    cam.right = cam.top = size;
    cam.far = size * 6;
    cam.updateProjectionMatrix();
    c.scene.fog = new THREE.Fog('#0d131b', size * 3, size * 9);
    const key = `${model.id}|${model.base}`;
    if (lastBase.current !== key) {
      lastBase.current = key;
      c.camera.position.set(size * 1.25, size * 0.8, size * 1.45);
      c.controls.target.set(0, g.position.y, 0);
      c.camera.near = size / 200;
      c.camera.far = size * 40;
      c.camera.updateProjectionMatrix();
    }
  }, [model]);

  useEffect(() => {
    if (ctx.current) ctx.current.spin = spin;
  }, [spin]);

  return <div ref={box} className="absolute inset-0" aria-label="Vista previa 3D del modelo" />;
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

/** Taller 3D: crear y modelar aviones, helicópteros y drones, y asignarlos a unidades. */
export default function ModelWorkshop() {
  const models = useEditorStore((s) => s.scenario.models ?? EMPTY);
  const objects = useEditorStore((s) => s.scenario.objects);
  const selected = useEditorStore(selectSelected);
  const upsert = useEditorStore((s) => s.upsertItem);
  const removeItem = useEditorStore((s) => s.removeItem);
  const updateObject = useEditorStore((s) => s.updateObject);
  const focusId = useWorkspace((s) => s.focusId);
  const close = useWorkspace((s) => s.close);
  const [currentId, setCurrentId] = useState<string | null>(focusId ?? models[0]?.id ?? null);
  const [spin, setSpin] = useState(true);
  const model = models.find((m) => m.id === currentId) ?? models[0];

  const create = (i: number) => {
    const m = newModel(PRESETS[i]);
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
    set({
      base,
      length: preset.length,
      span: preset.span,
      engines: preset.engines,
      blades: preset.blades,
      tail: preset.tail,
      highWing: preset.highWing,
    });
  };

  const users = model ? objects.filter((o) => o.kind === 'unit' && o.model3d === model.id) : [];
  const selUnit = selected?.kind === 'unit' ? selected : undefined;
  const eng = model ? BASE_DEFS[model.base].engines : null;
  const isPlane = model?.base === 'avion' || model?.base === 'dron-ala-fija';
  const big = model ? Math.max(model.length, model.span) > 6 : true;

  return (
    <>
      <div className="ws-h">
        <h2>
          Taller 3D <span className="text-accent">·</span> aeronaves y drones
        </h2>
        <span className="flex-1" />
        <button type="button" className="btn primary" onClick={close}>
          Volver al mapa
        </button>
      </div>
      <div className="ws-body grid-cols-[230px_1fr_300px] max-[900px]:grid-cols-1">
        <aside className="ws-side border-r border-line">
          <section className="sec">
            <h3 className="sec-h">Nuevo modelo</h3>
            <div className="grid gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  className="btn justify-start!"
                  onClick={() => create(i)}
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
                      {BASE_DEFS[m.base].name} · {String(m.length).replace('.', ',')} m
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
          {model ? (
            <>
              <Viewer model={model} spin={spin} />
              <div className="pointer-events-none absolute top-3 left-3 rounded bg-[rgba(16,22,31,.85)] px-3 py-2">
                <div className="font-display text-lg font-bold tracking-wider uppercase">
                  {model.name}
                  {model.code ? (
                    <span className="ml-2 font-mono text-sm text-accent">{model.code}</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted">
                  {BASE_DEFS[model.base].name} · largo {String(model.length).replace('.', ',')} m ·{' '}
                  {model.base === 'helicoptero' ? 'rotor' : 'envergadura'}{' '}
                  {String(model.span).replace('.', ',')} m
                </div>
              </div>
              <div className="absolute bottom-3 left-3 flex gap-2 text-xs text-muted">
                <button type="button" className="btn text-xs!" onClick={() => setSpin(!spin)}>
                  {spin ? 'Detener rotores' : 'Girar rotores'}
                </button>
                <span className="self-center">
                  Arrastra para girar · rueda para acercar · clic derecho para desplazar
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
          {model && eng ? (
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
                      {MODEL_BASES.map((b) => (
                        <option key={b} value={b}>
                          {BASE_DEFS[b].name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Matrícula
                    <input
                      type="text"
                      value={model.code}
                      placeholder="Opcional"
                      onChange={(e) => set({ code: e.target.value })}
                    />
                  </label>
                </div>
              </section>
              <section className="sec">
                <h3 className="sec-h">Medidas</h3>
                <Num
                  label="Largo"
                  unit=" m"
                  value={model.length}
                  min={big ? 3 : 0.3}
                  max={big ? 60 : 8}
                  step={big ? 0.5 : 0.1}
                  onChange={(length) => set({ length })}
                />
                <Num
                  label={model.base === 'helicoptero' ? 'Diámetro del rotor' : 'Envergadura'}
                  unit=" m"
                  value={model.span}
                  min={big ? 3 : 0.3}
                  max={big ? 60 : 8}
                  step={big ? 0.5 : 0.1}
                  onChange={(span) => set({ span })}
                />
                <Num
                  label={eng.label}
                  value={model.engines}
                  min={eng.min}
                  max={eng.max}
                  step={eng.step}
                  onChange={(engines) => set({ engines })}
                />
                <Num
                  label="Palas por hélice o rotor"
                  value={model.blades}
                  min={2}
                  max={6}
                  step={1}
                  onChange={(blades) => set({ blades })}
                />
                {isPlane ? (
                  <div className="row">
                    <label className="field">
                      Cola
                      <select
                        value={model.tail}
                        onChange={(e) => set({ tail: e.target.value as TailType })}
                      >
                        {TAIL_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TAIL_NAMES[t]}
                          </option>
                        ))}
                      </select>
                    </label>
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
                  </div>
                ) : null}
                <label className="field">
                  Carga
                  <select
                    value={model.payload}
                    onChange={(e) => set({ payload: e.target.value as Payload })}
                  >
                    {PAYLOADS.map((p) => (
                      <option key={p} value={p}>
                        {PAYLOAD_NAMES[p]}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <section className="sec">
                <h3 className="sec-h">Pintura</h3>
                <div className="row">
                  <label className="field">
                    Fuselaje
                    <input
                      type="color"
                      value={model.color}
                      onChange={(e) => set({ color: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Detalles
                    <input
                      type="color"
                      value={model.accent}
                      onChange={(e) => set({ accent: e.target.value })}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ['Gris', '#8a949c'],
                    ['Verde oliva', '#5d6b4a'],
                    ['Camuflaje', '#4f5d3f'],
                    ['Arena', '#b39d76'],
                    ['Blanco', '#e3e6ea'],
                    ['Negro', '#30353b'],
                  ].map(([n, c]) => (
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
                ) : (
                  <p className="note">
                    Ninguna unidad usa este modelo. Selecciona una unidad en el mapa y asígnalo; se
                    verá volando en la vista 3D.
                  </p>
                )}
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
