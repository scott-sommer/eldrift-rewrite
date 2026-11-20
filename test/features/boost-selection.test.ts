import { expect, test } from 'vitest';
import { legacyBoostPreferences, selectLegacyBoostPlan } from '../../src/features/industry/boosts/legacy-preferences';
import { selectBoostPlan } from '../../src/features/industry/boosts/selection-policy';
import type { BoostBodyPart } from '../../src/capabilities/industry/boosts/model';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { boostRequest } from '../fixtures/boosts';
const price = { mineral: 30,energy: 20 };
const part = (type: string,boost: string | null = null): BoostBodyPart => ({ type,hits: 100,boost });
const actor = (body: BoostBodyPart[]) => ({ role: 'worker',remoteUpgrader: false,body });

const legacyCases = [
  ['move','move',['XZHO2','ZHO2','ZO']], ['heal','heal',['XLHO2','LHO2','LO']],
  ['work','work',['XZH2O','ZH2O','ZH']], ['attack','attack',['XUH2O','UH2O','UH']],
  ['ranged_attack','ranged_attack',['XKHO2','KHO2','KO']], ['tough','tough',['XGHO2','GHO2','GO']],
  ['upgrade','work',['XGH2O','GH2O','GH']], ['build','work',['XLH2O','LH2O','LH']],
  ['carry','carry',['XKH2O','KH2O','KH']],
] as const;
test.each(legacyCases)('%s retains all three legacy tiers and exact body type',(alias,type,compounds) => {
  const preference = { part: type,compounds };
  expect(legacyBoostPreferences[alias]).toEqual(preference);
  for (const [tier,resource] of preference.compounds.entries()) {
    const minerals = Object.fromEntries(preference.compounds.map((name,index) => [name,index < tier ? 59 : 60]));
    expect(selectLegacyBoostPlan([alias],actor([part(preference.part),part(preference.part)]),{ minerals,energy: 40 },price))
      .toEqual({ status: 'selected',steps: [{ part: preference.part,resource,count: 2 }] });
  }
});
test('aggregate energy cannot be promised to multiple steps and unavailable selection has no partial plan',() => {
  const unit = actor([part('work'),part('move')]);
  expect(selectLegacyBoostPlan(['upgrade','move'],unit,{ minerals: { XGH2O: 30,XZHO2: 30 },energy: 20 },price))
    .toEqual({ status: 'unavailable',alias: 'move',reason: 'stock' });
});
test('existing compatible boosts reduce payment but count toward the exact target',() => {
  const unit = actor([part('work','GH'),part('work')]);
  expect(selectLegacyBoostPlan(['upgrade'],unit,{ minerals: { XGH2O: 60,GH: 30 },energy: 20 },price))
    .toEqual({ status: 'selected',steps: [{ part: 'work',resource: 'GH',count: 2 }] });
  expect(selectLegacyBoostPlan(['upgrade'],actor([part('work','GH')]),{ minerals: {},energy: 0 },price).status).toBe('selected');
});
test('incompatible boosts, disabled parts and absent types never generate a payable plan',() => {
  for (const body of [[part('work','ZH')],[{ ...part('work'),hits: 0 }]]) {
    expect(selectLegacyBoostPlan(['upgrade'],actor(body),{ minerals: { XGH2O: 60 },energy: 40 },price).status).toBe('unavailable');
  }
  expect(selectLegacyBoostPlan(['upgrade'],actor([part('move')]),{ minerals: {},energy: 0 },price))
    .toEqual({ status: 'unavailable',alias: 'upgrade',reason: 'body' });
});
test('remote-upgrader exception is role specific and explicit, not a successful boost outcome',() => {
  expect(selectLegacyBoostPlan(['upgrade'],{ ...actor([]),role: 'upgrader',remoteUpgrader: true },{ minerals: {},energy: 0 },price))
    .toEqual({ status: 'skipped',reason: 'remote-upgrader' });
  expect(selectLegacyBoostPlan(['upgrade'],{ ...actor([]),remoteUpgrader: true },{ minerals: {},energy: 0 },price).status).toBe('unavailable');
});
test('aliases sharing WORK are rejected rather than silently assigning mutually exclusive compounds',() => {
  expect(() => selectLegacyBoostPlan(['work','upgrade'],actor([part('work')]),{ minerals: {},energy: 0 },price)).toThrow('Conflicting');
  expect(() => selectLegacyBoostPlan(['constructor'],actor([]),{ minerals: {},energy: 0 },price)).toThrow('Unknown');
});
test('injected preferences and prices support alternate policies without mutating inputs',() => {
  const minerals = { custom: 6 }, body = [part('move')], preferences = { travel: { part: 'move',compounds: ['custom'] } };
  expect(selectBoostPlan(['travel'],body,{ minerals,energy: 3 },{ mineral: 6,energy: 3 },preferences))
    .toEqual({ status: 'selected',steps: [{ part: 'move',resource: 'custom',count: 1 }] });
  expect(minerals).toEqual({ custom: 6 }); expect(body).toEqual([part('move')]);
});
test('invalid prices/budgets and unbounded plans refuse before producing requests',() => {
  const invoke = (energy: number,mineral: number) => selectLegacyBoostPlan(['move'],actor([part('move')]),{ minerals: { ZO: mineral },energy },price);
  for (const value of [-1,NaN,Infinity,1.5]) expect(() => invoke(value,30)).toThrow('budget');
  expect(() => invoke(20,-1)).toThrow('budget');
  expect(() => selectLegacyBoostPlan([],actor([]),{ minerals: {},energy: 0 },price)).toThrow('bounds');
  expect(() => selectLegacyBoostPlan(['move'],actor([]),{ minerals: {},energy: 0 },{ mineral: 0,energy: 20 })).toThrow('price');
});
test('selected steps enter immutable observed-readiness requests; selection itself cannot make ready',() => {
  const selection = selectLegacyBoostPlan(['upgrade'],actor([part('work'),part('work')]),{ minerals: { GH: 60 },energy: 40 },price);
  expect(selection.status).toBe('selected');
  if (selection.status !== 'selected') throw new Error('Expected plan');
  const store = createBoostRequests(createMemoryPort(() => memory)); const memory = {};
  expect(store.submit({ ...boostRequest(),steps: selection.steps },1)).toBe(true);
  expect(store.readiness('mission','boost')).toBe('waiting');
  expect(store.get('mission','boost')!.request.steps).toEqual([{ part: 'work',resource: 'GH',count: 2 }]);
});
