interface Entry<V> { value: V; expiresAt: number }
export function createBoundedCache<K, V>(capacity: number) {
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error('Invalid cache capacity');
  const entries = new Map<K, Entry<V>>();
  return {
    get(key: K, tick: number): V | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      entries.delete(key);
      if (entry.expiresAt <= tick) return undefined;
      entries.set(key, entry);
      return entry.value;
    },
    set(key: K, value: V, expiresAt: number): void {
      if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) throw new Error('Invalid cache expiry');
      entries.delete(key);
      entries.set(key, { value, expiresAt });
      if (entries.size > capacity) entries.delete(entries.keys().next().value!);
    },
    invalidate(key: K): void { entries.delete(key); },
    clear(): void { entries.clear(); },
    get size(): number { return entries.size; },
  };
}
