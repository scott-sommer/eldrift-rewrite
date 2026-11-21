import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { boostedUpgradeWork, issueUpgradeBoost } from '../../src/app/native-upgrade-boost';
import { createUpgradeBoost } from '../../src/features/work/upgrade-boost';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { boostRequest } from '../fixtures/boosts';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  let memory = {}; const state = createMemoryPort(() => memory), boosts = createUpgradeBoost(state,'W0N1'), boost = vi.fn(() => 0);
  vi.stubGlobal('Game',{ time: 1 }); vi.stubGlobal('ERR_NOT_ENOUGH_RESOURCES',-6);
  const lab = { id: 'lab',room: { name: 'W0N1' },mineralType: 'XGH2O' } as unknown as StructureLab;
  const creep = { id: 'unit',body: [{ type: 'work',hits: 100 }] } as unknown as Creep;
  const issue = () => issueUpgradeBoost(state,boosts,{ boost },lab,creep,'upgrade-room:W0N1',[]);
  return { state,boosts,boost,lab,creep,issue,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('specialist confirms only upgrade compounds on WORK; accepted native intent requires later observation',() => {
  const f = fixture(); f.issue(); expect(f.boost).toHaveBeenCalledOnce(); expect(f.boosts.settled(1,[{ id: 'unit',boosted: 1 }])).toEqual([]);
  f.creep.body.push({ type: 'work',hits: 100,boost: 'XZH2O' } as BodyPartDefinition); expect(boostedUpgradeWork(f.creep)).toBe(0);
  f.creep.body[0]!.boost = 'XGH2O'; f.reset(); expect(f.boosts.settled(2,[{ id: 'unit',boosted: boostedUpgradeWork(f.creep) }])).toEqual(['unit']);
});
test('unrelated lab compound is skipped as unavailable without issuing a harmful boost',() => {
  const f = fixture(); f.lab.mineralType = 'XZH2O'; f.issue(); expect(f.boost).not.toHaveBeenCalled();
  expect(f.boosts.settled(1,[{ id: 'unit',boosted: 0 }])).toEqual([]); expect(f.boosts.settled(2,[{ id: 'unit',boosted: 0 }])).toEqual(['unit']);
});
test('generic lab pin survives reset and fences specialist until the owner releases it',() => {
  const f = fixture(), jobs = createBoostRequests(f.state), request = boostRequest(); jobs.submit(request,1); jobs.update(request.owner,request.id,job => { job.lab = 'lab'; });
  f.reset(); f.issue(); expect(f.boost).not.toHaveBeenCalled(); expect(f.boosts.settled(2,[{ id: 'unit',boosted: 0 }])).toEqual([]);
  jobs.update(request.owner,request.id,job => { job.lab = null; }); f.issue(); expect(f.boost).toHaveBeenCalledOnce();
});
test('foreign admitted supply stock/capacity claims block spending until released',() => {
  const f = fixture(), claims = createQuantityReservations(f.state), pool = logisticsPool('capacity','lab','mineral');
  claims.reserve({ id: 'trip',owner: 'supplier',holder: 'courier',scope: 'haul',expiresAt: 10,allocations: [{ pool,amount: 30 }] },{ [pool]: 3000 },1);
  f.reset(); f.issue(); expect(f.boost).not.toHaveBeenCalled(); expect(claims.list(1)).toHaveLength(1);
  claims.releaseScope('haul'); f.issue(); expect(f.boost).toHaveBeenCalledOnce();
});
test('retiring and desired lab role compound restrictions fence the specialist',() => {
  const f = fixture(); f.state.write('industry-boost-labs/W0N1',{ owner: 'industry',version: 1,data: { roles: [{ lab: 'lab',resource: 'XGH2O',mineral: 60,energy: 40 }] } });
  f.issue(); expect(f.boost).not.toHaveBeenCalled();
  issueUpgradeBoost(f.state,f.boosts,{ boost: f.boost },f.lab,f.creep,'upgrade-room:W0N1',[{ lab: 'lab',resource: 'XGH2O',mineral: 60,energy: 40 }]);
  expect(f.boost).toHaveBeenCalledOnce();
});
