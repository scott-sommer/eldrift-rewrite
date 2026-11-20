import { expect, test } from 'vitest';
import { createBoostOperator } from '../../src/features/operator/boosts';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { observeBoostJob } from '../../src/capabilities/industry/boosts/observe';
import { boostUnit } from '../fixtures/boosts';
function fixture() {
  const memory = {}, state = createMemoryPort(() => memory), unit = boostUnit();
  const commands = createBoostOperator(state,{ clock: () => 1,unit: name => name === unit.name ? unit : null,
    budget: () => ({ minerals: { GH2O: 60 },energy: 40 }),supported: step => ['GH2O','XGH2O'].includes(step.resource),price: { mineral: 30,energy: 20 } });
  return { commands,state,memory,unit,store: createBoostRequests(state),options: { id: 'operator',expiresAt: 20,required: true } };
}
test('operator read commands are detached and do not initialize absent state',() => {
  const f = fixture(); expect(f.commands.list()).toEqual([]); expect(f.commands.get('mission','absent')).toBeNull();
  expect(() => f.commands.cancel('mission','absent')).toThrow('absent'); expect(() => f.commands.acknowledge('mission','absent')).toThrow('absent'); expect(f.memory).toEqual({});
  f.commands.request(f.unit.name,[{ part: 'work',resource: 'XGH2O',count: 2 }],f.options);
  const listed = f.commands.list()[0]!; listed.observed[0] = 2; listed.status = 'confirmed';
  expect(f.commands.get('mission','operator')).toMatchObject({ status: 'pending',readiness: 'waiting',holdsUnit: true,observed: [0] });
  expect(f.commands.list('other')).toEqual([]);
});
test('exact admission derives native population owner/home and never reports boost success from acceptance',() => {
  const f = fixture(), result = f.commands.request(f.unit.name,[{ part: 'work',resource: 'XGH2O',count: 2 }],f.options);
  expect(result.accepted).toBe(true); expect(result.job).toMatchObject({ readiness: 'waiting',request: { unit: f.unit.id,name: f.unit.name,owner: 'mission',home: 'W0N1' } });
  expect(f.commands.request(f.unit.name,[{ part: 'work',resource: 'XGH2O',count: 2 }],f.options).accepted).toBe(true);
  expect(() => f.commands.request(f.unit.name,[{ part: 'work',resource: 'GH2O',count: 2 }],f.options)).toThrow('conflict');
});
test('alias selection chooses a funded fallback and rejected requests do not erase existing work',() => {
  const f = fixture(), result = f.commands.aliases(f.unit.name,['upgrade'],f.options);
  expect(result).toMatchObject({ accepted: true,selection: { steps: [{ part: 'work',resource: 'GH2O',count: 2 }] },job: { readiness: 'waiting' } });
  expect(f.commands.request(f.unit.name,[{ part: 'work',resource: 'XGH2O',count: 2 }],{ ...f.options,id: 'competing' }).accepted).toBe(false);
  expect(f.store.read()).toHaveLength(1);
});
test('unknown, unowned, unassigned or spawning actors and unsupported compounds refuse explicitly',() => {
  const f = fixture(); expect(() => f.commands.request('missing',[],f.options)).toThrow('Owned creep');
  f.unit.spawning = true; expect(() => f.commands.aliases(f.unit.name,['upgrade'],f.options)).toThrow('spawn boost contract');
  f.unit.spawning = false; f.unit.owner = ''; expect(() => f.commands.request(f.unit.name,[],f.options)).toThrow('population identity');
  f.unit.owner = 'mission'; expect(() => f.commands.request(f.unit.name,[{ part: 'work',resource: 'H',count: 2 }],f.options)).toThrow('Unsupported');
  expect(f.store.read()).toEqual([]);
});
test('cancellation after admission preserves the actual effect, remains not ready and requires a settled acknowledgement',() => {
  const f = fixture(); f.commands.request(f.unit.name,[{ part: 'work',resource: 'XGH2O',count: 2 }],f.options);
  f.store.update('mission','operator',job => { job.status = 'issued'; job.lab = 'lab'; job.attempt = { tick: 1,before: 0,count: 2,resource: 'XGH2O',part: 'work',code: 0 }; });
  expect(f.commands.cancel('mission','operator')).toMatchObject({ status: 'issued',cancelRequested: true,readiness: 'waiting' });
  expect(() => f.commands.acknowledge('mission','operator')).toThrow('not settled');
  const job = f.store.get('mission','operator')!; f.unit.body.forEach(part => { part.boost = 'XGH2O'; }); observeBoostJob(job,f.unit,2);
  f.store.update('mission','operator',current => Object.assign(current,job));
  expect(f.commands.get('mission','operator')).toMatchObject({ status: 'cancelled',readiness: 'failed',observed: [2],holdsUnit: true });
  expect(f.commands.acknowledge('mission','operator')).toMatchObject({ readiness: 'failed',acknowledged: true,holdsUnit: false });
});
test('wrong owner cancellation and unsettled acknowledgement do not mutate queue state',() => {
  const f = fixture(); f.commands.aliases(f.unit.name,['upgrade'],f.options); const before = JSON.stringify(f.memory);
  expect(() => f.commands.cancel('other','operator')).toThrow('absent'); expect(() => f.commands.acknowledge('mission','operator')).toThrow('not settled');
  expect(JSON.stringify(f.memory)).toBe(before);
});
