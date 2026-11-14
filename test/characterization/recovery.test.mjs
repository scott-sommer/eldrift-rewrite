import { expect, test } from 'vitest';
import { legacy } from './legacy.mjs';
const symbols = ['RECOVERY_TRIGGER_ENERGY', 'RECOVERY_EXIT_ENERGY', 'RECOVERY_DONOR_MAX_DISTANCE', 'RECOVERY_DONOR_MIN_ENERGY', 'RECOVERY_SUPPORT_BATCH', 'ensureRecoveryMemory', 'getStoredEnergy', 'isEligibleRecoveryRoom', 'getDonorRooms', 'refreshRecoveryStates'];
function room(name, energy, level = 5) {
  return { name, controller: { my: true, level }, storage: { store: { energy } } };
}
function setup() {
  return legacy(symbols, { Memory: {}, RESOURCE_ENERGY: 'energy', Game: { time: 250, map: { getRoomLinearDistance: () => 1 } } });
}

test('recovery enters below 10k, persists through the band and exits at 50k', () => {
  const ctx = setup();
  const target = room('W1N1', 10000);
  const state = () => ctx.Memory.manager.energyRecovery.rooms.W1N1;
  for (const [energy, active] of [[10000, false], [9999, true], [10000, true], [49999, true], [50000, false], [20000, false]]) {
    target.storage.store.energy = energy;
    ctx.refreshRecoveryStates([target]);
    expect(state().active).toBe(active);
    expect(state().storedEnergy).toBe(energy);
    expect(state().checkedAt).toBe(250);
  }
});

test('terminal energy participates and ineligible rooms lose recovery state', () => {
  const ctx = setup();
  const target = room('W1N1', 0);
  target.terminal = { store: { energy: 10000 } };
  ctx.refreshRecoveryStates([target]);
  expect(ctx.Memory.manager.energyRecovery.rooms.W1N1.active).toBe(false);
  target.controller.level = 4;
  ctx.refreshRecoveryStates([target]);
  expect(ctx.Memory.manager.energyRecovery.rooms.W1N1).toBeUndefined();
});

test('donors require more than 75k, at most four rooms, and sort by distance then energy', () => {
  const ctx = setup();
  const distances = { near: 1, rich: 2, poorer: 2, far: 5, boundary: 4, low: 1 };
  ctx.Game.map.getRoomLinearDistance = name => distances[name] ?? 0;
  const target = room('target', 0);
  const donors = [room('poorer', 80000), room('rich', 90000), room('far', 100000), room('low', 75000), room('boundary', 76000), room('near', 76000)];
  ctx.refreshRecoveryStates([target, ...donors]);
  const requests = ctx.Memory.manager.energyRecovery.rooms.target.donorRequests;
  expect(requests.map(request => request.donorRoom)).toEqual(['near', 'rich', 'poorer', 'boundary']);
  expect(requests.every(request => request.requestedEnergy === 25000 && request.targetRoom === 'target')).toBe(true);
  target.storage.store.energy = 50000;
  ctx.refreshRecoveryStates([target, ...donors]);
  expect(ctx.Memory.manager.energyRecovery.rooms.target.donorRequests).toEqual([]);
});
