import { afterEach,expect,test,vi } from 'vitest';
import { startupFactsFixture } from '../../fixtures/native-startup-facts';
import { startupTravelPlan } from '../../fixtures/startup-travel';
import { startupPosition } from '../../fixtures/remote-startup';
import { remoteAssignmentDemands } from '../../../src/features/remotes/assignment-demand';
import { stationTile } from '../../../src/capabilities/mining/station';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { taskScope } from '../../../src/app/task-runner';
import { createNativePaidSourceObservation } from '../../../src/app/remotes/startup/motion-observation/source';
import { createNativePaidMinerObservation } from '../../../src/app/remotes/startup/motion-observation/miner';
import type { PaidUnitContext } from '../../../src/app/remotes/startup/motion-observation/model';
afterEach(() => vi.unstubAllGlobals());
function fixture(withTask = true) {
  const f = startupFactsFixture(); f.game.time = 10; vi.stubGlobal('FIND_CREEPS',7);
  const store = { energy: 8,getUsedCapacity(): number { return this.energy; } };
  const creep = { id: 'native-miner',name: 'miner',my: true,spawning: false,memory: { population: { home: 'W0N1',owner: f.miner.owner } },
    pos: startupPosition(5,24),body: f.miner.body.map(type => ({ type,hits: 100 })),store,fatigue: 0,ticksToLive: 1494 };
  f.game.creeps.miner = creep as unknown as Creep;
  const find = f.remote.find; f.remote.find = kind => kind === 7 ? [creep] : find(kind);
  const container = { id: 'container',structureType: 'container',pos: startupPosition(5,24),hits: 240000,hitsMax: 250000,ticksToDecay: 30,
    store: { energy: 80,getCapacity: () => 2000,getUsedCapacity: () => 100,getFreeCapacity: () => 1900 } };
  f.structures.push(container);
  const context: PaidUnitContext = { cohort: { home: 'W0N1',room: 'E0N1',source: 'source',generation: 1,endpoint: 'bank' },plan: startupTravelPlan(),
    paid: { request: 'miner',owner: f.miner.owner,body: [...f.miner.body],startAt: 1,activeAt: 5,expiresAt: 1504,retireAt: 1450,capacity: 50 } };
  const demand = remoteAssignmentDemands(f.assignments.read().assignments[0]!,10).find(demand => demand.kind === 'mine')!;
  if (withTask) f.state.write('tasks/miner',{ owner: 'tasks',version: 2,data: { unit: 'miner',queue: [{ id: 'mine-task',kind: 'remote-mine',phase: 'work',payload: { home: 'W0N1',token: { id: demand.id,assignment: demand.assignment,generation: 1,expiresAt: demand.expiresAt } },wakeAt: 10,retries: 0,expiresAt: 100 }] } });
  function reserve(holder = 'miner') { f.state.write('reservations/empire',{ owner: 'reservations',version: 1,data: { claims: [{ resource: 'mining-tile:'+stationTile(context.plan.station),holder,scope: taskScope('miner','mine-task'),expiresAt: 20 }] } }); }
  const source = createNativePaidSourceObservation(f.state),miner = createNativePaidMinerObservation(f.state);
  return { ...f,creep,container,context,source,miner,reserve };
}
test('physical stock, mixed-resource space and live claims remain separate and detached',() => {
  const f = fixture(); f.reserve();
  const claim = (id: string,expiresAt: number,amount: number) => ({ id,owner: 'logistics',holder: 'courier',scope: 'courier-task',expiresAt,allocations: [{ pool: logisticsPool('stock','container','energy'),amount }] });
  f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [claim('live',20,30),claim('expired',10,70)] } });
  const before = JSON.stringify(f.root),result = f.source(f.context);
  expect(result).toMatchObject({ status: 'ready',observation: { source: { energy: 1500 },station: { facts: { energy: 80,claimedEnergy: 30,availableEnergy: 50,hits: 240000,ticksToDecay: 30 } },containerSpace: { usedCapacity: 100,freeEnergyCapacity: 1900 } } });
  if (result.status === 'ready') { expect(result.observation.quantityClaims).toHaveLength(1); result.observation.quantityClaims[0]!.allocations[0]!.amount = 999; }
  expect(JSON.stringify(f.root)).toBe(before);
});
test('miner geometry never implies reservation ownership or harvest completion',() => {
  const f = fixture(); f.reserve('other'); const before = JSON.stringify(f.root);
  expect(f.miner(f.context)).toMatchObject({ observation: { stage: 'station',energy: 8,assigned: false,claim: { holder: 'other' } } });
  expect(JSON.stringify(f.root)).toBe(before);
  f.reserve(); expect(f.miner(f.context)).toMatchObject({ observation: { stage: 'station',assigned: true } });
  f.creep.pos = startupPosition(3,24); expect(f.miner(f.context)).toMatchObject({ observation: { stage: 'approach',assigned: true } });
});
test('missing state stays missing and unsafe/lost source context defers',() => {
  const f = fixture(false); f.creep.store.energy = 0; const before = JSON.stringify(f.root);
  expect(f.miner(f.context)).toMatchObject({ observation: { stage: 'idle',assigned: false,claim: null } });
  expect(JSON.stringify(f.root)).toBe(before);
  delete f.game.rooms.E0N1; expect(f.source(f.context)).toMatchObject({ reason: 'vision' });
  f.context.cohort.generation = 2; expect(f.miner(f.context)).toMatchObject({ reason: 'paid-miner-authority' });
});


test('full miner task payload, retries and sleep survive detached read-only observation',() => {
  const f = fixture(); f.reserve();
  const envelope = f.state.read('tasks/miner') as { owner: string; version: number; data: { unit: string; queue: import('../../../src/persistence/tasks/schema').TaskRecord[] } };
  envelope.data.queue[0]!.wakeAt = 12; envelope.data.queue[0]!.retries = 2; f.state.write('tasks/miner',envelope);
  const before = JSON.stringify(f.root),observed = f.miner(f.context);
  expect(observed).toMatchObject({ status: 'ready',observation: { task: { wakeAt: 12,record: { phase: 'work',wakeAt: 12,retries: 2,payload: { home: 'W0N1' } } } } });
  if (observed.status === 'ready') observed.observation.task!.record.retries = 99;
  expect(JSON.stringify(f.root)).toBe(before);
});
