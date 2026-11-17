export function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}
export function natural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
export function tickOrNull(value: unknown): boolean { return value === null || natural(value); }
export function textOrNull(value: unknown): boolean { return value === null || text(value); }
export function position(value: Record<string, unknown>): boolean {
  return natural(value.x) && value.x < 50 && natural(value.y) && value.y < 50;
}
export function ids(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 10000 && value.every(text);
}
export function sameIds(a: readonly string[], b: readonly string[]): boolean {
  const values = new Set(a);
  return a.length === b.length && values.size === a.length && b.every(id => values.has(id));
}
