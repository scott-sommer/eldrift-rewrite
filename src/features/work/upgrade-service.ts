export interface UpgradeStore { id: string; stock: Readonly<Record<string, number>>; free: number }
export interface UpgradeLab { id: string; mineral: string | undefined; amount: number; mineralCapacity: number; energy: number; energyCapacity: number }
export interface UpgradeSpawn { id: string; energy: number; capacity: number }
export interface UpgradeServiceView { level: number; storage?: UpgradeStore; terminal?: UpgradeStore; lab?: UpgradeLab; spawn?: UpgradeSpawn }
export interface UpgradeServicePolicy { mineralTarget: number; spawnFloor: number; storageCeiling: number; maximumBatch: number }
export interface UpgradeTransfer { direction: string; source: string; sink: string; resource: string; quantity: number }
export const upgradeBoosts: readonly string[] = ['XGH2O', 'GH2O', 'GH'];
export const defaultUpgradeService: UpgradeServicePolicy = { mineralTarget: 1300, spawnFloor: 100, storageCeiling: 990000, maximumBatch: 200 };
/** Selective port of upgradeMaster; each observation authorizes only one service direction. */
export function planUpgradeService(view: UpgradeServiceView, policy: UpgradeServicePolicy = defaultUpgradeService): UpgradeTransfer | undefined {
  if (!Object.values(policy).every(value => Number.isSafeInteger(value) && value >= 0) || policy.maximumBatch === 0) throw new Error('Invalid upgrade service policy');
  return purgeStorage(view, policy) ?? prepareLab(view, policy) ?? energyService(view, policy);
}
function shipment(direction: string, source: string, sink: string, resource: string, amount: number, free: number,
  policy: UpgradeServicePolicy): UpgradeTransfer | undefined {
  const quantity = Math.max(0, Math.min(amount, free, policy.maximumBatch));
  return source !== sink && quantity > 0 ? { direction, source, sink, resource, quantity } : undefined;
}
function purgeStorage(view: UpgradeServiceView, policy: UpgradeServicePolicy) {
  const { storage, terminal } = view;
  if (!storage || !terminal) return undefined;
  const resource = Object.keys(storage.stock).sort().find(type => type !== 'energy' && storage.stock[type]! > 0);
  return resource ? shipment('storage-mineral', storage.id, terminal.id, resource, storage.stock[resource]!, terminal.free, policy) : undefined;
}
function prepareLab(view: UpgradeServiceView, policy: UpgradeServicePolicy) {
  const { lab, terminal } = view;
  if (view.level < 6 || !lab || !terminal || lab.amount >= policy.mineralTarget) return undefined;
  const best = upgradeBoosts.find(resource => (terminal.stock[resource] ?? 0) > policy.mineralTarget);
  if (lab.mineral && lab.amount > 0) return maintainMineral(lab, terminal, best, policy);
  return best ? shipment('lab-mineral-fill', terminal.id, lab.id, best, terminal.stock[best]!,
    Math.min(lab.mineralCapacity, policy.mineralTarget), policy) : undefined;
}
function maintainMineral(lab: UpgradeLab, terminal: UpgradeStore, best: string | undefined, policy: UpgradeServicePolicy) {
  const current = lab.mineral!;
  const rank = upgradeBoosts.indexOf(current);
  const superior = best !== undefined && upgradeBoosts.indexOf(best) < rank;
  const available = terminal.stock[current] ?? 0;
  const needed = policy.mineralTarget - lab.amount;
  if (rank < 0 || superior || available <= needed) {
    return shipment('lab-mineral-clear', lab.id, terminal.id, current, lab.amount, terminal.free, policy);
  }
  return shipment('lab-mineral-fill', terminal.id, lab.id, current, available,
    Math.min(needed, lab.mineralCapacity - lab.amount), policy);
}
function energyService(view: UpgradeServiceView, policy: UpgradeServicePolicy) {
  const source = energySource(view);
  const sink = energySink(view, policy);
  if (!source || !sink) return undefined;
  return shipment(sink.direction, source.id, sink.id, 'energy', source.stock['energy'] ?? 0, sink.free, policy);
}
function energySource(view: UpgradeServiceView): UpgradeStore | undefined {
  if (view.terminal && (view.terminal.stock['energy'] ?? 0) > 0) return view.terminal;
  return view.level < 6 ? view.storage : undefined;
}
function energySink(view: UpgradeServiceView, policy: UpgradeServicePolicy) {
  const { storage, spawn, lab } = view;
  if (spawn && spawn.energy < Math.min(spawn.capacity, policy.spawnFloor + 1)) return { direction: 'spawn-energy', id: spawn.id, free: spawn.capacity - spawn.energy };
  if (view.level >= 6 && lab && lab.energy < lab.energyCapacity) return { direction: 'lab-energy', id: lab.id, free: lab.energyCapacity - lab.energy };
  if (view.level >= 4 && storage) return { direction: 'storage-energy', id: storage.id,
    free: Math.min(storage.free, policy.storageCeiling - (storage.stock['energy'] ?? 0)) };
  return undefined;
}
