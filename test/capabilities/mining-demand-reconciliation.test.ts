import { expect, test } from 'vitest';
import { reconcileMiningDemand } from '../../src/features/mining/reconcile-demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { miningOwner } from '../../src/features/mining/demand';
import type { MiningStation } from '../../src/capabilities/mining/station';
import type { Envelope } from '../../src/persistence/versioned-state';

function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, value); } };
  const queue = createSpawnQueue(state, 'home');
  const station: MiningStation = { id: 'source', target: 'source', kind: 'energy', resource: 'energy',
    position: { room: 'remote', x: 20, y: 20 }, access: [{ room: 'remote', x: 21, y: 20 }],
    throughput: 10, available: 0, observedAt: 1, readyAt: 20, risk: 'safe' };
  const submit = (id: string, owner: string) => queue.submit({ id, name: id, owner, room: 'home',
    body: ['work', 'move'], priority: 0, readyAt: 1, expiresAt: 100 });
  return { state, queue, station, submit };
}
test('visible removal cancels stale demand after station history is lost, preserving other owners and rooms', () => {
  const { state, queue, station, submit } = fixture();
  submit('removed', miningOwner(station));
  submit('other-room', miningOwner({ ...station, position: { ...station.position, room: 'elsewhere' } }));
  submit('courier', 'logistics');
  submit('unrecognized', 'mining:invalid');
  expect(reconcileMiningDemand(state, 'home', 'remote', [])).toBe(1);
  expect(reconcileMiningDemand(state, 'home', 'remote', [])).toBe(0);
  expect(queue.list().map(request => request.id)).toEqual(['other-room', 'courier', 'unrecognized']);
});
test('vision loss and renewable energy depletion do not imply station removal', () => {
  const { state, queue, station, submit } = fixture();
  submit('miner', miningOwner(station));
  expect(reconcileMiningDemand(state, 'home', 'remote', undefined)).toBe(0);
  expect(reconcileMiningDemand(state, 'home', 'remote', [station])).toBe(0);
  expect(queue.list()).toHaveLength(1);
});
test.each(['unsafe', 'disabled', 'depleted', 'extractor-lost'])('cancels %s station demand without a replacement body plan', reason => {
  const { state, queue, station, submit } = fixture();
  const mineral: MiningStation = { ...station, kind: 'mineral', resource: 'H', extractor: 'extractor', available: 100 };
  submit('miner', miningOwner(mineral));
  if (reason === 'unsafe') mineral.risk = 'hostile';
  if (reason === 'disabled') mineral.throughput = 0;
  if (reason === 'depleted') mineral.available = 0;
  if (reason === 'extractor-lost') delete mineral.extractor;
  expect(reconcileMiningDemand(state, 'home', 'remote', [mineral])).toBe(1);
  expect(queue.list()).toEqual([]);
});
