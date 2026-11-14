import { afterEach, expect, test, vi } from 'vitest';
import { observeCourierEndpoints } from '../../src/app/native-courier-endpoints';
import { defaults } from '../../src/config/model';
import { miningOwner } from '../../src/features/mining/demand';
import type { MiningStation } from '../../src/capabilities/mining/station';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  for (const [key, value] of Object.entries({ WORK: 'work', HARVEST_POWER: 2, HARVEST_MINERAL_POWER: 1, EXTRACTOR_COOLDOWN: 5, BOOSTS: { work: { UO: { harvest: 3 } } } })) vi.stubGlobal(key, value);
  const position = (x: number) => ({ x, y: 10, roomName: 'home' });
  const station: MiningStation = { id: 'mineral', target: 'mineral', kind: 'mineral', resource: 'H', container: 'container', extractor: 'extractor',
    link: 'nearby-link', position: { room: 'home', x: 20, y: 10 }, access: [], throughput: 10, available: 1000, observedAt: 1, readyAt: 1, risk: 'safe' };
  const unit = { spawning: false, memory: { population: { owner: miningOwner(station), home: 'home' } },
    body: Array.from({ length: 12 }, () => ({ type: 'work', hits: 100 })) };
  const objects: Record<string, unknown> = { container: { pos: position(20) }, extractor: { isActive: () => true }, requested: { pos: position(30) } };
  vi.stubGlobal('Game', { creeps: { miner: unit }, getObjectById: (id: string) => objects[id] });
  const terminal = { my: true, pos: position(10), store: { getFreeCapacity: () => 100000 } };
  const storage = { my: true, pos: position(5), store: { getFreeCapacity: () => 100000 } };
  const room = { terminal, storage } as unknown as Room;
  const config = { ...defaults, mineralTransportEnabled: true };
  const observe = (value = station) => observeCourierEndpoints(room, [value], [], [], config);
  return { station, unit, objects, terminal, storage, room, config, observe };
}
test('mineral production includes extractor cadence, actual WORK capacity and configured throughput', () => {
  const f = fixture();
  expect(f.observe()[0]).toMatchObject({ production: 2, sink: { x: 10 } });
  f.unit.body[0]!.hits = 0;
  expect(f.observe()[0]?.production).toBeCloseTo(11 / 6);
  expect(f.observe({ ...f.station, throughput: 1 })[0]?.production).toBe(1);
});
test('mineral destinations respect terminal then storage headroom and do not fall back to energy-only spawns', () => {
  const f = fixture();
  f.terminal.store.getFreeCapacity = () => 50000;
  expect(f.observe()[0]?.sink.x).toBe(5);
  f.storage.store.getFreeCapacity = () => 50000;
  expect(f.observe()).toEqual([]);
});
test('disabled, depleted, inactive or unstaffed extraction contributes no production route', () => {
  const f = fixture();
  expect(observeCourierEndpoints(f.room, [f.station], [], [], defaults)).toEqual([]);
  expect(f.observe({ ...f.station, available: 0 })).toEqual([]);
  f.objects.extractor = { isActive: () => false };
  expect(f.observe()).toEqual([]);
  f.objects.extractor = { isActive: () => true };
  f.unit.spawning = true;
  expect(f.observe()).toEqual([]);
});
test('a mineral-specific pending commitment determines the route destination', () => {
  const f = fixture();
  const request = { id: 'H-delivery', owner: 'haul', source: 'container', sink: 'requested', resource: 'H', quantity: 50, priority: 1, expiresAt: 10 };
  const observed = observeCourierEndpoints(f.room, [f.station], [{ ...request, resource: 'energy', sink: 'wrong' }, request], [], f.config);
  expect(observed[0]?.sink.x).toBe(30);
});

test('harvest boosts affect mineral throughput without treating extractor cooldown as continuous harvesting', () => {
  const f = fixture();
  Object.assign(f.unit.body[0]!, { boost: 'UO' });
  expect(f.observe()[0]?.production).toBeCloseTo(14 / 6);
});
