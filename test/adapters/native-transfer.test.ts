import { expect, test } from 'vitest';
import { transferAmounts, pickupExceedsReservation } from '../../src/adapters/screeps/transfer-target';
import type { NativeTransferCommand } from '../../src/adapters/screeps/transfer-target';
const command: NativeTransferCommand = { owner: 'haul', attemptId: '1', target: 'target', position: { room: 'W0N0', x: 20, y: 20 },
  resource: 'energy', kind: 'withdraw', maximum: 10, policy: { version: 'test', blockedRooms: [], costs: {}, maximumRooms: 4 } };
const creep = { store: { getUsedCapacity: () => 30, getFreeCapacity: () => 20 } } as unknown as Creep;
test('withdraw and delivery orient stock and free capacity correctly', () => {
  const target = { structureType: 'container', store: { getUsedCapacity: () => 80, getFreeCapacity: () => 5 } } as unknown as StructureContainer;
  expect(transferAmounts(creep, target, command)).toEqual({ available: 80, capacity: 20 });
  expect(transferAmounts(creep, target, { ...command, kind: 'transfer' })).toEqual({ available: 30, capacity: 5 });
});
test('pickup cannot silently collect more than reserved and mismatched resources are rejected', () => {
  const target = { resourceType: 'energy', amount: 50 } as Resource;
  const pickup = { ...command, kind: 'pickup' as const };
  const amounts = transferAmounts(creep, target, pickup);
  expect(pickupExceedsReservation(pickup, amounts)).toBe(true);
  expect(pickupExceedsReservation({ ...pickup, maximum: 20 }, amounts)).toBe(false);
  expect(transferAmounts(creep, { ...target, resourceType: 'H' }, pickup)).toBeUndefined();
});
test('withdraw from units and delivery into tombstones are incompatible', () => {
  expect(transferAmounts(creep, { ...creep, body: [] } as Creep, command)).toBeUndefined();
  expect(transferAmounts(creep, { store: creep.store } as Tombstone, { ...command, kind: 'transfer' })).toBeUndefined();
});
