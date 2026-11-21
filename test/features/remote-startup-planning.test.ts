import { PlainDataCapacityError } from '../../src/core/plain-data';
import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { StartupPlanningRequest } from '../../src/features/remotes/startup/planning/model';
function fixture() {
  const root = {}, state = createMemoryPort(() => root), home = 'W0N1', input = startupDeliveryInput();
  input.project.spawning.room = home;
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const request: StartupPlanningRequest = { room: 'E0N1',source: 'source',generation: 1,binding: 'fixture-context',observedAt: 1,expiresAt: 1000,tick: 1,expectedRevision: 0,input };
  return { root,state,home,request,owner: createStartupPlanningJob(state,home) };
}
test('empty reads and zero admission/frame budgets never initialize a job namespace',() => {
  const f = fixture(); expect(f.owner.read().job).toBeNull(); expect(f.owner.result(f.request)).toBeUndefined();
  expect(f.owner.advance(f.request,0)).toEqual({ status: 'deferred',reason: 'budget',frames: 0 });
  expect(f.owner.advance(f.request,5,() => false)).toEqual({ status: 'deferred',reason: 'admission',frames: 0 }); expect(f.root).toEqual({});
});
test('JSON reset resumes pending settlement, publishes only completion and reuses results without writes',() => {
  const f = fixture(), expected = forecastStartupProject(f.request.input);
  expect(f.owner.advance(f.request,43)).toEqual({ status: 'deferred',reason: 'budget',frames: 43 });
  expect(f.owner.read().job?.checkpoint.due).toHaveLength(1); expect(f.owner.result(f.request)).toBeUndefined();
  const root = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => root), owner = createStartupPlanningJob(state,f.home);
  expect(owner.advance({ ...f.request,tick: 2,expectedRevision: 1 },1)).toEqual({ status: 'deferred',reason: 'budget',frames: 1 });
  expect(owner.read().job?.checkpoint).toMatchObject({ tick: 44,sourceAccounting: { state: { deliveredEnergy: 50 } } });
  expect(owner.advance({ ...f.request,tick: 3,expectedRevision: 2 },57)).toEqual({ status: 'complete',frames: 57,through: 101,result: expected });
  const before = JSON.stringify(root); expect(owner.result({ ...f.request,tick: 4 })).toEqual(expected);
  expect(owner.advance({ ...f.request,tick: 4,expectedRevision: 3 },0)).toEqual({ status: 'complete',frames: 0,through: 101,result: expected });
  expect(JSON.stringify(root)).toBe(before);
});
test('frame-guard exhaustion still saves completed work using the reserved publication budget',() => {
  const f = fixture(); let checks = 0;
  expect(f.owner.advance(f.request,100,() => ++checks < 3)).toEqual({ status: 'deferred',reason: 'admission',frames: 1 });
  expect(f.owner.read()).toMatchObject({ revision: 1,clock: 1,job: { checkpoint: { tick: 1 } } });
});
test('changed context, epoch, expiry and input replace a candidate without exposing the old result',() => {
  const changes: ((request: StartupPlanningRequest) => void)[] = [
    request => { request.binding += '-new'; },request => { request.generation++; },request => { request.source = 'other'; },
    request => { request.room = 'E1N1'; },request => { request.observedAt = 2; },request => { request.expiresAt++; },
    request => { request.input.project.source.energy--; },request => { request.input.project.spawning.requests[0]!.body = ['move','carry','work']; },
  ];
  for (const change of changes) {
    const f = fixture(); f.owner.advance(f.request,101); const changed = fixture().request; changed.tick = 2; changed.expectedRevision = 1; change(changed);
    expect(f.owner.result(changed)).toBeUndefined(); expect(f.owner.advance(changed,1)).toEqual({ status: 'deferred',reason: 'budget',frames: 1 });
    expect(f.owner.read().job?.checkpoint.tick).toBe(1); expect(f.owner.result(f.request)).toBeUndefined();
  }
});
test('expired observations and older clocks cannot expose a completed forecast or mutate state',() => {
  const f = fixture(); f.owner.advance({ ...f.request,tick: 10 },101); const before = JSON.stringify(f.root);
  expect(f.owner.advance({ ...f.request,tick: 9,expectedRevision: 1 },1)).toEqual({ status: 'deferred',reason: 'clock',frames: 0 });
  expect(f.owner.result({ ...f.request,tick: 9 })).toBeUndefined(); expect(f.owner.result({ ...f.request,tick: 1001 })).toBeUndefined();
  expect(f.owner.advance({ ...f.request,tick: 1001,expectedRevision: 1 },1)).toEqual({ status: 'deferred',reason: 'expired',frames: 0 }); expect(JSON.stringify(f.root)).toBe(before);
});
test('a stale revision and a concurrent frame-guard writer cannot overwrite another candidate',() => {
  const f = fixture(); let checks = 0;
  const result = f.owner.advance(f.request,1,() => {
    if (++checks === 2) expect(f.owner.advance({ ...f.request,binding: 'other' },1).status).toBe('deferred'); return true;
  });
  expect(result).toEqual({ status: 'deferred',reason: 'conflict',frames: 1 }); expect(f.owner.read().job?.binding).toBe('other');
  const before = JSON.stringify(f.root); expect(f.owner.advance(f.request,1)).toEqual({ status: 'deferred',reason: 'conflict',frames: 0 }); expect(JSON.stringify(f.root)).toBe(before);
});
test('caller input mutation inside frame admission cannot change the snapshotted candidate',() => {
  const f = fixture(); let checks = 0;
  f.owner.advance(f.request,1,() => { if (++checks === 2) { f.request.input.project.source.energy = 0; f.request.binding = 'changed'; } return true; });
  expect(f.owner.read().job).toMatchObject({ binding: 'fixture-context',input: { project: { source: { energy: 100 } } } });
});
test('record capacity refuses publication without initializing memory or returning completion',() => {
  const f = fixture(); f.request.input.project.spawning.liveNames = new Set(Array.from({ length: 3500 },(_,index) => 'unused-'+index+'x'.repeat(40)));
  expect(f.owner.advance(f.request,1)).toEqual({ status: 'deferred',reason: 'capacity',frames: 1 }); expect(f.root).toEqual({});
});
test('portable input capacity refuses work before a simulation frame starts',() => {
  const f = fixture(); f.request.input.project.spawning.liveNames = new Set(Array.from({ length: 7000 },(_,index) => 'unused-'+index+'x'.repeat(40)));
  expect(f.owner.advance(f.request,1)).toEqual({ status: 'deferred',reason: 'capacity',frames: 0 }); expect(f.root).toEqual({});
});
test('withdrawal is scoped by source/generation/revision and preserves independent owners and homes',() => {
  const f = fixture(); f.state.write('fixture/sentinel',{ owner: 'fixture',version: 1,data: { keep: 42 } }); f.owner.advance(f.request,20);
  expect(f.owner.withdraw(1,2,{ ...f.request,source: 'other' })).toBe(false); expect(f.owner.withdraw(1,2,{ ...f.request,generation: 2 })).toBe(false);
  expect(f.owner.withdraw(0,2,f.request)).toBe(false); expect(f.owner.withdraw(1,2,f.request)).toBe(true);
  expect(f.owner.read()).toMatchObject({ revision: 2,clock: 2,job: null }); expect(f.state.read('fixture/sentinel')).toMatchObject({ data: { keep: 42 } });
  expect(createStartupPlanningJob(f.state,'W1N1').read().job).toBeNull();
});
test.each(['owner','version','checkpoint','input'])('incompatible or corrupt %s state fails closed without replacement',field => {
  const f = fixture(); f.owner.advance(f.request,20);
  const raw = f.state.read('remoteStartupPlanning/W0N1') as { owner: string; version: number; data: { job: { checkpoint: { format: number }; input: { project: { spawning: { liveNames: string[] } } } } } };
  if (field === 'owner') raw.owner = 'other'; if (field === 'version') raw.version = 5;
  if (field === 'checkpoint') raw.data.job.checkpoint.format = 3; if (field === 'input') raw.data.job.input.project.spawning.liveNames = ['duplicate','duplicate'];
  f.state.write('remoteStartupPlanning/W0N1',raw); const before = JSON.stringify(f.root);
  expect(() => f.owner.read()).toThrow(); expect(() => f.owner.advance({ ...f.request,tick: 2,expectedRevision: 1 },1)).toThrow(); expect(JSON.stringify(f.root)).toBe(before);
});
test('invalid request/budget and unrelated errors remain errors rather than capacity deferrals',() => {
  const f = fixture(); expect(() => f.owner.advance(f.request,Infinity)).toThrow('budget');
  expect(() => f.owner.advance({ ...f.request,observedAt: 2 },1)).toThrow('context');
  expect(() => f.owner.advance(f.request,1,() => { throw new Error('fixture failure'); })).toThrow('fixture failure'); expect(f.root).toEqual({});
});

test('a corrupt concurrent stored payload is an error even when it exceeds copy capacity',() => {
  const f = fixture(); let checks = 0;
  expect(() => f.owner.advance(f.request,1,() => {
    if (++checks === 2) Object.assign(f.root,{ eldrift: { format: 1,records: { 'remoteStartupPlanning/W0N1': { owner: 'remotes',version: 1,data: { noise: Array(100001).fill(0) } } } } });
    return true;
  })).toThrow(PlainDataCapacityError);
});
test('an oversized new input cannot read a previously completed candidate',() => {
  const f = fixture(); f.owner.advance(f.request,101);
  f.request.input.project.spawning.liveNames = new Set(Array.from({ length: 7000 },(_,index) => 'unused-'+index+'x'.repeat(40)));
  expect(f.owner.result({ ...f.request,tick: 2 })).toBeUndefined(); expect(f.owner.read().revision).toBe(1);
});
