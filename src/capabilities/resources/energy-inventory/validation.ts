import type { EnergyInventory, EnergyTransferIntent,EnergyIntent,EnergyTombstone } from './model';
export function validateEnergyInventories(stores: readonly EnergyInventory[]): void {
  if (stores.length > 256 || new Set(stores.map(store => store.id)).size !== stores.length) throw new Error('Invalid energy inventory identities');
  for (const store of stores) {
    if (typeof store.id !== 'string' || !store.id || ![store.energy,store.capacity,store.usedCapacity,store.freeEnergyCapacity].every(quantity)) throw new Error('Invalid energy inventory');
    if (store.usedCapacity < store.energy || store.energy+store.freeEnergyCapacity > store.capacity) throw new Error('Inconsistent energy inventory');
  }
}
export function validateEnergyTransfer(intent: EnergyTransferIntent, stores: { has(id: string): boolean },tombs: readonly EnergyTombstone[] = [],recordedAt?: number): void {
  if (typeof intent.id !== 'string' || !intent.id || !['withdraw','transfer'].includes(intent.kind) || !quantity(intent.amount) || intent.amount === 0) throw new Error('Invalid energy transfer intent');
  if (intent.source === intent.target || !hasTransferSource(intent,stores,tombs,recordedAt) || !stores.has(intent.target)) throw new Error('Invalid energy transfer endpoints');
}
function hasTransferSource(intent: EnergyTransferIntent,stores: { has(id: string): boolean },tombs: readonly EnergyTombstone[],recordedAt?: number): boolean {
  if (stores.has(intent.source)) return true;
  return intent.kind === 'withdraw' && tombs.some(tomb => tomb.id === intent.source && (tomb.expiredAt === undefined || tomb.expiredAt === recordedAt));
}
export function validateEnergyTransferOrder(order: readonly string[], intents: ReadonlyMap<string,EnergyIntent>): void {
  if (order.length !== intents.size || new Set(order).size !== order.length || order.some(id => !intents.has(id))) throw new Error('Invalid energy transfer settlement order');
}
function quantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000000; }
