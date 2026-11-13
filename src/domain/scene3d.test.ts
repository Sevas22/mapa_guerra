import { describe, expect, it } from 'vitest';
import { BASEMAPS, OVERLAYS, basemapById } from './basemaps';
import { exerciseScenario } from './exercise';
import { createObject } from './scenario';
import {
  arrowHead,
  glLayers,
  glTileUrls,
  labelAnchor,
  sceneAt,
  toGlZoom,
  toLeafletZoom,
} from './scene3d';
import { pathKm } from './travel';
import type { LatLngTuple, LineObject } from './types';

describe('vista 3D: capas y zoom', () => {
  it('convierte el zoom entre Leaflet (256 px) y MapLibre (512 px)', () => {
    expect(toGlZoom(10)).toBe(9);
    expect(toLeafletZoom(toGlZoom(13))).toBe(13);
  });

  it('expande subdominios y quita {r} en las URL de mosaicos', () => {
    expect(
      glTileUrls({
        url: 'https://{s}.t.org/{z}/{x}/{y}{r}.png',
        attribution: '',
        subdomains: 'ab',
      }),
    ).toEqual(['https://a.t.org/{z}/{x}/{y}.png', 'https://b.t.org/{z}/{x}/{y}.png']);
    expect(glTileUrls({ url: 'https://x.org/{z}/{y}/{x}', attribution: '' })).toEqual([
      'https://x.org/{z}/{y}/{x}',
    ]);
  });

  it('omite las capas IGAC/DANE y cambia la ortoimagen por el satélite', () => {
    const orto = BASEMAPS.find((b) => b.source.kind === 'arcgis')!;
    const igac = OVERLAYS.filter((o) => o.source.kind === 'arcgis');
    const labels = OVERLAYS.find((o) => o.id === 'etiquetas')!;
    const r = glLayers(orto, [labels, ...igac], basemapById('satelite'));
    expect(r.layers.map((l) => l.id)).toEqual(['satelite', 'etiquetas']);
    expect(r.skipped).toBe(igac.length + 1);
  });
});

describe('vista 3D: geometría', () => {
  const line: LatLngTuple[] = [
    [4.0, -74.0],
    [4.1, -74.0],
  ];

  it('la punta de flecha del eje apunta en la dirección del último tramo', () => {
    const head = arrowHead(line)!;
    expect(head).toHaveLength(3);
    // La punta queda más al norte que el extremo y la base, más al sur.
    expect(head[0]![0]).toBeGreaterThan(4.1);
    expect(head[1]![0]).toBeLessThan(4.1);
    // Base simétrica respecto al eje.
    expect(head[1]![1] + head[2]![1]).toBeCloseTo(2 * -74.0, 6);
    // Entre 150 m y 3 km.
    const size = pathKm([head[0]!, [head[1]![0], -74.0]]);
    expect(size).toBeGreaterThan(0.15);
    expect(size).toBeLessThanOrEqual(3);
    expect(arrowHead([line[0]!])).toBeNull();
  });

  it('la etiqueta va a mitad del recorrido o en el centro del área', () => {
    const at = labelAnchor(
      [
        [4.0, -74.0],
        [4.0, -73.9],
        [4.0, -73.6],
      ],
      false,
    )!;
    expect(at[0]).toBeCloseTo(4.0, 6);
    expect(at[1]).toBeCloseTo(-73.8, 3);
    expect(
      labelAnchor(
        [
          [0, 0],
          [0, 2],
          [2, 2],
          [2, 0],
        ],
        true,
      ),
    ).toEqual([1, 1]);
  });
});

describe('vista 3D: escena', () => {
  it('incluye símbolos, trazos, áreas, tareas y etiquetas del Ejercicio Halcón', () => {
    const s = exerciseScenario();
    const n = s.phases.length;
    for (let p = 0; p < n; p++) {
      const scene = sceneAt(s.objects, p, n, null);
      const visibles = s.objects.filter((o) => o.start <= p && (o.end == null || o.end >= p));
      const points = visibles.filter((o) => o.kind !== 'line').length;
      expect(scene.points).toHaveLength(points);
      for (const f of scene.shapes.features) {
        expect(f.properties.opacity).toBeGreaterThan(0);
        expect(f.properties.opacity).toBeLessThanOrEqual(1);
        const ring =
          f.geometry.type === 'Polygon' ? f.geometry.coordinates[0]! : f.geometry.coordinates;
        // GeoJSON es [lng, lat]: en Colombia la longitud es negativa y la latitud, pequeña.
        for (const [lng, lat] of ring) {
          expect(lng).toBeLessThan(-60);
          expect(Math.abs(lat!)).toBeLessThan(15);
        }
      }
    }
    const all = s.objects.flatMap((_, i) => sceneAt(s.objects, i, n, null).labels);
    expect(all.some((l) => l.className === 'gl-tip' && l.html.includes('area-badge'))).toBe(true);
  });

  it('dibuja el eje con punta, la zona con relleno y la tarea con halo y letras', () => {
    const at = (type: LineObject['type'], pts: LatLngTuple[]) =>
      createObject({ kind: 'line', type, frame: { pts } }, 'azul', 0) as LineObject;
    const eje = at('eje', [
      [4.0, -74.0],
      [4.1, -74.0],
    ]);
    const zona = at('zona', [
      [4.0, -74.0],
      [4.0, -73.9],
      [4.1, -73.9],
    ]);
    const tarea = at('bloquear', [
      [4.0, -74.0],
      [4.0, -73.95],
    ]);
    const scene = sceneAt([eje, zona, tarea], 0, 1, tarea.id);
    const of = (id: string) => scene.shapes.features.filter((f) => f.properties.id === id);
    expect(of(eje.id).map((f) => f.properties.kind)).toEqual(['line', 'fill']);
    expect(of(zona.id).map((f) => [f.properties.kind, f.properties.dashed])).toEqual([
      ['fill', false],
      ['line', true],
    ]);
    const task = of(tarea.id);
    // Mitad halos oscuros y mitad líneas; seleccionada, en amarillo.
    expect(task.length % 2).toBe(0);
    expect(task.slice(task.length / 2).every((f) => f.properties.color === '#FFD23F')).toBe(true);
    expect(scene.labels.some((l) => l.id === tarea.id && l.className === 'task-lbl')).toBe(true);
  });
});
