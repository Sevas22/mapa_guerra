import { describe, expect, it } from 'vitest';
import { LINES } from './catalog';
import { LINE_TYPES } from './ids';
import { parseScenario } from './schema';
import { previewLine } from './symbols';
import { TASKS, TASK_IDS, isTaskType, previewTask, taskGeometry } from './tasks';

describe('tareas tácticas (MFRE 1-02, capítulo 9)', () => {
  it('todas las tareas son tipos de trazo de dos puntos', () => {
    for (const id of TASK_IDS) {
      expect(LINE_TYPES).toContain(id);
      expect(LINES[id]).toMatchObject({ min: 2, max: 2, name: TASKS[id].name });
      expect(isTaskType(id)).toBe(true);
    }
    expect(isTaskType('frente')).toBe(false);
    expect(isTaskType('ao')).toBe(false);
  });

  it('cada figura tiene trazos válidos y finitos', () => {
    for (const id of TASK_IDS) {
      const s = TASKS[id].shape();
      expect(s.paths.length).toBeGreaterThan(0);
      for (const p of s.paths) {
        expect(p.pts.length).toBeGreaterThanOrEqual(2);
        for (const [x, y] of p.pts) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      }
    }
  });

  it('las letras siguen el manual', () => {
    const letters = (id: (typeof TASK_IDS)[number]) => TASKS[id].shape().labels.map((l) => l.text);
    expect(letters('bloquear')).toEqual(['B']);
    expect(letters('asegurar')).toEqual(['S']);
    expect(letters('destruir')).toEqual(['D']);
    expect(letters('romper-contacto')).toEqual(['DIS']);
    expect(letters('repliegue-presion')).toEqual(['WP']);
    expect(letters('contraataque')).toEqual(['CATK']);
    expect(letters('seguridad-proteger')).toEqual(['G', 'G']);
  });

  it('taskGeometry lleva el eje x de A a B', () => {
    const a: [number, number] = [4, -74];
    const b: [number, number] = [4, -73.9];
    const g = taskGeometry('bloquear', a, b);
    const [start, end] = g.paths[0]!.pts;
    expect(start![0]).toBeCloseTo(4);
    expect(start![1]).toBeCloseTo(-74);
    // La línea de bloquear llega al 80 % del trayecto.
    expect(end![1]).toBeCloseTo(-74 + 0.08, 4);
    expect(end![0]).toBeCloseTo(4);
    // La barra es perpendicular: misma longitud, distinta latitud.
    const [t, bt] = g.paths[1]!.pts;
    expect(t![1]).toBeCloseTo(bt![1], 6);
    expect(t![0]).toBeGreaterThan(bt![0]);
    expect(g.labels[0]).toMatchObject({ text: 'B' });
  });

  it('girar los dos puntos gira la figura', () => {
    const a: [number, number] = [0, 0];
    const east = taskGeometry('atacar-fuego', a, [0, 1]);
    const north = taskGeometry('atacar-fuego', a, [1, 0]);
    // La punta de la flecha queda en B en ambos casos.
    const tip = (g: ReturnType<typeof taskGeometry>) => g.paths[1]!.pts[1]!;
    expect(tip(east)[0]).toBeCloseTo(0);
    expect(tip(east)[1]).toBeCloseTo(1);
    expect(tip(north)[0]).toBeCloseTo(1);
    expect(tip(north)[1]).toBeCloseTo(0);
  });

  it('las tareas circulares usan A como centro y |AB| como radio', () => {
    const g = taskGeometry('asegurar', [0, 0], [0, 0.01]);
    for (const [lat, lng] of g.paths[0]!.pts) expect(Math.hypot(lat, lng)).toBeCloseTo(0.01, 6);
  });

  it('las vistas previas son SVG', () => {
    for (const id of TASK_IDS) expect(previewTask(id, '#fff')).toMatch(/^<svg[\s\S]*<\/svg>$/);
    expect(previewLine('ao', '#fff')).toContain('>AO</text>');
  });

  it('un escenario con tareas y áreas se valida', () => {
    const r = parseScenario({
      phases: [{}],
      objects: [
        {
          kind: 'line',
          type: 'bloquear',
          frames: {
            0: {
              pts: [
                [4, -74],
                [4, -73.9],
              ],
            },
          },
        },
        {
          kind: 'line',
          type: 'ani',
          label: 'Casa blanca',
          frames: {
            0: {
              pts: [
                [4, -74],
                [4.1, -74],
                [4.1, -73.9],
              ],
            },
          },
        },
      ],
    });
    expect(r.ok && r.scenario.objects.map((o) => o.type)).toEqual(['bloquear', 'ani']);
  });
});
