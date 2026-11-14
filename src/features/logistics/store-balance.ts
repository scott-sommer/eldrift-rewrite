export interface BalanceStore { id: string; free: number; stock: Readonly<Record<string, number>> }
export interface BalancePolicy { terminalLow: number; terminalHigh: number; storageEnergyReserve: number; maximumBatch: number }
export interface BalanceTransfer { direction: string; source: string; sink: string; resource: string; quantity: number }
/** One direction per observation with a quiet band between terminal fill and drain thresholds. */
export function planStoreBalance(storage: BalanceStore | undefined, terminal: BalanceStore | undefined, policy: BalancePolicy): BalanceTransfer | undefined {
  validate(policy);
  if (!storage || !terminal || storage.id === terminal.id) return undefined;
  const stored = energy(storage);
  const available = energy(terminal);
  if (available < policy.terminalLow && stored > policy.storageEnergyReserve) {
    return transfer('fill', storage, terminal, 'energy', Math.min(policy.terminalLow - available, stored - policy.storageEnergyReserve), policy.maximumBatch);
  }
  const mineral = storedMineral(storage);
  if (mineral && terminal.free > 0) return transfer('mineral', storage, terminal, mineral, storage.stock[mineral]!, policy.maximumBatch);
  if (available > policy.terminalHigh) return transfer('drain', terminal, storage, 'energy', available - policy.terminalHigh, policy.maximumBatch);
  return undefined;
}
function transfer(direction: string, source: BalanceStore, sink: BalanceStore, resource: string, amount: number, maximum: number): BalanceTransfer | undefined {
  const quantity = Math.max(0, Math.min(amount, sink.free, maximum));
  return quantity > 0 ? { direction, source: source.id, sink: sink.id, resource, quantity } : undefined;
}
function validate(policy: BalancePolicy): void {
  if (!Object.values(policy).every(value => Number.isSafeInteger(value) && value >= 0)
    || policy.maximumBatch === 0 || policy.terminalLow >= policy.terminalHigh) throw new Error('Invalid store balancing policy');
}

function storedMineral(storage: BalanceStore): string | undefined {
  return Object.keys(storage.stock).sort().find(resource => resource !== 'energy' && storage.stock[resource]! > 0);
}

function energy(store: BalanceStore): number { return store.stock['energy'] ?? 0; }
