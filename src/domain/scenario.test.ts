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
import { symbolColors, usesIconText } from './catalog';
import { FACTION_IDS, POINT_TYPES, UNIT_TYPES } from './ids';
import { echelonSVG, esc, iconSpecFor, pointSVG, unitSVG } from './symbols';
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
    // El símbolo DIVFE ya muestra "OBJ"; la etiqueta queda libre para el nombre.
    expect(p.label).toBe('');
    const ponal = createObject(
      { kind: 'unit', type: 'policia', frame: { lat: 1, lng: 2 } },
      'azul',
      0,
      'ponal',
    );
    expect(ponal.force).toBe('ponal');
    // Una estructura GAO no se guarda en un objeto amigo.
    expect(
      createObject({ kind: 'unit', type: 'gao', frame: { lat: 1, lng: 2 } }, 'azul', 0, 'eln')
        .force,
    ).toBeUndefined();
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

  it('unitSVG usa el marco de la identidad estándar del MFRE 1-02', () => {
    expect(unitSVG({ type: 'infanteria', faction: 'azul' })).toContain('<rect x="8" y="20"');
    expect(unitSVG({ type: 'infanteria', faction: 'roja' })).toContain(
      '<polygon points="30,12 52,34 30,56 8,34"/>',
    );
    expect(unitSVG({ type: 'infanteria', faction: 'verde' })).toContain('<rect x="16" y="20"');
    // Desconocido: trébol de cuatro hojas, no círculo.
    expect(unitSVG({ type: 'infanteria', faction: 'amarilla' })).toContain('a8 8 0 0 1 16 0');
  });

  it('colores: identidad por defecto y fuerza o estructura GAO', () => {
    expect(unitSVG({ type: 'infanteria', faction: 'azul' })).toContain('fill="#00AEEF"');
    expect(unitSVG({ type: 'infanteria', faction: 'azul', force: 'arc' })).toContain(
      'fill="#00FFFF"',
    );
    expect(unitSVG({ type: 'gao', faction: 'roja', force: 'eln' })).toContain('fill="#FF0000"');
    // Una fuerza de otra identidad se ignora.
    expect(unitSVG({ type: 'infanteria', faction: 'roja', force: 'ejc' })).toContain(
      'fill="#ED1C24"',
    );
    expect(symbolColors('azul', 'ponal')).toEqual({ fill: '#3366FF', ink: '#fff' });
  });

  it('escalones gráficos: puntos, barras, aspas y comando', () => {
    expect(echelonSVG('•••', 18).match(/<circle/g)).toHaveLength(3);
    expect(echelonSVG('II', 18).match(/<rect/g)).toHaveLength(2);
    expect(echelonSVG('XX', 18).match(/stroke="#000"/g)).toHaveLength(2);
    expect(echelonSVG('++', 18).match(/stroke="#000"/g)).toHaveLength(2);
    expect(echelonSVG('Ø', 18)).toContain('>Ø</text>');
    expect(echelonSVG('', 18)).toBe('');
  });

  it('amplificadores: planeada, fuerza de tarea, refuerzo y eficacia', () => {
    const svg = unitSVG({
      type: 'especiales',
      faction: 'azul',
      echelon: 'I',
      status: 'planeado',
      taskForce: true,
      reinforced: '+',
      effectiveness: 'BO',
      mobility: 'asalto-aereo',
      mod1: 'ASLT',
    });
    expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain('M17 20V8H43V20');
    expect(svg).toContain('>+</text>');
    expect(svg).toContain('fill="#FFF200"');
    expect(svg).toContain('>FF.EE</text>');
    expect(svg).toContain('>ASLT</text>');
  });

  it('el texto del ícono se escapa y los tipos por nombre usan su valor por defecto', () => {
    expect(unitSVG({ type: 'nombre', faction: 'azul' })).toContain('>DIVFE</text>');
    expect(unitSVG({ type: 'nombre', faction: 'azul', iconText: '<BR18>' })).toContain(
      '&lt;BR18&gt;',
    );
    expect(usesIconText('unit', 'nombre')).toBe(true);
    expect(usesIconText('unit', 'infanteria')).toBe(false);
    expect(usesIconText('point', 'control')).toBe(true);
    expect(usesIconText('point', 'evento')).toBe(false);
  });

  it('todos los tipos de unidad y punto generan SVG', () => {
    const isSvg = (s: string) => s.startsWith('<svg') && s.endsWith('</svg>');
    for (const type of UNIT_TYPES)
      for (const faction of FACTION_IDS) expect(isSvg(unitSVG({ type, faction }))).toBe(true);
    for (const type of POINT_TYPES) {
      // El rótulo y las fichas (perfiles, grafos) no son símbolos SVG.
      if (type === 'texto' || type === 'perfil' || type === 'grafo') continue;
      expect(isSvg(pointSVG(type, { color: '#f00', fill: '#0f0' }))).toBe(true);
    }
  });

  it('puntos DIVFE: banderín de control con número y objetivo numerado', () => {
    expect(pointSVG('control', { color: '#000', iconText: '71' })).toContain('>71</text>');
    expect(pointSVG('objetivo', { color: '#000', iconText: '2' })).toContain('>OBJ</text>');
    expect(pointSVG('objetivo', { color: '#000', iconText: '2' })).toContain('>2</text>');
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

describe('patchObject con campos MFRE', () => {
  it('quita la fuerza si no corresponde a la nueva identidad y limpia vacíos', () => {
    const s = sampleScenario();
    const id = s.objects[0]!.id;
    let r = patchObject(s, id, { force: 'arc', mod1: 'ASLT', taskForce: true });
    expect(r.objects[0]).toMatchObject({ force: 'arc', mod1: 'ASLT', taskForce: true });
    r = patchObject(r, id, { faction: 'roja', mod1: '', taskForce: false, status: 'presente' });
    const o = r.objects[0] as UnitObject;
    expect(o.force).toBeUndefined();
    expect('mod1' in o).toBe(false);
    expect('taskForce' in o).toBe(false);
    expect('status' in o).toBe(false);
  });
});
