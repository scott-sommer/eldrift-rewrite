interface BankingSink { id: string; free: number; priority: number }
export interface RecoveryBankingPolicy {
  storageReserve: number; terminalReserve: number; protectLinks: boolean; protectController: boolean;
}
/** One durable destination per observation prevents terminal/storage circulation. */
export function observeRecoveryBanking(room: Room, policy: RecoveryBankingPolicy) {
  const sinks = [destination(room.storage, policy.storageReserve), destination(room.terminal, policy.terminalReserve)]
    .filter((item): item is BankingSink => item !== undefined).slice(0, 1);
  const sources = room.find(FIND_STRUCTURES).filter(item => eligible(item, room, policy))
    .filter(item => !sinks.some(sink => sink.id === item.id))
    .map(item => ({ id: item.id, resource: 'energy', amount: ('store' in item ? item.store.getUsedCapacity(RESOURCE_ENERGY) : 0),
      minimumBatch: 0, priority: 0 }));
  return { sources, sinks };
}
function eligible(item: AnyStructure, room: Room, policy: RecoveryBankingPolicy): boolean {
  if (!item.isActive()) return false;
  if (item.structureType === STRUCTURE_CONTAINER) {
    return !(policy.protectController && room.controller && item.pos.getRangeTo(room.controller) <= 3);
  }
  if (!('my' in item) || !item.my) return false;
  if (item.structureType === STRUCTURE_LINK) return !policy.protectLinks;
  return item.structureType === STRUCTURE_LAB || item.structureType === STRUCTURE_TERMINAL;
}
function destination(item: StructureStorage | StructureTerminal | undefined, reserve: number): BankingSink | undefined {
  if (!item?.my || !item.isActive()) return undefined;
  const free = Math.max(0, item.store.getFreeCapacity() - reserve);
  return free > 0 ? { id: item.id, free, priority: 0 } : undefined;
}
