export function record(value: unknown): value is Record<string,unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}
export function numbers(value: Record<string,unknown>, keys: readonly string[], minimum = 0): boolean { return keys.every(key => integer(value[key],minimum)); }
export function keys(value: Record<string,unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value,key));
}
export function time(value: unknown, through: number): boolean { return value === null || integer(value,0,through-1); }
export function requireCheckpoint(valid: boolean): void { if (!valid) throw new Error('Invalid startup checkpoint'); }
