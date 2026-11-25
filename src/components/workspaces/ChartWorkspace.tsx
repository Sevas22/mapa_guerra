'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EDGE_DEFS,
  EDGE_KINDS,
  NODE_DEFS,
  NODE_KINDS,
  TAB_NAMES,
  TAB_SIDES,
  chartBounds,
  hasEdge,
  moveElement,
  newChart,
  newEdge,
  newGroup,
  newNode,
  nodeForProfile,
  profileMap,
  removeElement,
  renderChartSVG,
  type Bounds,
  type ChartEdge,
  type ChartGroup,
  type ChartNode,
  type EdgeKind,
  type LinkChart,
  type NodeKind,
  type TabSide,
} from '@/domain/linkChart';
import { sampleLinkChart } from '@/domain/linkChartSample';
import {
  SOURCE_DEFS,
  SOURCE_TYPES,
  profileTitle,
  type Profile,
  type SourceType,
} from '@/domain/profiles';
import { downloadText, imageToDataUrl } from '@/lib/imageResize';
import { useEditorStore } from '@/store/editorStore';
import { useWorkspace } from '@/store/workspaceStore';
import NetworkView from './NetworkView';

const EMPTY_CHARTS: LinkChart[] = [];
const EMPTY_PROFILES: Profile[] = [];
/** Margen de lienzo alrededor del dibujo, para poder arrastrar hacia afuera. */
const CANVAS_PAD = 260;

type Mode = { kind: 'select' } | { kind: 'connect'; from: string | null };

type Drag =
  | {
      type: 'move';
      id: string;
      start: [number, number];
      base: LinkChart;
      seq: number;
      moved: boolean;
    }
  | { type: 'resize'; id: string; start: [number, number]; base: ChartGroup; seq: number };

let dragSeq = 0;

const pad = (b: Bounds, p: number): Bounds => ({
  x: b.x - p,
  y: b.y - p,
  w: b.w + 2 * p,
  h: b.h + 2 * p,
});

/** Coordenadas del dibujo bajo el puntero. */
function svgPoint(
  host: HTMLElement,
  e: { clientX: number; clientY: number },
): [number, number] | null {
  const svg = host.querySelector('svg');
  const ctm = svg?.getScreenCTM();
  if (!svg || !ctm) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return [p.x, p.y];
}

async function exportPng(svg: string, name: string) {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('svg'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')?.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  a.click();
}

const fileName = (t: string) =>
  (t || 'grafo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'grafo';

function NodeEditor({
  n,
  profiles,
  set,
}: {
  n: ChartNode;
  profiles: Profile[];
  set: (patch: Partial<ChartNode>) => void;
}) {
  const photoIn = useRef<HTMLInputElement>(null);
  const p = profiles.find((x) => x.id === n.profileId);
  return (
    <>
      <label className="field">
        Tipo
        <select value={n.kind} onChange={(e) => set({ kind: e.target.value as NodeKind })}>
          {NODE_KINDS.map((k) => (
            <option key={k} value={k}>
              {NODE_DEFS[k].name}
            </option>
          ))}
        </select>
      </label>
      {n.kind === 'fuente' ? (
        <label className="field">
          Tipo de fuente
          <select
            value={n.source ?? 'estudio'}
            onChange={(e) => set({ source: e.target.value as SourceType })}
          >
            {SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_DEFS[s].name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="field">
        Perfil vinculado
        <select
          value={n.profileId ?? ''}
          onChange={(e) => set({ profileId: e.target.value || undefined })}
        >
          <option value="">Ninguno</option>
          {profiles.map((x) => (
            <option key={x.id} value={x.id}>
              {profileTitle(x)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Rótulo
        <textarea
          rows={2}
          value={n.label}
          placeholder={p ? profileTitle(p) : 'Nombre, alias, lugar…'}
          onChange={(e) => set({ label: e.target.value })}
        />
      </label>
      <label className="field">
        Segunda línea
        <input
          type="text"
          value={n.sub}
          placeholder={p?.cargo || 'Cargo, estructura…'}
          onChange={(e) => set({ sub: e.target.value })}
        />
      </label>
      <div className="flex gap-1.5">
        <button type="button" className="btn text-xs!" onClick={() => photoIn.current?.click()}>
          {n.photo ? 'Cambiar foto' : 'Poner foto'}
        </button>
        {n.photo ? (
          <button type="button" className="btn text-xs!" onClick={() => set({ photo: undefined })}>
            Quitar foto
          </button>
        ) : null}
      </div>
      <input
        ref={photoIn}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) set({ photo: await imageToDataUrl(f, n.kind === 'vehiculo' ? 360 : 200) });
        }}
      />
      {p && !n.photo && p.foto ? <p className="note">Usa la foto del perfil.</p> : null}
    </>
  );
}

function GroupEditor({ g, set }: { g: ChartGroup; set: (patch: Partial<ChartGroup>) => void }) {
  return (
    <>
      <label className="field">
        Título de la pestaña
        <input
          type="text"
          value={g.title}
          placeholder="Sin pestaña"
          onChange={(e) => set({ title: e.target.value })}
        />
      </label>
      <label className="field">
        Pestaña
        <select value={g.tab} onChange={(e) => set({ tab: e.target.value as TabSide })}>
          {TAB_SIDES.map((t) => (
            <option key={t} value={t}>
              {TAB_NAMES[t]}
            </option>
          ))}
        </select>
      </label>
      <p className="note">
        Arrastra el cuadro para moverlo junto con lo que tiene adentro; la esquina naranja cambia su
        tamaño.
      </p>
    </>
  );
}

function EdgeEditor({ e, set }: { e: ChartEdge; set: (patch: Partial<ChartEdge>) => void }) {
  return (
    <>
      <label className="field">
        Tipo de vínculo
        <select value={e.kind} onChange={(ev) => set({ kind: ev.target.value as EdgeKind })}>
          {EDGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {EDGE_DEFS[k].name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Rótulo del vínculo
        <input
          type="text"
          value={e.label}
          placeholder="Opcional"
          onChange={(ev) => set({ label: ev.target.value })}
        />
      </label>
      <div className="flex gap-1.5">
        <label className="flex items-center gap-1.5 text-[13px]">
          <input
            type="checkbox"
            className="w-auto!"
            checked={e.arrow}
            onChange={() => set({ arrow: !e.arrow })}
          />
          Con flecha
        </label>
        <span className="flex-1" />
        <button
          type="button"
          className="btn text-xs!"
          onClick={() => set({ from: e.to, to: e.from })}
        >
          Invertir sentido
        </button>
      </div>
    </>
  );
}

/** Editor de grafos de vínculos (análisis de redes) que se pueden colocar en el mapa. */
export default function ChartWorkspace() {
  const charts = useEditorStore((s) => s.scenario.charts ?? EMPTY_CHARTS);
  const profiles = useEditorStore((s) => s.scenario.profiles ?? EMPTY_PROFILES);
  const upsert = useEditorStore((s) => s.upsertItem);
  const removeItem = useEditorStore((s) => s.removeItem);
  const addProfiles = useEditorStore((s) => s.addProfiles);
  const setTool = useEditorStore((s) => s.setTool);
  const focusId = useWorkspace((s) => s.focusId);
  const close = useWorkspace((s) => s.close);
  const [chartId, setChartId] = useState<string | null>(focusId ?? charts[0]?.id ?? null);
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'select' });
  const [edgeKind, setEdgeKind] = useState<EdgeKind>('confirmado');
  const [zoom, setZoom] = useState(1);
  // Diagrama editable o red de teoría de grafos (se construye sola desde el diagrama).
  const [view, setView] = useState<'diagrama' | 'red'>('diagrama');
  const [frozen, setFrozen] = useState<Bounds | null>(null);
  const [profilePick, setProfilePick] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const chart = charts.find((c) => c.id === chartId) ?? charts[0];
  const pmap = useMemo(() => profileMap(profiles), [profiles]);

  const save = (c: LinkChart, key?: string) => upsert('charts', c, key);

  const bounds = useMemo(
    () => (chart ? (frozen ?? pad(chartBounds(chart, pmap), CANVAS_PAD)) : null),
    [chart, pmap, frozen],
  );
  const svg = useMemo(() => {
    if (!chart || !bounds) return '';
    const hi = mode.kind === 'connect' && mode.from ? mode.from : sel;
    return renderChartSVG(chart, pmap, {
      editing: true,
      selectedId: hi,
      bounds,
      width: bounds.w * zoom,
    });
  }, [chart, pmap, sel, mode, bounds, zoom]);

  // Centrar el lienzo al abrir otro grafo.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.scrollLeft = (CANVAS_PAD - 20) * zoom;
    el.scrollTop = (CANVAS_PAD - 20) * zoom;
    // Solo al cambiar de grafo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart?.id]);

  // Supr borra el elemento seleccionado; Esc sale del modo «vincular».
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel && chart) {
        e.preventDefault();
        save(removeElement(chart, sel));
        setSel(null);
      }
      if (e.key === 'Escape') setMode({ kind: 'select' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** Centro de la parte visible del lienzo, en coordenadas del dibujo. */
  const viewCenter = (): [number, number] => {
    const el = host.current;
    if (!el) return [400, 300];
    const r = el.getBoundingClientRect();
    return (
      svgPoint(el, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }) ?? [400, 300]
    );
  };

  const addNode = (kind: NodeKind) => {
    if (!chart) return;
    const [x, y] = viewCenter();
    const n = newNode(kind, Math.round(x), Math.round(y), {
      label: kind === 'lugar' ? 'Lugar' : kind === 'vehiculo' ? 'Vehículo' : '',
      ...(kind === 'fuente' ? { source: 'estudio' as const } : {}),
    });
    save({ ...chart, nodes: [...chart.nodes, n] });
    setSel(n.id);
  };

  const addFromProfile = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    if (!chart || !p) return;
    const [x, y] = viewCenter();
    const n = nodeForProfile(p, Math.round(x), Math.round(y));
    save({ ...chart, nodes: [...chart.nodes, n] });
    setSel(n.id);
    setProfilePick('');
  };

  const addAllProfiles = () => {
    if (!chart) return;
    const used = new Set(chart.nodes.map((n) => n.profileId));
    const todo = profiles.filter((p) => !used.has(p.id));
    if (!todo.length) return;
    const [cx, cy] = viewCenter();
    const cols = Math.ceil(Math.sqrt(todo.length));
    const nodes = todo.map((p, i) =>
      nodeForProfile(
        p,
        Math.round(cx + ((i % cols) - (cols - 1) / 2) * 130),
        Math.round(cy + Math.floor(i / cols) * 130),
      ),
    );
    save({ ...chart, nodes: [...chart.nodes, ...nodes] });
  };

  const addGroup = () => {
    if (!chart) return;
    const [x, y] = viewCenter();
    const g = newGroup(Math.round(x - 160), Math.round(y - 75));
    save({ ...chart, groups: [...chart.groups, g] });
    setSel(g.id);
  };

  const createChart = () => {
    const c = newChart();
    save(c);
    setChartId(c.id);
    setSel(null);
  };

  const loadSample = () => {
    const { profiles: ps, chart: c } = sampleLinkChart();
    addProfiles(ps);
    save(c);
    setChartId(c.id);
    setSel(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!chart || !host.current || e.button !== 0) return;
    const target = (e.target as Element).closest('[data-type]');
    const type = target?.getAttribute('data-type');
    const id = target?.getAttribute('data-id');
    const pt = svgPoint(host.current, e);
    if (!pt) return;
    if (mode.kind === 'connect') {
      if (!id || type === 'edge' || type === 'resize') return;
      if (!mode.from) setMode({ kind: 'connect', from: id });
      else if (mode.from !== id) {
        if (!hasEdge(chart, mode.from, id)) {
          const ed = newEdge(mode.from, id, edgeKind);
          save({ ...chart, edges: [...chart.edges, ed] });
        }
        setMode({ kind: 'connect', from: null });
      }
      return;
    }
    if (!id || type === 'bg') {
      setSel(null);
      return;
    }
    setSel(id);
    if (type === 'edge') return;
    const b = bounds;
    if (b) setFrozen(b);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragSeq += 1;
    if (type === 'resize') {
      const g = chart.groups.find((x) => x.id === id);
      if (g) drag.current = { type: 'resize', id, start: pt, base: g, seq: dragSeq };
    } else drag.current = { type: 'move', id, start: pt, base: chart, seq: dragSeq, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !host.current || !chart) return;
    const pt = svgPoint(host.current, e);
    if (!pt) return;
    const dx = Math.round(pt[0] - d.start[0]);
    const dy = Math.round(pt[1] - d.start[1]);
    if (d.type === 'move') {
      if (!d.moved && Math.hypot(dx, dy) < 3) return;
      d.moved = true;
      save(moveElement(d.base, d.id, dx, dy), `chart:drag:${d.seq}`);
    } else {
      const w = Math.max(60, d.base.w + dx);
      const h = Math.max(50, d.base.h + dy);
      save(
        { ...chart, groups: chart.groups.map((g) => (g.id === d.id ? { ...g, w, h } : g)) },
        `chart:drag:${d.seq}`,
      );
    }
  };

  const endDrag = () => {
    drag.current = null;
    setFrozen(null);
  };

  const selNode = chart?.nodes.find((n) => n.id === sel);
  const selGroup = chart?.groups.find((g) => g.id === sel);
  const selEdge = chart?.edges.find((x) => x.id === sel);
  const patchNode = (patch: Partial<ChartNode>) =>
    chart &&
    selNode &&
    save(
      { ...chart, nodes: chart.nodes.map((n) => (n.id === selNode.id ? { ...n, ...patch } : n)) },
      `chart:${chart.id}:${selNode.id}:${Object.keys(patch).join()}`,
    );
  const patchGroup = (patch: Partial<ChartGroup>) =>
    chart &&
    selGroup &&
    save(
      {
        ...chart,
        groups: chart.groups.map((g) => (g.id === selGroup.id ? { ...g, ...patch } : g)),
      },
      `chart:${chart.id}:${selGroup.id}:${Object.keys(patch).join()}`,
    );
  const patchEdge = (patch: Partial<ChartEdge>) =>
    chart &&
    selEdge &&
    save(
      { ...chart, edges: chart.edges.map((x) => (x.id === selEdge.id ? { ...x, ...patch } : x)) },
      `chart:${chart.id}:${selEdge.id}:${Object.keys(patch).join()}`,
    );

  const exportSvg = () =>
    chart &&
    downloadText(`${fileName(chart.title)}.svg`, renderChartSVG(chart, pmap), 'image/svg+xml');
  const exportImage = () =>
    chart &&
    void exportPng(
      renderChartSVG(chart, pmap, { width: chartBounds(chart, pmap).w * 2 }),
      `${fileName(chart.title)}.png`,
    );

  const place = () => {
    if (!chart) return;
    setTool({
      mode: 'place',
      kind: 'point',
      type: 'grafo',
      extra: { chartId: chart.id, label: chart.title },
    });
    close();
  };

  return (
    <>
      <div className="ws-h max-[900px]:flex-wrap">
        <h2>
          Grafos de vínculos <span className="text-accent">·</span> {charts.length}
        </h2>
        {chart ? (
          <div className="ml-3 flex rounded border border-line p-0.5" role="tablist">
            {(
              [
                ['diagrama', 'Diagrama'],
                ['red', 'Red (teoría de grafos)'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className="rounded px-3 py-1 text-[13px] text-muted aria-selected:bg-accent aria-selected:text-bg"
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <span className="flex-1" />
        {chart ? (
          <>
            <button type="button" className="btn" onClick={exportImage}>
              Exportar PNG
            </button>
            <button type="button" className="btn" onClick={exportSvg}>
              Exportar SVG
            </button>
            <button type="button" className="btn" onClick={place}>
              Colocar en el mapa
            </button>
          </>
        ) : null}
        <button type="button" className="btn primary" onClick={close}>
          Volver al mapa
        </button>
      </div>
      <div
        className={`ws-body ${view === 'red' ? 'grid-cols-[240px_1fr]' : 'grid-cols-[240px_1fr_290px]'} max-[1000px]:grid-cols-1`}
      >
        <aside className="ws-side border-r border-line">
          <section className="sec">
            <h3 className="sec-h">Grafos</h3>
            <div className="grid gap-1">
              {charts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === chart?.id}
                  className="truncate rounded border border-line bg-bg px-2 py-1.5 text-left text-[13px] aria-pressed:border-accent aria-pressed:bg-panel-2"
                  onClick={() => {
                    setChartId(c.id);
                    setSel(null);
                  }}
                >
                  {c.title || 'Sin título'}
                </button>
              ))}
            </div>
            <div className="mt-2 grid gap-1.5">
              <button type="button" className="btn" onClick={createChart}>
                + Grafo en blanco
              </button>
              <button type="button" className="btn" onClick={loadSample}>
                + Ejemplo ficticio
              </button>
            </div>
          </section>
          {chart ? (
            <>
              <section className="sec">
                <h3 className="sec-h">Agregar</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {NODE_KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="btn text-xs! leading-tight"
                      onClick={() => addNode(k)}
                    >
                      {NODE_DEFS[k].name}
                    </button>
                  ))}
                  <button type="button" className="btn col-span-2 text-xs!" onClick={addGroup}>
                    Cuadro de estructura
                  </button>
                </div>
                <label className="field mt-2">
                  Desde un perfil
                  <select value={profilePick} onChange={(e) => addFromProfile(e.target.value)}>
                    <option value="">
                      {profiles.length ? 'Elegir perfil…' : 'No hay perfiles'}
                    </option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {profileTitle(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn w-full text-xs!"
                  disabled={!profiles.length}
                  onClick={addAllProfiles}
                >
                  Agregar todos los perfiles que faltan
                </button>
              </section>
              <section className="sec">
                <h3 className="sec-h">Vincular</h3>
                <label className="field">
                  Tipo de vínculo
                  <select
                    value={edgeKind}
                    onChange={(e) => setEdgeKind(e.target.value as EdgeKind)}
                  >
                    {EDGE_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {EDGE_DEFS[k].name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={`btn w-full ${mode.kind === 'connect' ? 'primary' : ''}`}
                  onClick={() =>
                    setMode(
                      mode.kind === 'connect'
                        ? { kind: 'select' }
                        : { kind: 'connect', from: null },
                    )
                  }
                >
                  {mode.kind === 'connect' ? 'Terminar de vincular' : 'Vincular elementos'}
                </button>
                {mode.kind === 'connect' ? (
                  <p className="note mt-1.5">
                    {mode.from
                      ? 'Ahora haz clic en el destino del vínculo.'
                      : 'Haz clic en el origen (persona, rombo o cuadro).'}{' '}
                    Esc para salir.
                  </p>
                ) : null}
              </section>
            </>
          ) : null}
        </aside>

        <main className="relative min-h-[300px] min-w-0">
          {chart && view === 'red' ? (
            <NetworkView chart={chart} profiles={profiles} />
          ) : chart ? (
            <>
              <div
                ref={host}
                className={`absolute inset-0 overflow-auto bg-[#5b636e] ${mode.kind === 'connect' ? 'cursor-crosshair' : ''}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="absolute right-3 bottom-3 flex gap-1 rounded bg-[rgba(16,22,31,.9)] p-1">
                <button
                  type="button"
                  className="btn px-2!"
                  aria-label="Alejar"
                  onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.15).toFixed(2)))}
                >
                  −
                </button>
                <span className="self-center px-1 font-mono text-xs">
                  {Math.round(zoom * 100)} %
                </span>
                <button
                  type="button"
                  className="btn px-2!"
                  aria-label="Acercar"
                  onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
                >
                  +
                </button>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-muted">
              <div>
                <p className="mb-3">
                  Crea un grafo en blanco o carga el ejemplo ficticio para ver la estructura.
                </p>
                <div className="flex justify-center gap-2">
                  <button type="button" className="btn" onClick={createChart}>
                    Grafo en blanco
                  </button>
                  <button type="button" className="btn primary" onClick={loadSample}>
                    Ejemplo ficticio
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {view === 'diagrama' ? (
          <aside className="ws-side border-l border-line">
            {chart ? (
              <>
                {selNode || selGroup || selEdge ? (
                  <section className="sec">
                    <h3 className="sec-h big">
                      {selNode
                        ? NODE_DEFS[selNode.kind].name
                        : selGroup
                          ? 'Cuadro de estructura'
                          : 'Vínculo'}
                    </h3>
                    {selNode ? (
                      <NodeEditor n={selNode} profiles={profiles} set={patchNode} />
                    ) : null}
                    {selGroup ? <GroupEditor g={selGroup} set={patchGroup} /> : null}
                    {selEdge ? <EdgeEditor e={selEdge} set={patchEdge} /> : null}
                    <button
                      type="button"
                      className="btn danger mt-2 w-full"
                      onClick={() => {
                        if (!sel) return;
                        save(removeElement(chart, sel));
                        setSel(null);
                      }}
                    >
                      Eliminar <kbd>Supr</kbd>
                    </button>
                  </section>
                ) : (
                  <section className="sec">
                    <p className="note">
                      Haz clic en un elemento para editarlo. Arrastra para moverlo. Para unir dos
                      elementos usa «Vincular elementos».
                    </p>
                  </section>
                )}
                <section className="sec">
                  <h3 className="sec-h">Grafo</h3>
                  <label className="field">
                    Título
                    <input
                      type="text"
                      value={chart.title}
                      onChange={(e) =>
                        save({ ...chart, title: e.target.value }, `chart:${chart.id}:title`)
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px]">
                    <input
                      type="checkbox"
                      className="w-auto!"
                      checked={chart.legend}
                      onChange={() => save({ ...chart, legend: !chart.legend })}
                    />
                    Mostrar convenciones
                  </label>
                  <p className="note mt-2">
                    {chart.nodes.length} elementos · {chart.groups.length} cuadros ·{' '}
                    {chart.edges.length} vínculos
                  </p>
                  <button
                    type="button"
                    className="btn danger mt-2 w-full"
                    onClick={() => {
                      if (!confirm(`¿Eliminar el grafo «${chart.title}»?`)) return;
                      removeItem('charts', chart.id);
                      setChartId(null);
                      setSel(null);
                    }}
                  >
                    Eliminar grafo
                  </button>
                </section>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>
    </>
  );
}
