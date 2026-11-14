import { expect, test } from 'vitest';
import { legacy } from './legacy.mjs';
const symbols = ['STATUS_IDLE', 'clearRecoverySupportMemory', 'getRecoveryEnergySource', 'getRecoveryEnergyDropoff', 'runRecoverySupportCourier'];
function setup(active = true) {
  const calls = [];
  const storage = { id: 'storage', pos: { roomName: 'W1N1' }, store: { energy: 1000 } };
  const target = { id: 'target', pos: { roomName: 'W2N2' } };
  const ctx = legacy(symbols, { Game: { rooms: { W1N1: { storage }, W2N2: { storage: target } } }, RESOURCE_ENERGY: 'energy', ERR_FULL: -8,
    _: { sum: carry => Object.values(carry).reduce((sum, n) => sum + n, 0) }, roomEnergyRecovery: { isRecoveryActive: () => active } });
  const creep = { memory: { homeRoom: 'W1N1', energyRecoverySupport: { targetRoom: 'W2N2' }, jobs: ['old'], status: 2, assignedNode: 'old', currentPath: 'old', currentRoom: 'old', pathIndex: 3 }, room: { name: 'W1N1' }, carry: {}, pos: { getRangeTo: () => 1 },
    moveTo: (...args) => calls.push(['move', ...args]), withdraw: (...args) => calls.push(['withdraw', ...args]), transfer: (...args) => { calls.push(['transfer', ...args]); return 0; } };
  return { ctx, creep, calls, storage, target };
}

test('empty recovery courier withdraws at home; loaded courier routes and delivers to target', () => {
  const { ctx, creep, calls, storage, target } = setup();
  expect(ctx.runRecoverySupportCourier(creep)).toBe(true);
  expect(calls[0]).toEqual(['withdraw', storage, 'energy']);
  creep.carry.energy = 50;
  ctx.runRecoverySupportCourier(creep);
  expect(calls[1][0]).toBe('move');
  expect(calls[1][1]).toBe(target);
  creep.room.name = 'W2N2';
  ctx.runRecoverySupportCourier(creep);
  expect(calls[2]).toEqual(['transfer', target, 'energy']);
});

test('finished support returns home before clearing task and path state', () => {
  const { ctx, creep, calls, storage } = setup(false);
  creep.room.name = 'W2N2';
  expect(ctx.runRecoverySupportCourier(creep)).toBe(true);
  expect(calls[0][1]).toBe(storage.pos);
  expect(creep.memory.energyRecoverySupport).toBeDefined();
  creep.room.name = 'W1N1';
  expect(ctx.runRecoverySupportCourier(creep)).toBe(false);
  expect(creep.memory.homeRoom).toBe('W1N1');
  expect(creep.memory.status).toBe(0);
  for (const field of ['energyRecoverySupport', 'jobs', 'assignedNode', 'currentPath', 'currentRoom', 'pathIndex']) expect(creep.memory[field]).toBeUndefined();
});

test('loaded courier completes delivery even after recovery ends', () => {
  const { ctx, creep, calls, target } = setup(false);
  creep.carry.energy = 50;
  creep.room.name = 'W2N2';
  expect(ctx.runRecoverySupportCourier(creep)).toBe(true);
  expect(calls[0]).toEqual(['transfer', target, 'energy']);
  expect(creep.memory.energyRecoverySupport).toBeDefined();
});
