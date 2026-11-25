import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createNativeLaborObservation } from '../../../src/app/remotes/startup/household/labor-observation';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import type { LaborProposalInput } from '../../../src/capabilities/economy/startup/household/labor/proposal-model';
const controls = vi.hoisted(() => ({ source: true,eligible: true,claims: new Map<string,number>() }));
vi.mock('../../../src/adapters/screeps/spawn-placement',() => ({ nativeSpawnDirections: () => [7] }));
vi.mock('../../../src/app/remotes/startup/stock',() => ({ startupClaimedPools: () => controls.claims }));
vi.mock('../../../src/app/remotes/startup/endpoint-facts',() => ({ observeStartupEndpoint: () => controls.source ? { id: 'stock',position: { room: 'W0N1',x: 2,y: 2 },energy: 100,capacity: 1000,freeCapacity: 900,claimedCapacity: 0 } : undefined }));
vi.mock('../../../src/adapters/screeps/work-assessment',() => ({ observeWorkAssessment: () => ({
  sites: [{ id: 'target',position: { room: 'W0N1',x: 8,y: 1 },ready: controls.eligible,progress: 97,total: 100 }],
  structures: [{ id: 'target',position: { room: 'W0N1',x: 8,y: 1 },eligible: controls.eligible,excluded: false,hits: 1000,maximum: 5000 }],
  controller: { id: 'target',position: { room: 'W0N1',x: 8,y: 1 },owned: true,level: 4,downgrade: 20000 },
}) }));
beforeEach(() => { controls.source = true; controls.eligible = true; controls.claims.clear(); });
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const home = { name: 'W0N1',controller: { my: true,level: 4,upgradeBlocked: 0,progress: 10,progressTotal: 1000 } };
  const spawn = { id: 'spawn',structureType: 'spawn',my: true,isActive: () => true,room: home,pos: { roomName: home.name,x: 1,y: 1 } };
  vi.stubGlobal('STRUCTURE_SPAWN','spawn'); vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: home },getObjectById: (id: string) => id === 'spawn' ? spawn : null });
  const point = (x: number,y = 1) => ({ room: home.name,x,y }),write = vi.fn(() => { throw new Error('observation wrote state'); });
  const input: LaborProposalInput = { observedAt: 1,request: { id: 'worker',name: 'worker',owner: 'home',room: home.name,body: ['work','carry','move'],priority: 0,readyAt: 0,expiresAt: 25,placement: { spawn: spawn.id,exit: point(2) } },
    birth: { request: 'worker',spawn: spawn.id,startAt: 0,activeAt: 9,cost: 200 },source: 'stock',pickup: point(2),order: { id: 'target',position: point(8),kind: 'build',priority: 20,score: 0 },service: point(5),policy: { horizon: 24,maximumLoad: 10,maximumWorkTicks: 2,reserve: 20 } };
  return { home,spawn,input,write,observe: createNativeLaborObservation({ read: () => undefined,write }) };
}
test('native facts subtract active stock claims and retain policy repair ceilings without writes',() => {
  const f = fixture(); controls.claims.set(logisticsPool('stock','stock','energy'),25);
  expect(f.observe(f.input)).toMatchObject({ status: 'observed',facts: { source: { availableEnergy: 75,claimedEnergy: 25 },target: { remainingWork: 3 } } });
  f.input.order.kind = 'repair'; f.input.order.targetHits = 1100; expect(f.observe(f.input)).toMatchObject({ facts: { target: { remainingWork: 100 } } });
  expect(f.write).not.toHaveBeenCalled();
});
test('foreign home/spawn, missing endpoint and stale/ineligible targets refuse',() => {
  const f = fixture(); f.home.controller.my = false; expect(f.observe(f.input)).toMatchObject({ reason: 'home' });
  f.home.controller.my = true; f.spawn.my = false; expect(f.observe(f.input)).toMatchObject({ reason: 'spawn' });
  f.spawn.my = true; controls.source = false; expect(f.observe(f.input)).toMatchObject({ reason: 'endpoint' });
  controls.source = true; controls.eligible = false; expect(f.observe(f.input)).toMatchObject({ reason: 'target' });
  controls.eligible = true; f.input.order.position.x++; expect(f.observe(f.input)).toMatchObject({ reason: 'target' });
});
test('upgrade forecasts require current usable non-max-level controller progress',() => {
  const f = fixture(); f.input.order.kind = 'upgrade'; expect(f.observe(f.input)).toMatchObject({ facts: { target: { remainingWork: 990 } } });
  f.home.controller.upgradeBlocked = 1; expect(f.observe(f.input)).toMatchObject({ reason: 'target' });
  f.home.controller.upgradeBlocked = 0; f.home.controller.level = 8; expect(f.observe(f.input)).toMatchObject({ reason: 'target' });
});
