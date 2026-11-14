import type { TransportStock, TransportSink } from '../logistics/stock-requests';
export interface SupportStore { id: string; kind: 'storage' | 'terminal'; owned: boolean; energy: number }
export interface SupportSink { id: string; kind: string; owned: boolean; active: boolean; free: number }
/** Prefer storage withdrawals while retaining a combined donor reserve across both stores. */
export function supportSources(stores: readonly SupportStore[], reserve: number): TransportStock[] {
  validateStocks(stores, reserve);
  const owned = stores.filter(store => store.owned).sort((a, b) => sourceRank(a) - sourceRank(b) || a.id.localeCompare(b.id));
  let available = Math.max(0, owned.reduce((sum, store) => sum + store.energy, 0) - reserve);
  return owned.map(store => {
    const amount = Math.min(store.energy, available);
    available -= amount;
    return { id: store.id, resource: 'energy', amount, minimumBatch: 0, priority: sourceRank(store) };
  });
}
const sinkRanks: Readonly<Record<string, number>> = { storage: 0, terminal: 1, spawn: 2, extension: 3 };
/** A full preferred store does not hide a usable fallback destination. */
export function supportSinks(sinks: readonly SupportSink[]): TransportSink[] {
  if (new Set(sinks.map(sink => sink.id)).size !== sinks.length || sinks.some(sink => !sink.id || !Number.isSafeInteger(sink.free) || sink.free < 0)) throw new Error('Invalid support sinks');
  return sinks.filter(sink => sink.owned && sink.active && sink.free > 0 && Object.hasOwn(sinkRanks, sink.kind))
    .map(sink => ({ id: sink.id, free: sink.free, priority: sinkRanks[sink.kind]! }))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}
function sourceRank(store: SupportStore): number { return store.kind === 'storage' ? 0 : 1; }
function validateStocks(stores: readonly SupportStore[], reserve: number): void {
  if (!Number.isSafeInteger(reserve) || reserve < 0) throw new Error('Invalid donor reserve');
  if (new Set(stores.map(store => store.id)).size !== stores.length) throw new Error('Duplicate support store');
  if (stores.some(store => !store.id || !['storage', 'terminal'].includes(store.kind) || !Number.isSafeInteger(store.energy) || store.energy < 0)) throw new Error('Invalid support stock');
}
