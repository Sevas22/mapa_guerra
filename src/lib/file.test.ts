import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STORE_KEY } from '@/domain/catalog';
import { sampleScenario } from '@/domain/sample';
import { parseScenarioJSON } from '@/domain/schema';
import { frameAt, visibleAt } from '@/domain/timeline';
import { scenarioFileName, serializeScenario } from './file';
import { LocalScenarioRepository, formatSaved, repositoryStorage } from './repository';

/** JSON exportado desde `referencia/mapa-tactico-colombia.html` (con fase añadida y objetos nuevos). */
const prototypeExport = readFileSync(
  fileURLToPath(new URL('./__fixtures__/prototipo-export.json', import.meta.url)),
  'utf8',
);

describe('importar JSON del prototipo', () => {
  it('se importa sin cambios y se reexporta idéntico', () => {
    const r = parseScenarioJSON(prototypeExport);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.parse(serializeScenario(r.scenario))).toEqual(JSON.parse(prototypeExport));
  });

  it('conserva claves de frames con huecos y fases sin vista', () => {
    const r = parseScenarioJSON(prototypeExport);
    if (!r.ok) throw new Error(r.error);
    const s = r.scenario;
    expect(s.phases[3]?.view).toBeNull();
    const bi1 = s.objects.find((o) => o.label === 'BI-1');
    expect(bi1 && frameAt(bi1, 2)).toEqual({ lat: 4.262, lng: -74.622 });
    expect(bi1 && frameAt(bi1, 3)).toEqual({ lat: 4.24, lng: -74.603 });
    const roja = s.objects.find((o) => o.label === 'Roja R');
    expect(roja && visibleAt(roja, 1)).toBe(false);
  });
});

describe('scenarioFileName', () => {
  it('normaliza acentos y símbolos', () => {
    expect(scenarioFileName('Ejercicio Cordillera (ejemplo ficticio)')).toBe(
      'ejercicio-cordillera-ejemplo-ficticio.json',
    );
    expect(scenarioFileName('Operación Ñandú · Día 3')).toBe('operacion-nandu-dia-3.json');
    expect(scenarioFileName('')).toBe('escenario.json');
    expect(scenarioFileName('¡¡¡')).toBe('escenario.json');
  });
});

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  fail = false;
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    if (this.fail) throw new Error('QuotaExceededError');
    this.m.set(k, v);
  }
}

describe('LocalScenarioRepository', () => {
  it('guarda en la clave del prototipo y vuelve a cargar', () => {
    const st = new MemoryStorage();
    const repo = new LocalScenarioRepository(STORE_KEY, () => st);
    const s = sampleScenario();
    repo.save(s);
    expect(st.getItem('mapa-tactico-co-v1')).toBe(JSON.stringify(s));
    expect(repo.load()).toEqual(s);
  });

  it('ignora datos corruptos o inválidos', () => {
    const st = new MemoryStorage();
    const repo = new LocalScenarioRepository(STORE_KEY, () => st);
    st.setItem(STORE_KEY, '{roto');
    expect(repo.load()).toBeNull();
    st.setItem(STORE_KEY, JSON.stringify({ phases: [] }));
    expect(repo.load()).toBeNull();
    expect(new LocalScenarioRepository(STORE_KEY, () => undefined).load()).toBeNull();
  });

  it('repositoryStorage guarda con retardo y avisa del error', async () => {
    const st = new MemoryStorage();
    const repo = new LocalScenarioRepository(STORE_KEY, () => st);
    const events: string[] = [];
    const storage = repositoryStorage(
      repo,
      { onSaved: () => events.push('ok'), onError: () => events.push('error') },
      5,
    );
    const s = sampleScenario();
    storage.setItem('x', { state: { scenario: s }, version: 0 });
    storage.setItem('x', { state: { scenario: s }, version: 0 }); // mismo escenario: no repite
    await new Promise((r) => setTimeout(r, 20));
    expect(events).toEqual(['ok']);
    st.fail = true;
    storage.setItem('x', { state: { scenario: { ...s, name: 'otro' } }, version: 0 });
    await new Promise((r) => setTimeout(r, 20));
    expect(events).toEqual(['ok', 'error']);
  });

  it('formatSaved usa HH:MM', () => {
    expect(formatSaved(new Date(2026, 0, 1, 7, 5))).toBe('Guardado 07:05');
  });
});
