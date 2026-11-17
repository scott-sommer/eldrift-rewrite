import { afterEach, expect, test, vi } from 'vitest';
import { createNativeWork } from '../../src/adapters/screeps/work-execution';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import type { WorkOrder } from '../../src/capabilities/work/assessment';
afterEach(() => vi.unstubAllGlobals());
function setup(x = 17, code = 0) {
  const target = { hits: 10 };
  vi.stubGlobal('Game', { time: 1, rooms: { home: {} }, getObjectById: () => target });
  const upgrade = vi.fn(() => code), build = vi.fn(() => 0), repair = vi.fn(() => 0);
  const creep = { name: 'worker', pos: { roomName: 'home', x, y: 20 }, store: { energy: 20 },
    upgradeController: upgrade, build, repair } as unknown as Creep;
  const move = vi.fn(() => ({ status: 'running' as const }));
  const arbiter = createActionArbiter(() => 1), work = createNativeWork(arbiter, { move });
  const order: WorkOrder = { id: 'controller', kind: 'upgrade', position: { room: 'home', x: 20, y: 20 }, priority: 1, score: 1 };
  return { work, creep, order, move, upgrade, build, repair, arbiter };
}
test('tight positioning preserves the accepted range-three upgrade and shared ownership on the same tick', () => {
  const { work, creep, order, move, upgrade } = setup();
  expect(work(creep, order, 'task', 2)).toEqual({ status: 'running' });
  expect(upgrade).toHaveBeenCalledTimes(1);
  expect(move).toHaveBeenCalledWith(creep, expect.objectContaining({ owner: 'task', range: 2, destination: order.position }));
  expect(work(creep, order, 'task', 2)).toMatchObject({ status: 'blocked', reason: 'action-conflict' });
  expect(upgrade).toHaveBeenCalledTimes(1);
  expect(move).toHaveBeenCalledTimes(1);
});
test.each([{ x: 18, range: 2 }, { x: 17, range: 3 }])('an already acceptable position upgrades without movement: %o', ({ x, range }) => {
  const { work, creep, order, move, upgrade } = setup(x);
  expect(work(creep, order, 'task', range).status).toBe('running');
  expect(upgrade).toHaveBeenCalledTimes(1);
  expect(move).not.toHaveBeenCalled();
});
test('out-of-action-range travel uses the preferred distance without issuing work early', () => {
  const { work, creep, order, move, upgrade } = setup(16);
  work(creep, order, 'task', 2);
  expect(upgrade).not.toHaveBeenCalled();
  expect(move).toHaveBeenCalledWith(creep, expect.objectContaining({ range: 2 }));
});
test('rejected work and another owner cannot cause a positioning side effect', () => {
  const rejected = setup(17, -1);
  expect(rejected.work(rejected.creep, rejected.order, 'task', 2)).toMatchObject({ status: 'blocked', reason: 'work-intent:-1' });
  expect(rejected.move).not.toHaveBeenCalled();
  const owned = setup();
  owned.arbiter.issue('worker', 'another-task', ['transfer'], () => 0, () => true);
  expect(owned.work(owned.creep, owned.order, 'task', 2)).toMatchObject({ status: 'blocked', reason: 'owner-conflict' });
  expect(owned.upgrade).not.toHaveBeenCalled();
  expect(owned.move).not.toHaveBeenCalled();
});
test.each(['build', 'repair'] as const)('upgrade positioning does not change %s range', kind => {
  const fixture = setup();
  fixture.work(fixture.creep, { ...fixture.order, kind, targetHits: 100 }, 'task', 1);
  expect(fixture[kind]).toHaveBeenCalledTimes(1);
  expect(fixture.move).not.toHaveBeenCalled();
});
test.each([0, 4, 1.5, NaN])('invalid preferred range %s rejects before effects', range => {
  const fixture = setup();
  expect(() => fixture.work(fixture.creep, fixture.order, 'task', range)).toThrow('approach range');
  expect(fixture.upgrade).not.toHaveBeenCalled();
  expect(fixture.move).not.toHaveBeenCalled();
});
