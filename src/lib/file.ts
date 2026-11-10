import { parseScenarioJSON, type ParseResult } from '@/domain/schema';
import type { Scenario } from '@/domain/types';

/** Nombre de archivo a partir del nombre del escenario, como en el prototipo. */
export function scenarioFileName(name: string): string {
  const slug = (name || 'escenario')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (slug || 'escenario') + '.json';
}

export const serializeScenario = (s: Scenario): string => JSON.stringify(s, null, 2);

/** Descarga el escenario como `.json`. */
export function exportScenario(s: Scenario): void {
  const blob = new Blob([serializeScenario(s)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = scenarioFileName(s.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Lee y valida un archivo de escenario. */
export async function readScenarioFile(file: File): Promise<ParseResult> {
  try {
    return parseScenarioJSON(await file.text());
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo' };
  }
}
