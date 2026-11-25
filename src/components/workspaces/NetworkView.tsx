'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LinkChart } from '@/domain/linkChart';
import { profileMap } from '@/domain/linkChart';
import {
  METRICS,
  METRIC_NAMES,
  NET_EDGE_DEFS,
  NET_TYPE_NAMES,
  ROLES,
  ROLE_DEFS,
  TYPE_COLORS,
  analyze,
  buildNetwork,
  communityColor,
  diagramPositions,
  forceLayout,
  ranking,
  roles,
  toGexf,
  type MetricKey,
  type NetEdgeKind,
  type NetNodeType,
  type Positions,
} from '@/domain/network';
import type { Profile } from '@/domain/profiles';
import { downloadText } from '@/lib/imageResize';

type ColorBy = 'rol' | 'community' | 'type';
type Labels = 'principales' | 'todas';

/** Iteraciones por cuadro y cuadros de animación al reorganizar la red. */
const STEP = 12;
const FRAMES = 45;

const fmt = (v: number, d = 2) =>
  v.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Vista de red (teoría de grafos) del grafo de vínculos, al estilo de Gephi: se reorganiza
 * sola cada vez que cambia el diagrama, con nodos del tamaño de su centralidad y del color de
 * su comunidad, puentes y puntos de corte resaltados, ranking de actores clave y exportación
 * GEXF para seguir el análisis en Gephi.
 */
export default function NetworkView({
  chart,
  profiles,
}: {
  chart: LinkChart;
  profiles: readonly Profile[];
}) {
  const pmap = useMemo(() => profileMap([...profiles]), [profiles]);
  const net = useMemo(() => buildNetwork(chart, pmap), [chart, pmap]);
  const an = useMemo(() => analyze(net), [net]);
  const [sizeBy, setSizeBy] = useState<MetricKey>('betweenness');
  const [colorBy, setColorBy] = useState<ColorBy>('rol');
  const [labels, setLabels] = useState<Labels>('principales');
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pos, setPos] = useState<Positions>(() => new Map());
  const posRef = useRef<Positions>(new Map());
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ kind: 'pan' | 'node'; id?: string; sx: number; sy: number } | null>(null);
  const [restart, setRestart] = useState(0);
  const hasNodes = net.nodes.length > 0;
  // Tamaño del lienzo (para mantener la proporción del encuadre).
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasNodes]);

  // Reorganizar en vivo cada vez que cambia la red: parte de la distribución anterior.
  useEffect(() => {
    let frame = 0;
    let raf = 0;
    let cur: Positions =
      posRef.current.size && restart === 0 ? posRef.current : diagramPositions(net);
    const tick = () => {
      cur = forceLayout(net, cur, STEP);
      posRef.current = cur;
      setPos(cur);
      if (++frame < FRAMES) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [net, restart]);

  // Encuadre: caja de las posiciones con margen.
  const box = useMemo(() => {
    const pts = [...pos.values()];
    if (!pts.length) return { x: -200, y: -150, w: 400, h: 300 };
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs) - 80;
    const y0 = Math.min(...ys) - 80;
    return {
      x: x0,
      y: y0,
      w: Math.max(...xs) + 80 - x0,
      h: Math.max(...ys) + 80 - y0,
    };
  }, [pos]);

  const maxMetric = Math.max(...net.nodes.map((n) => an.metrics.get(n.id)![sizeBy]), 1e-9);
  const radius = (id: string) => 7 + 26 * Math.sqrt(an.metrics.get(id)![sizeBy] / maxMetric);
  const roleMap = useMemo(() => roles(net, an), [net, an]);
  const color = (id: string) => {
    if (colorBy === 'rol') return ROLE_DEFS[roleMap.get(id) ?? 'general'].color;
    if (colorBy === 'community') return communityColor(an.metrics.get(id)!.community);
    return TYPE_COLORS[net.nodes.find((x) => x.id === id)!.type];
  };
  const usedRoles = ROLES.filter((r) => [...roleMap.values()].includes(r));
  const focus = hover ?? sel;
  const neighbors = useMemo(() => {
    if (!focus) return null;
    const s = new Set([focus]);
    for (const e of net.edges) {
      if (e.source === focus) s.add(e.target);
      if (e.target === focus) s.add(e.source);
    }
    return s;
  }, [focus, net]);
  const top = useMemo(() => ranking(net, an, sizeBy), [net, an, sizeBy]);
  const labelSet = useMemo(
    () =>
      new Set(labels === 'todas' ? net.nodes.map((n) => n.id) : top.slice(0, 12).map((n) => n.id)),
    [labels, net, top],
  );

  // Coordenadas del puntero en el espacio de la red.
  const toNet = (cx: number, cy: number) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const scale = Math.max(box.w / r.width, box.h / r.height) / view.k;
    const vw = r.width * scale;
    const vh = r.height * scale;
    const ox = box.x + box.w / 2 - vw / 2 - view.x;
    const oy = box.y + box.h / 2 - vh / 2 - view.y;
    return { x: ox + (cx - r.left) * scale, y: oy + (cy - r.top) * scale, scale };
  };
  const aspect = size.h ? size.w / size.h : box.w / box.h;
  const { vb, u } = (() => {
    let w = box.w;
    let h = box.h;
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    w /= view.k;
    h /= view.k;
    return {
      vb: `${box.x + box.w / 2 - w / 2 - view.x} ${box.y + box.h / 2 - h / 2 - view.y} ${w} ${h}`,
      // Unidades de la red por píxel: los nodos y textos se dibujan en píxeles de pantalla.
      u: w / Math.max(1, size.w),
    };
  })();

  const onDown = (e: React.PointerEvent) => {
    const id = (e.target as Element).closest('[data-node]')?.getAttribute('data-node');
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { kind: id ? 'node' : 'pan', id: id ?? undefined, sx: e.clientX, sy: e.clientY };
    if (id) setSel(id);
    else setSel(null);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      const { scale } = toNet(e.clientX, e.clientY);
      setView((v) => ({
        ...v,
        x: v.x + (e.clientX - d.sx) * scale,
        y: v.y + (e.clientY - d.sy) * scale,
      }));
      d.sx = e.clientX;
      d.sy = e.clientY;
    } else if (d.id) {
      const p = toNet(e.clientX, e.clientY);
      const next = new Map(posRef.current);
      next.set(d.id, { x: p.x, y: p.y });
      posRef.current = next;
      setPos(next);
    }
  };
  const onUp = () => {
    drag.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    setView((v) => ({
      ...v,
      k: Math.min(6, Math.max(0.3, v.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12))),
    }));
  };

  const exportGexf = () =>
    downloadText(
      `${(chart.title || 'red').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.gexf`,
      toGexf(chart.title, net, an, posRef.current, sizeBy),
      'application/gexf+xml',
    );

  const selNode = sel ? net.nodes.find((n) => n.id === sel) : undefined;
  const selM = sel ? an.metrics.get(sel) : undefined;
  const communities = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const n of top) {
      const c = an.metrics.get(n.id)!.community;
      m.set(c, [...(m.get(c) ?? []), n.label]);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [top, an]);
  /** Puente que además une dos comunidades distintas: la «ruta estratégica» entre subredes. */
  function isBridge(id: string, a: string, b: string): boolean {
    return an.bridges.has(id) && an.metrics.get(a)!.community !== an.metrics.get(b)!.community;
  }
  const cuts = net.nodes.filter((n) => an.metrics.get(n.id)!.cut);
  const bridges = net.edges.filter((e) => isBridge(e.id, e.source, e.target));
  const name = (id: string) => net.nodes.find((n) => n.id === id)?.label ?? id;
  const usedKinds = [...new Set(net.edges.map((e) => e.kind))] as NetEdgeKind[];
  const usedTypes = [...new Set(net.nodes.map((n) => n.type))] as NetNodeType[];

  if (!net.nodes.length)
    return (
      <div className="grid h-full place-items-center p-6 text-center text-muted">
        Agrega elementos y vínculos en el diagrama: la red se construye sola aquí.
      </div>
    );

  return (
    <div className="absolute inset-0 grid grid-cols-[1fr_300px] max-[1200px]:grid-cols-1">
      <div className="relative min-h-[300px] bg-[#0f141b]">
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full cursor-grab touch-none select-none"
          viewBox={vb}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={onWheel}
          role="img"
          aria-label="Red de vínculos según la teoría de grafos"
        >
          <g>
            {net.edges.map((e) => {
              const a = pos.get(e.source);
              const b = pos.get(e.target);
              if (!a || !b) return null;
              const bridge = isBridge(e.id, e.source, e.target);
              const dim = neighbors && !(neighbors.has(e.source) && neighbors.has(e.target));
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={bridge ? '#ffffff' : NET_EDGE_DEFS[e.kind].color}
                  strokeWidth={bridge ? 3.2 : 0.8 + e.weight * 0.7}
                  strokeDasharray={
                    bridge ? '2 6' : e.kind.includes('por-confirmar') ? '6 5' : undefined
                  }
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={dim ? 0.08 : bridge ? 0.95 : 0.6}
                />
              );
            })}
          </g>
          <g>
            {net.nodes.map((n) => {
              const p = pos.get(n.id);
              if (!p) return null;
              const r = radius(n.id);
              const m = an.metrics.get(n.id)!;
              const dim = neighbors && !neighbors.has(n.id);
              const big = r > 22;
              const showLabel = labelSet.has(n.id) || n.id === focus;
              return (
                <g
                  key={n.id}
                  data-node={n.id}
                  transform={`translate(${p.x} ${p.y}) scale(${u})`}
                  opacity={dim ? 0.18 : 1}
                  className="cursor-pointer"
                  onPointerEnter={() => setHover(n.id)}
                  onPointerLeave={() => setHover(null)}
                >
                  {m.cut ? (
                    <circle
                      r={r + 5}
                      fill="none"
                      stroke="#ffd76a"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  ) : null}
                  {n.type === 'estructura' ? (
                    <rect
                      x={-r}
                      y={-r}
                      width={2 * r}
                      height={2 * r}
                      rx={r * 0.35}
                      fill={color(n.id)}
                      stroke={n.id === sel ? '#ffd76a' : '#ffffff'}
                      strokeWidth={n.id === sel ? 3 : 1.5}
                    />
                  ) : (
                    <circle
                      r={r}
                      fill={color(n.id)}
                      stroke={n.id === sel ? '#ffd76a' : '#ffffff'}
                      strokeWidth={n.id === sel ? 3 : 1.5}
                    />
                  )}
                  {showLabel ? (
                    big ? (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#fff"
                        fontSize={Math.min(13, r / 2.6)}
                        fontWeight="700"
                        style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.35)', strokeWidth: 2 }}
                      >
                        {n.label.length > 16 ? n.label.slice(0, 15) + '…' : n.label}
                      </text>
                    ) : (
                      <text
                        y={r + 11}
                        textAnchor="middle"
                        fill="#e8edf3"
                        fontSize="10"
                        style={{ paintOrder: 'stroke', stroke: '#0f141b', strokeWidth: 3 }}
                      >
                        {n.label}
                      </text>
                    )
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 rounded bg-[rgba(16,22,31,.9)] px-2 py-1.5 text-[12px] text-soft">
          <label className="flex items-center gap-1">
            Tamaño
            <select
              className="w-auto! py-0.5! text-[12px]!"
              value={sizeBy}
              onChange={(e) => setSizeBy(e.target.value as MetricKey)}
            >
              {METRICS.map((k) => (
                <option key={k} value={k}>
                  {METRIC_NAMES[k].name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Color
            <select
              className="w-auto! py-0.5! text-[12px]!"
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value as ColorBy)}
            >
              <option value="rol">Rol</option>
              <option value="community">Comunidad</option>
              <option value="type">Tipo</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            Rótulos
            <select
              className="w-auto! py-0.5! text-[12px]!"
              value={labels}
              onChange={(e) => setLabels(e.target.value as Labels)}
            >
              <option value="principales">Principales</option>
              <option value="todas">Todos</option>
            </select>
          </label>
          <button
            type="button"
            className="btn px-2! py-0.5! text-xs!"
            onClick={() => {
              setView({ x: 0, y: 0, k: 1 });
              setRestart((r) => r + 1);
            }}
          >
            Reorganizar
          </button>
          <button type="button" className="btn px-2! py-0.5! text-xs!" onClick={exportGexf}>
            Exportar GEXF (Gephi)
          </button>
        </div>

        {/* Leyenda */}
        <div className="absolute right-2 bottom-2 max-w-[330px] rounded bg-[rgba(255,255,255,.95)] px-3 py-2 text-[11px] text-[#1b2430] shadow">
          <div className="mb-1 font-bold">Leyenda</div>
          {colorBy === 'type' ? (
            usedTypes.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <i
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: TYPE_COLORS[t] }}
                />
                {NET_TYPE_NAMES[t]}
              </div>
            ))
          ) : colorBy === 'rol' ? (
            usedRoles.map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                <i
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: ROLE_DEFS[r].color }}
                />
                {ROLE_DEFS[r].name}
              </div>
            ))
          ) : (
            <div>Color = comunidad (subred detectada por modularidad)</div>
          )}
          <div className="mt-1">Tamaño = {METRIC_NAMES[sizeBy].name.toLowerCase()}</div>
          {usedKinds.map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <svg width="22" height="6" aria-hidden>
                <line
                  x1="1"
                  y1="3"
                  x2="21"
                  y2="3"
                  stroke={NET_EDGE_DEFS[k].color}
                  strokeWidth="2"
                  strokeDasharray={k.includes('por-confirmar') ? '4 3' : undefined}
                />
              </svg>
              {NET_EDGE_DEFS[k].name}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <svg width="22" height="6" aria-hidden>
              <line
                x1="1"
                y1="3"
                x2="21"
                y2="3"
                stroke="#111"
                strokeWidth="3"
                strokeDasharray="2 4"
                strokeLinecap="round"
              />
            </svg>
            Vínculo puente entre comunidades (si se corta, se separan)
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="22" height="14" aria-hidden>
              <circle
                cx="11"
                cy="7"
                r="5"
                fill="#9aa3ad"
                stroke="#d9a400"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
            </svg>
            Punto de corte (actor que conecta partes de la red)
          </div>
        </div>
        <div className="absolute bottom-2 left-2 text-[11px] text-muted">
          Arrastra el fondo para moverte · rueda para acercar · arrastra un nodo para ubicarlo
        </div>
      </div>

      <aside className="ws-side border-l border-line">
        <section className="sec">
          <h3 className="sec-h">Resumen de la red</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
            <dt className="text-muted">Nodos</dt>
            <dd className="font-mono">{net.nodes.length}</dd>
            <dt className="text-muted">Vínculos</dt>
            <dd className="font-mono">{net.edges.length}</dd>
            <dt className="text-muted">Densidad</dt>
            <dd className="font-mono">{fmt(an.density, 3)}</dd>
            <dt className="text-muted">Grado medio</dt>
            <dd className="font-mono">{fmt(an.averageDegree)}</dd>
            <dt className="text-muted">Comunidades</dt>
            <dd className="font-mono">
              {an.communities} · Q = {fmt(an.modularity, 3)}
            </dd>
            <dt className="text-muted">Componentes</dt>
            <dd className="font-mono">{an.components}</dd>
          </dl>
        </section>

        {selNode && selM ? (
          <section className="sec">
            <h3 className="sec-h">{selNode.label}</h3>
            <p className="note mb-1">
              {NET_TYPE_NAMES[selNode.type]}
              {selNode.sub ? ` · ${selNode.sub}` : ''}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
              <dt className="text-muted">Grado</dt>
              <dd className="font-mono">{selM.degree}</dd>
              {METRICS.filter((k) => k !== 'degree').map((k) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{METRIC_NAMES[k].name}</dt>
                  <dd className="font-mono">{fmt(selM[k], 3)}</dd>
                </div>
              ))}
              <dt className="text-muted">Comunidad</dt>
              <dd>
                <i
                  className="mr-1 inline-block size-2.5 rounded-full align-middle"
                  style={{ background: communityColor(selM.community) }}
                />
                {selM.community + 1}
              </dd>
            </dl>
            {selM.cut ? (
              <p className="note mt-1 text-[#ffd76a]">
                Punto de corte: si se neutraliza, la red queda dividida.
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="sec">
          <h3 className="sec-h">Actores clave · {METRIC_NAMES[sizeBy].name}</h3>
          <p className="note mb-1">{METRIC_NAMES[sizeBy].hint}</p>
          <ol className="grid gap-0.5 text-[13px]">
            {top.slice(0, 10).map((n, i) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-1 text-left hover:bg-panel-2"
                  onClick={() => setSel(n.id)}
                >
                  <span className="w-4 text-right font-mono text-muted">{i + 1}</span>
                  <i
                    className="inline-block size-2.5 flex-none rounded-full"
                    style={{ background: color(n.id) }}
                  />
                  <span className="min-w-0 flex-1 truncate">{n.label}</span>
                  <span className="font-mono text-muted">
                    {sizeBy === 'degree'
                      ? an.metrics.get(n.id)!.degree
                      : fmt(an.metrics.get(n.id)![sizeBy], 2)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="sec">
          <h3 className="sec-h">Comunidades ({communities.length})</h3>
          <ul className="grid gap-1 text-[12px]">
            {communities.map(([c, members]) => (
              <li key={c} className="flex gap-1.5">
                <i
                  className="mt-1 inline-block size-2.5 flex-none rounded-full"
                  style={{ background: communityColor(c) }}
                />
                <span>
                  <b>{members.length}</b> · {members.slice(0, 4).join(', ')}
                  {members.length > 4 ? '…' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sec">
          <h3 className="sec-h">Puntos de corte y puentes</h3>
          {cuts.length ? (
            <p className="text-[12px]">
              <span className="text-muted">Actores que conectan partes de la red: </span>
              {cuts.map((n) => n.label).join(', ')}
            </p>
          ) : (
            <p className="note">No hay puntos de corte: la red no depende de un solo actor.</p>
          )}
          {bridges.length ? (
            <ul className="mt-1 grid gap-0.5 text-[12px]">
              {bridges.map((e) => (
                <li key={e.id}>
                  {name(e.source)} ↔ {name(e.target)}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
