import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { defaults } from '../../src/config/model';
import { nativeUpgradeLab, specialistBoostLabIds } from '../../src/app/native-specialist-labs';
import { nativeLabSettings } from '../../src/app/native-lab-settings';
import { nativeBoostBudget } from '../../src/app/native-boost-budget';
import { nativeBoostLabCandidates } from '../../src/app/native-boost-labs';
import { boostJob } from '../fixtures/boosts';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const memory = {}, state = createMemoryPort(() => memory);
  for (const [key,value] of Object.entries({ FIND_MY_STRUCTURES: 1,FIND_MY_CREEPS: 2,STRUCTURE_LAB: 'lab',RESOURCE_ENERGY: 'energy',RESOURCES_ALL: ['energy','GH2O'],LAB_BOOST_MINERAL: 30,LAB_BOOST_ENERGY: 20 })) vi.stubGlobal(key,value);
  const lab = (id: string,amount: number) => ({ id,structureType: 'lab',isActive: () => true,mineralType: 'GH2O',mineralAmount: amount,store: { energy: 80,getUsedCapacity: (resource: string) => resource === 'energy' ? 80 : amount } });
  const labs = [lab('b',60),lab('a',120)], room = { name: 'W0N1',find: (kind: number) => kind === 1 ? labs : [] } as unknown as Room;
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: room },creeps: {} });
  return { state,room,labs,policy: { ...defaults,upgradeRoomEnabled: true } };
}
test('specialist mode reserves the same deterministic active lab used by its physical layout',() => {
  const f = fixture(); expect(nativeUpgradeLab(f.room)!.id).toBe('a'); expect(specialistBoostLabIds('W0N1',f.policy)).toEqual(['a']);
  expect(nativeLabSettings(f.state,'W0N1',{ ...f.policy,labReservedIds: ['manual'] }).labReservedIds).toEqual(['manual','a']);
  expect(specialistBoostLabIds('W0N1',defaults)).toEqual([]); expect(specialistBoostLabIds('W9N9',f.policy)).toEqual([]);
  f.labs[1]!.isActive = () => false; expect(specialistBoostLabIds('W0N1',f.policy)).toEqual(['b']);
});
test('generic birth funding cannot spend the specialist local kit and remains possible from other eligible labs',() => {
  const f = fixture(); expect(nativeBoostBudget(f.state,f.room,f.policy).local.GH2O).toEqual({ mineral: 60,energy: 80 });
  f.labs.shift(); const budget = nativeBoostBudget(f.state,f.room,f.policy); expect(budget.local).toEqual({}); expect(budget.resources).toEqual([]);
  expect(nativeBoostBudget(f.state,f.room,defaults).local.GH2O!.mineral).toBe(120);
});
test('new generic pins exclude specialist lab but an existing admitted pin remains available for settlement',() => {
  const f = fixture(), job = boostJob(), step = job.request.steps[0]!;
  const excluded = specialistBoostLabIds('W0N1',f.policy);
  expect(nativeBoostLabCandidates(f.state,job,step,[],excluded).map(lab => lab.id)).toEqual(['b']);
  job.lab = 'a'; expect(nativeBoostLabCandidates(f.state,job,step,[],excluded).map(lab => lab.id)).toEqual(['a','b']);
});
