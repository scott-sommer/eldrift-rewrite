import { afterEach, expect, test, vi } from 'vitest';
import { observeUpgradeSupplyDestination } from '../../src/app/native-upgrade-supply-destination';
const anchor = { room: 'E0N1', x: 20, y: 20 };
const pos = { roomName: anchor.room, x: 20, y: 21 };
const store = (free: number | null) => ({ getFreeCapacity: () => free });
afterEach(() => vi.unstubAllGlobals());
test('native destination observation treats null storage capacity as ground delivery', () => {
  vi.stubGlobal('Game', { creeps: {} });
  const room = { controller: { my: true, level: 2 }, storage: { my: true, id: 'storage', pos, store: store(null) } } as unknown as Room;
  expect(observeUpgradeSupplyDestination(room, anchor)).toEqual({ kind: 'ground', anchor });
  expect(observeUpgradeSupplyDestination(undefined, anchor)).toEqual({ kind: 'hold', reason: 'target-not-owned' });
});
test('master observation is target-owned, nonspawning and deterministic by name', () => {
  const master = { my: true, spawning: false, name: 'b', id: 'b-id', pos, store: store(50),
    memory: { population: { home: anchor.room, owner: 'upgrade-master:' + anchor.room } } };
  vi.stubGlobal('Game', { creeps: {
    b: master, a: { ...master, id: 'a-id', name: 'a', store: store(0) },
    wrongHome: { ...master, name: '0', memory: { population: { home: 'W0N1', owner: 'upgrade-master:' + anchor.room } } },
    spawning: { ...master, name: '00', spawning: true },
  } });
  const room = { controller: { my: true, level: 2 } } as unknown as Room;
  expect(observeUpgradeSupplyDestination(room, anchor)).toMatchObject({ kind: 'wait', endpoint: { id: 'a-id', free: 0 } });
});
