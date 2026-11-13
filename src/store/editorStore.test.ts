import { beforeEach, describe, expect, it } from 'vitest';
import { blankScenario } from '@/domain/sample';
import { useEditorStore } from './editorStore';

const st = () => useEditorStore.getState();
const place = (lat: number, lng: number) => {
  st().setTool({ mode: 'place', kind: 'unit', type: 'infanteria' });
  st().mapClick({ lat, lng }, false);
};

describe('deshacer y rehacer en el editor', () => {
  beforeEach(() => st().loadScenario(blankScenario()));

  it('cargar un escenario empieza con el historial vacío', () => {
    expect(st().history.past).toHaveLength(0);
    expect(st().history.future).toHaveLength(0);
  });

  it('deshace y rehace colocar y borrar un objeto', () => {
    place(4.7, -74.1);
    const id = st().selectedId!;
    expect(st().scenario.objects).toHaveLength(1);

    st().deleteSelected();
    expect(st().scenario.objects).toHaveLength(0);

    st().undo();
    expect(st().scenario.objects.map((o) => o.id)).toEqual([id]);
    st().undo();
    expect(st().scenario.objects).toHaveLength(0);
    expect(st().selectedId).toBeNull();

    st().redo();
    st().redo();
    expect(st().scenario.objects).toHaveLength(0);
    st().undo();
    expect(st().scenario.objects).toHaveLength(1);
  });

  it('escribir una etiqueta seguida cuenta como un solo paso', () => {
    place(4.7, -74.1);
    const id = st().selectedId!;
    for (const label of ['C', 'CI', 'CIA', 'CIA A']) st().updateObject(id, { label });
    expect(st().history.past).toHaveLength(2);
    st().undo();
    expect(st().scenario.objects[0]!.label).toBe('');
  });

  it('deshacer restaura la fase en la que se hizo el cambio', () => {
    st().addPhase();
    expect(st().current).toBe(1);
    st().undo();
    expect(st().scenario.phases).toHaveLength(1);
    expect(st().current).toBe(0);
  });

  it('marcar punto con nombre es un solo paso', () => {
    st().setGotoTarget({ lat: 4.7, lng: -74.1, name: 'Bogotá' });
    st().addGotoPoint();
    expect(st().scenario.objects[0]!.label).toBe('Bogotá');
    expect(st().history.past).toHaveLength(1);
    st().undo();
    expect(st().scenario.objects).toHaveLength(0);
  });

  it('mientras se dibuja, deshacer quita el último vértice', () => {
    st().setTool({ mode: 'draw', kind: 'line', type: 'ruta' });
    st().mapClick({ lat: 4.7, lng: -74.1 }, false);
    st().mapClick({ lat: 4.8, lng: -74.2 }, false);
    st().undo();
    expect(st().draft).toHaveLength(1);
    st().undo();
    expect(st().draft).toBeNull();
    expect(st().history.past).toHaveLength(0);
  });
});
