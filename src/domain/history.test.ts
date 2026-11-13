import { describe, expect, it } from 'vitest';
import {
  COALESCE_MS,
  HISTORY_LIMIT,
  emptyHistory,
  record,
  redo,
  undo,
  type Snapshot,
} from './history';
import { blankScenario } from './sample';

const snap = (name: string, current = 0): Snapshot => ({
  scenario: { ...blankScenario(), name },
  current,
});

describe('historial de deshacer y rehacer', () => {
  it('deshace y rehace en orden', () => {
    let h = emptyHistory();
    h = record(h, snap('A'), undefined, 0);
    h = record(h, snap('B'), undefined, 10);
    const present = snap('C');

    const u1 = undo(h, present)!;
    expect(u1.snapshot.scenario.name).toBe('B');
    const u2 = undo(u1.history, u1.snapshot)!;
    expect(u2.snapshot.scenario.name).toBe('A');
    expect(undo(u2.history, u2.snapshot)).toBeNull();

    const r1 = redo(u2.history, u2.snapshot)!;
    expect(r1.snapshot.scenario.name).toBe('B');
    const r2 = redo(r1.history, r1.snapshot)!;
    expect(r2.snapshot.scenario.name).toBe('C');
    expect(redo(r2.history, r2.snapshot)).toBeNull();
  });

  it('un cambio nuevo borra lo que se podía rehacer', () => {
    let h = record(emptyHistory(), snap('A'), undefined, 0);
    h = undo(h, snap('B'))!.history;
    expect(h.future).toHaveLength(1);
    h = record(h, snap('A'), undefined, 10);
    expect(h.future).toHaveLength(0);
  });

  it('agrupa cambios seguidos del mismo campo', () => {
    let h = emptyHistory();
    h = record(h, snap('T'), 'phase:0:title', 0);
    h = record(h, snap('Ti'), 'phase:0:title', 300);
    h = record(h, snap('Tit'), 'phase:0:title', 600);
    expect(h.past.map((s) => s.scenario.name)).toEqual(['T']);

    // Tras una pausa larga o en otro campo, es un paso nuevo.
    h = record(h, snap('Titulo'), 'phase:0:title', 600 + COALESCE_MS);
    h = record(h, snap('x'), 'phase:0:desc', 600 + COALESCE_MS + 1);
    expect(h.past).toHaveLength(3);
  });

  it('después de deshacer no agrupa con el cambio anterior', () => {
    let h = record(emptyHistory(), snap('A'), 'name', 0);
    h = undo(h, snap('B'))!.history;
    h = record(h, snap('A'), 'name', 10);
    expect(h.past).toHaveLength(1);
  });

  it(`guarda como máximo ${HISTORY_LIMIT} pasos`, () => {
    let h = emptyHistory();
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) h = record(h, snap(String(i)), undefined, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]!.scenario.name).toBe('5');
  });
});
