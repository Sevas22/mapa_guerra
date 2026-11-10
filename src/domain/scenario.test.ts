import { describe, expect, it } from 'vitest';
import { sampleScenario } from './sample';
import {
  createObject,
  dedupeVertices,
  duplicateObject,
  patchObject,
  removeObject,
  setObjectFrame,
} from './scenario';
import { esc, iconSpecFor, unitSVG } from './symbols';
import type { LineObject, PointObject, UnitObject } from './types';

describe('objetos', () => {
  it('createObject usa los valores por defecto del prototipo', () => {
    const u = createObject(
      { kind: 'unit', type: 'blindados', frame: { lat: 1, lng: 2 } },
      'roja',
      3,
    ) as UnitObject;
    expect(u).toMatchObject({ kind: 'unit', echelon: 'I', label: '', start: 3, end: null });
    expect(u.frames).toEqual({ 3: { lat: 1, lng: 2 } });

    const p = createObject(
      { kind: 'point', type: 'objetivo', frame: { lat: 1, lng: 2 } },
      'azul',
      0,
    );
    expect(p.label).toBe('OBJ');
  });

  it('duplicateObject desplaza todos los frames y cambia el id', () => {
    const s = sampleScenario();
    const ln = s.objects.find((o) => o.kind === 'line') as LineObject;
    const d = duplicateObject(ln) as LineObject;
    expect(d.id).not.toBe(ln.id);
    expect(d.frames[0]?.pts[0]?.[0]).toBeCloseTo((ln.frames[0]?.pts[0]?.[0] ?? 0) - 0.004);
    expect(d.frames[0]?.pts[0]?.[1]).toBeCloseTo((ln.frames[0]?.pts[0]?.[1] ?? 0) + 0.004);
    const un = s.objects[0] as UnitObject;
    const du = duplicateObject(un) as UnitObject;
    expect(du.frames[1]?.lat).toBeCloseTo((un.frames[1]?.lat ?? 0) - 0.004);
    expect(un.frames[1]?.lat).toBe(4.262); // original intacto
  });

  it('setObjectFrame, patchObject y removeObject', () => {
    const s = sampleScenario();
    const id = s.objects[2]!.id;
    const s2 = setObjectFrame(s, id, 1, { lat: 9, lng: 9 });
    expect((s2.objects[2] as UnitObject).frames[1]).toEqual({ lat: 9, lng: 9 });
    expect((s.objects[2] as UnitObject).frames[1]).toBeUndefined();

    const s3 = patchObject(s2, id, { start: 2, end: 1 });
    expect(s3.objects[2]).toMatchObject({ start: 2, end: 2 });

    expect(removeObject(s3, id).objects).toHaveLength(s.objects.length - 1);
  });

  it('dedupeVertices elimina vértices consecutivos a menos de 5 px', () => {
    const pts = [0, 3, 10, 12, 20];
    expect(dedupeVertices(pts, (a, b) => Math.abs(a - b))).toEqual([0, 10, 20]);
  });
});

describe('símbolos', () => {
  it('escapa HTML', () => {
    expect(esc('<b>"x"&\'y\'</b>')).toBe('&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/b&gt;');
  });

  it('unitSVG dibuja el marco del bando y el escalón', () => {
    const svg = unitSVG('infanteria', 'roja', 'II');
    expect(svg).toContain('<polygon points="28,11 44,27 28,43 12,27"/>');
    expect(svg).toContain('>II</text>');
    expect(unitSVG('pc', 'azul', '')).not.toContain('paint-order');
  });

  it('iconSpecFor marca la selección y escapa la etiqueta', () => {
    const p: PointObject = {
      id: 'p',
      kind: 'point',
      type: 'texto',
      faction: 'verde',
      label: '<x>',
      notes: '',
      start: 0,
      end: null,
      frames: { 0: { lat: 0, lng: 0 } },
    };
    const spec = iconSpecFor(p, true);
    expect(spec.html).toContain('class="txt sel"');
    expect(spec.html).toContain('&lt;x&gt;');
  });
});
