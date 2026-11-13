import { describe, expect, it } from 'vitest';
import { argosScenario } from './argos';
import { LINES } from './catalog';
import { EXAMPLES } from './sample';
import { parseScenarioJSON } from './schema';
import { frameAt, visibleAt } from './timeline';

describe('Ejercicio Argos (inteligencia integrada, ficticio)', () => {
  const s = argosScenario();
  const n = s.phases.length;
  const reports = s.objects.filter((o) => o.kind === 'point' && /^[A-Z]+\d+$/.test(o.label));

  it('es un escenario válido que sobrevive a exportar e importar', () => {
    const r = parseScenarioJSON(JSON.stringify(s));
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.parse(JSON.stringify(r.scenario))).toEqual(JSON.parse(JSON.stringify(s)));
  });

  it('cada objeto es visible en alguna fase y los trazos respetan su número de puntos', () => {
    for (const o of s.objects) {
      expect(
        s.phases.some((_, i) => visibleAt(o, i)),
        o.label || o.type,
      ).toBe(true);
      if (o.kind !== 'line') continue;
      const k = frameAt(o, o.start).pts.length;
      expect(k).toBeGreaterThanOrEqual(LINES[o.type].min);
      if (LINES[o.type].max) expect(k).toBeLessThanOrEqual(LINES[o.type].max!);
    }
  });

  it('cada registro tiene disciplina y límite de evidencia, y no hay códigos repetidos', () => {
    expect(reports.length).toBeGreaterThanOrEqual(25);
    for (const r of reports) expect(r.notes).toMatch(/Límite: .+/);
    const codes = reports.map((r) => r.label);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('el expediente se densifica: los registros se acumulan fase a fase', () => {
    const count = s.phases.map((_, i) => reports.filter((r) => visibleAt(r, i)).length);
    for (let i = 1; i < n - 1; i++) expect(count[i]).toBeGreaterThanOrEqual(count[i - 1]!);
    expect(count[0]).toBe(0);
    expect(count[n - 2]).toBe(reports.length);
    // En la acción final los registros ya no se dibujan: la fase se lee limpia.
    expect(count[n - 1]).toBe(0);
  });

  it('el objetivo es posible antes de la acción y confirmado solo en la última fase', () => {
    const posible = s.objects.find((o) => o.label === 'ÉCHO (posible)');
    const confirmado = s.objects.find((o) => o.label === 'ÉCHO');
    expect(posible && 'status' in posible && posible.status).toBe('planeado');
    expect(s.phases.map((_, i) => visibleAt(confirmado!, i))).toEqual(
      s.phases.map((_, i) => i === n - 1),
    );
  });

  it('aparece en el menú de ejemplos', () => {
    expect(EXAMPLES.map((e) => e.name)).toContain('Ejercicio Argos (inteligencia integrada)');
  });
});
