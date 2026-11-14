interface WalkBudget { nodes: number; ancestors: Set<object> }
export function copyPlain<T>(value: T): T {
  inspect(value, 0, { nodes: 100000, ancestors: new Set() });
  return JSON.parse(JSON.stringify(value)) as T;
}
function inspect(value: unknown, depth: number, budget: WalkBudget): void {
  if (--budget.nodes < 0 || depth > 100) throw new Error('State exceeds validation budget');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object') throw new Error('State contains a non-JSON value');
  inspectObject(value, depth, budget);
}
function inspectObject(value: object, depth: number, budget: WalkBudget): void {
  validatePrototype(value);
  if (budget.ancestors.has(value)) throw new Error('State contains a cycle');
  budget.ancestors.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (Array.isArray(value)) validateArrayKey(key, value.length);
    inspect(propertyValue(value, key), depth + 1, budget);
  }
  if (Array.isArray(value) && Object.keys(value).length !== value.length) throw new Error('State contains sparse or extended array');
  budget.ancestors.delete(value);
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
