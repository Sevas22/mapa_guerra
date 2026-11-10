/** Identificador corto, igual que `uid()` del prototipo. */
export const uid = (): string => Math.random().toString(36).slice(2, 10);
