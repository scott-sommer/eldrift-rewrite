export class PlainDataCapacityError extends Error {}
interface WalkBudget { nodes: number; ancestors: Set<object> }
export function copyPlain<T>(value: T): T {
  return clone(value, 0, { nodes: 100000, ancestors: new Set() }) as T;
}
function clone(value: unknown, depth: number, budget: WalkBudget): unknown {
  if (--budget.nodes < 0 || depth > 100) throw new PlainDataCapacityError('State exceeds validation budget');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value === 0 ? 0 : value;
  if (typeof value !== 'object') throw new Error('State contains a non-JSON value');
  return cloneObject(value, depth, budget);
}
function cloneObject(value: object, depth: number, budget: WalkBudget): object {
  validatePrototype(value);
  if (budget.ancestors.has(value)) throw new Error('State contains a cycle');
  budget.ancestors.add(value);
  const result: object = Array.isArray(value) ? [] : {};
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (Array.isArray(value)) validateArrayKey(key, value.length);
    const child = clone(propertyValue(value, key), depth + 1, budget);
    assign(result, key as string, child);
  }
  if (Array.isArray(value) && Object.keys(value).length !== value.length) throw new Error('State contains sparse or extended array');
  budget.ancestors.delete(value);
  return result;
}

function propertyValue(value: object, key: string | symbol): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
  if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) throw new Error('State contains non-data properties');
  return descriptor.value;
}

function validateArrayKey(key: string | symbol, length: number): void {
  if (typeof key !== 'string') throw new Error('State contains non-data properties');
  const index = Number(key);
  if (!Number.isInteger(index) || index < 0 || index >= length || String(index) !== key) throw new Error('State contains extended array');
}
function validatePrototype(value: object): void {
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new Error('State requires plain objects');
}

// __proto__ must remain an own data property, matching JSON.parse rather than invoking its setter.
function assign(target: object, key: string, value: unknown): void {
  if (key === '__proto__') Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
  else (target as Record<string, unknown>)[key] = value;
}

/** JSON.parse already creates detached data properties; validate budgets without cloning them again. */
export function parsePlain(source: string): unknown {
  return validateParsed(JSON.parse(source), 0, { nodes: 100000 });
}
function validateParsed(value: unknown, depth: number, budget: { nodes: number }): unknown {
  if (--budget.nodes < 0 || depth > 100) throw new PlainDataCapacityError('State exceeds validation budget');
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('State contains a non-JSON value');
    return value === 0 ? 0 : value;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) record[key] = validateParsed(record[key], depth + 1, budget);
  }
  return value;
}
