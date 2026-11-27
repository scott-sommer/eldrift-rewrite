/** Limited stores may return null without a resource; their enumerable resource amounts still give total cargo. */
export function nativeUsedCapacity<T extends { getUsedCapacity?: () => number | null }>(store: T): number {
  const used = store.getUsedCapacity?.(); if (used !== null && used !== undefined) return used;
  const values: unknown[] = Object.values(store);
  return values.filter((value): value is number => typeof value === 'number').reduce((sum,value) => sum+value,0);
}
