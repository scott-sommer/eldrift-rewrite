import { afterEach, expect, test, vi } from 'vitest';
import { createNativeSupportView } from '../../src/app/native-support-view';
import { supportOwner } from '../../src/features/recovery/support-identity';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const store = (energy: number, capacity: number) => ({ energy, getUsedCapacity() { return this.energy; },
    getFreeCapacity() { return capacity - this.energy; }, getCapacity: () => capacity });
  const source = { id: 'source', structureType: 'storage', my: true, pos: { roomName: 'W0N1' }, store: store(100, 1000), isActive: () => true };
  const sink = { id: 'sink', structureType: 'storage', my: true, pos: { roomName: 'E0N1' }, store: store(0, 1000), isActive: () => true };
  const home = { controller: { my: true }, storage: source };
  const target = { controller: { my: true }, storage: sink, find: () => [sink] };
  vi.stubGlobal('FIND_STRUCTURES', 'structures');
  vi.stubGlobal('Game', { time: 1, rooms: { W0N1: home, E0N1: target }, getObjectById: (id: string) => id === 'source' ? source : sink });
  const creep = { memory: { population: { home: 'W0N1', owner: supportOwner('W0N1', 'E0N1') } }, store: store(0, 50) } as unknown as Creep;
  const request = { id: 'shipment', owner: supportOwner('W0N1', 'E0N1'), source: 'source', sink: 'sink', resource: 'energy', quantity: 50, priority: 2, expiresAt: 100 };
  return { source, sink, home, target, creep, request };
}
test('support observations refresh combined donor reserves on each call and retain ordinary cargo recovery behavior', () => {
  const { source, creep, request } = fixture();
  let reserve = 70;
  const observe = createNativeSupportView(() => reserve);
  expect(observe(creep, request).sourceStock).toBe(30);
  source.store.energy = 80;
  expect(observe(creep, request).sourceStock).toBe(10);
  reserve = 90;
  expect(observe(creep, request).sourceStock).toBe(0);
  expect(observe(creep, { ...request, owner: 'cargo-recovery' }).sourceStock).toBe(80);
});
test('loss of target ownership or headroom invalidates a shipment before another transfer can issue', () => {
  const { source, sink, home, target, creep, request } = fixture();
  const observe = createNativeSupportView(() => 70);
  target.controller.my = false;
  expect(observe(creep, request)).toMatchObject({ sourceStock: 0, sinkFree: 0, sinkStatus: 'missing' });
  target.controller.my = true;
  sink.store.energy = 1000;
  expect(observe(creep, request).sinkStatus).toBe('missing');
  sink.store.energy = 0;
  home.controller.my = false;
  expect(observe(creep, request).sourceStock).toBe(0);
  home.controller.my = true;
  source.my = false;
  expect(observe(creep, request).sourceStock).toBe(0);
});
test('malformed support scope and non-energy cargo cannot bypass the donor guard', () => {
  const { creep, request } = fixture();
  const observe = createNativeSupportView(() => 0);
  expect(observe(creep, { ...request, owner: 'recovery-support:broken' }).sinkStatus).toBe('missing');
  expect(observe(creep, { ...request, resource: 'H' }).sinkStatus).toBe('missing');
  creep.memory.population!.home = '';
  expect(observe(creep, { ...request, owner: 'recovery-support:["","E0N1"]' }).sinkStatus).toBe('missing');
});
