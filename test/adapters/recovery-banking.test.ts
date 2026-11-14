import { afterEach, expect, test, vi } from 'vitest';
import { observeRecoveryBanking } from '../../src/adapters/screeps/recovery-banking';
afterEach(() => vi.unstubAllGlobals());
test('recovery banks only eligible energy and protects active services and its selected sink', () => {
  for (const kind of ['container', 'link', 'lab', 'terminal']) vi.stubGlobal('STRUCTURE_' + kind.toUpperCase(), kind);
  vi.stubGlobal('RESOURCE_ENERGY', 'energy');
  vi.stubGlobal('FIND_STRUCTURES', 'structures');
  const item = (id: string, kind: string, range = 10, my = true) => ({ id, structureType: kind, my,
    isActive: () => true, pos: { getRangeTo: () => range }, store: { getUsedCapacity: () => 40, getFreeCapacity: () => 100 } });
  const terminal = item('terminal', 'terminal');
  const storage = item('storage', 'storage');
  const structures = [item('source', 'container'), item('controller', 'container', 2),
    item('link', 'link'), item('lab', 'lab'), item('foreign', 'lab', 10, false), terminal, storage];
  const room = { controller: {}, storage, terminal, find: () => structures } as unknown as Room;
  const policy = { storageReserve: 0, terminalReserve: 0, protectLinks: true, protectController: true };
  expect(observeRecoveryBanking(room, policy).sources.map(source => source.id)).toEqual(['source', 'lab', 'terminal']);
  expect(observeRecoveryBanking(room, policy).sinks.map(sink => sink.id)).toEqual(['storage']);
  storage.store.getFreeCapacity = () => 0;
  const fallback = observeRecoveryBanking(room, { ...policy, protectLinks: false, protectController: false });
  expect(fallback.sources.map(source => source.id)).toEqual(['source', 'controller', 'link', 'lab']);
  expect(fallback.sinks.map(sink => sink.id)).toEqual(['terminal']);
  expect(fallback.sources.every(source => source.resource === 'energy')).toBe(true);
});
