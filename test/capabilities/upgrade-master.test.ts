import { logisticsPool } from '../../src/capabilities/logistics/request';
import { expect, test } from 'vitest';
import { planUpgradeMasterStation } from '../../src/features/work/upgrade-master-station';
import { acceptsLocalLogistics, localLogisticsDemand } from '../../src/app/native-logistics-admission';
import { reconcileRenewableFleet } from '../../src/features/population/renewable-fleet';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { Envelope } from '../../src/persistence/versioned-state';
const position = (x: number, y: number) => ({ room: 'W0N1', x, y });
const layout = { lab: position(21, 20), terminal: position(23, 20), storage: position(21, 22), spawn: position(23, 22) };
test('legacy master station must reach every endpoint and be standable', () => {
  expect(planUpgradeMasterStation(layout, () => true)).toEqual(position(22, 21));
  expect(planUpgradeMasterStation(layout, () => false)).toBeUndefined();
  expect(planUpgradeMasterStation({ ...layout, storage: position(20, 22) }, () => true)).toBeUndefined();
  expect(planUpgradeMasterStation({ ...layout, lab: position(48, 20) }, () => true)).toBeUndefined();
});
test('master-exclusive service does not attract local courier admission or bootstrap demand', () => {
  const request = { id: 'job', owner: 'upgrade-service:W0N1', source: 'terminal', sink: 'lab', resource: 'XGH2O', quantity: 200, priority: 3, expiresAt: 100 };
  expect(acceptsLocalLogistics(request, 'W0N1', false, true)).toBe(true);
  expect(acceptsLocalLogistics(request, 'W0N1', false, true, true)).toBe(false);
  expect(localLogisticsDemand(request, 'W0N1', true)).toBe(false);
  expect(localLogisticsDemand({ ...request, owner: 'ordinary' }, 'W0N1', true)).toBe(true);
  expect(localLogisticsDemand({ ...request, owner: logisticsPool('cargo-recovery', 'W0N1') }, 'W0N1', false)).toBe(false);
});
test('renewable master demand retains a low-TTL member and keeps master and ring owners distinct', () => {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const plan = { owner: 'upgrade-master:E0N1', home: 'W0N1', target: 'E0N1', desired: 1, maximum: 1,
    priority: 10, priorityStep: 0, enabled: true, body: ['move', 'carry'] as const };
  reconcileRenewableFleet(state, plan, [{ name: 'old', owner: plan.owner, room: plan.target, spawning: false, ticksToLive: 1 }], [], 1);
  expect(createSpawnQueue(state, 'W0N1').list()).toEqual([]);
  reconcileRenewableFleet(state, plan, [], [], 2);
  const queue = createSpawnQueue(state, 'W0N1');
  expect(queue.list()[0]).toMatchObject({ owner: plan.owner, home: plan.target, priority: 10 });
  reconcileRenewableFleet(state, { ...plan, owner: 'upgrade-room:E0N1', priority: 127 }, [], [], 2);
  expect(queue.list()).toHaveLength(2);
  reconcileRenewableFleet(state, { ...plan, enabled: false }, [], [], 3);
  expect(queue.list().map(request => request.owner)).toEqual(['upgrade-room:E0N1']);
});
