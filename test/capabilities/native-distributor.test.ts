import { afterEach, expect, test, vi } from 'vitest';
import { maintainNativeDistributors } from '../../src/app/native-distributor-population';
import { recoverNativeDistributors } from '../../src/app/native-distributor-recovery';
import { defaults } from '../../src/config/model';
import { distributorOwner, haulingOwner } from '../../src/features/logistics/identity';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { refreshRecovery } from '../../src/features/recovery/store';
import { defaultRecoveryPolicy } from '../../src/features/recovery/policy';
import type { Envelope } from '../../src/persistence/versioned-state';
const home = 'W0N1';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const room = { name: home, energyAvailable: 300, energyCapacityAvailable: 800,
    controller: { level: 5 }, storage: { store: { energy: 12500 } }, terminal: { store: { energy: 1 } } } as unknown as Room;
  const game = { time: 1, creeps: {} as Record<string, unknown> };
  vi.stubGlobal('Game', game);
  return { state, room, game, queue: createSpawnQueue(state, home) };
}
test('restart sums terminal and storage and cancellation leaves ordinary courier demand intact', () => {
  const { state, room, queue } = fixture();
  const config = { ...defaults, distributorSpawningEnabled: true, distributorTarget: 0 };
  maintainNativeDistributors(state, room, config, true);
  const request = queue.list()[0]!;
  expect(request.owner).toBe(distributorOwner(home));
  queue.submit({ ...request, owner: haulingOwner(home), id: 'courier', name: 'courier' });
  room.terminal!.store.energy = 0;
  maintainNativeDistributors(state, room, config, true);
  expect(queue.list().map(item => item.owner)).toEqual([haulingOwner(home)]);
});
test('distributor target counts identities rather than treating small bodies as fractional units', () => {
  const { state, room, game, queue } = fixture();
  game.creeps['small'] = { name: 'small', memory: { population: { owner: distributorOwner(home), home } }, spawning: false, ticksToLive: 1000 };
  maintainNativeDistributors(state, room, { ...defaults, distributorSpawningEnabled: true }, false);
  expect(queue.list()).toEqual([]);
  (game.creeps['small'] as { ticksToLive: number }).ticksToLive = 1;
  maintainNativeDistributors(state, room, { ...defaults, distributorSpawningEnabled: true }, false);
  expect(queue.list()).toHaveLength(1);
});
test('conversion follows durable recovery assessment cadence and keeps unit task state', () => {
  const { state, game } = fixture();
  const memory = { population: { owner: distributorOwner(home), home }, unrelated: 'preserved' };
  game.creeps['original'] = { memory };
  const observation = { room: home, owned: true, level: 5, energy: 0 };
  refreshRecovery(state, observation, () => [], defaultRecoveryPolicy, true, 1);
  recoverNativeDistributors(state, home, true);
  expect(memory.population.owner).toBe(haulingOwner(home));
  expect(memory.unrelated).toBe('preserved');
  game.time = 2;
  memory.population.owner = distributorOwner(home);
  recoverNativeDistributors(state, home, true);
  expect(memory.population.owner).toBe(distributorOwner(home));
  game.time = 251;
  refreshRecovery(state, observation, () => [], defaultRecoveryPolicy, true, 251);
  recoverNativeDistributors(state, home, true);
  expect(memory.population.owner).toBe(haulingOwner(home));
});
