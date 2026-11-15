type Stringify = (value: unknown) => string | undefined;
/** Caller-owned weak cache: only recursively frozen plain data can retain its serialization. */
export function createImmutableJsonCache(stringify: Stringify = JSON.stringify): Stringify {
  const saved = new WeakMap<object, string>();
  const stable = new WeakSet<object>();
  return value => {
    if (value === null || typeof value !== 'object') return stringify(value);
    const found = saved.get(value);
    if (found !== undefined) return found;
    const reusable = immutable(value, stable, new Set());
    const result = stringify(value);
    if (reusable && result !== undefined) saved.set(value, result);
    return result;
  };
}
function immutable(value: unknown, stable: WeakSet<object>, ancestors: Set<object>): boolean {
  if (value === null || typeof value !== 'object') return typeof value !== 'function';
  if (stable.has(value)) return true;
  if (!Object.isFrozen(value) || ancestors.has(value) || !plain(value)) return false;
  ancestors.add(value);
  const result = Object.values(Object.getOwnPropertyDescriptors(value))
    .every(property => 'value' in property && immutable(property.value, stable, ancestors));
  ancestors.delete(value);
  if (result) stable.add(value);
  return result;
}
function plain(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Array.prototype || prototype === null || prototype === Object.prototype;
}
