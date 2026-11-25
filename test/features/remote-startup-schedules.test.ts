import { createStartupScheduleStore } from '../../src/features/remotes/startup/schedules/store';
import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupSchedulePlanner } from '../../src/features/remotes/startup/schedules/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
function fixture() {
  const root = {}, state = createMemoryPort(() => root), home = 'W0N1', input = startupDeliveryInput();
  input.project.spawning.room = home;
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  input.project.spawning.cash.horizon = 4000; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  input.project.spawning.cash.homeEnergy = 3000; input.project.spawning.funding.initialEnergy = 3000; input.project.spawning.funding.capacity = 3000;
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'cohort',observedAt: 1,expiresAt: 100,tick: 1,input };
  return { root,state,home,query,owner: createStartupSchedulePlanner(state,home) };
}
test('whole-horizon replacement planning resumes across JSON reset with one aggregate frame budget',() => {
  const f = fixture();
  expect(f.owner.advance(f.query,{ frames: 10001,extensions: 16 })).toMatchObject({ status: 'deferred',frames: 10001,extensions: 2 });
  expect(f.owner.result(f.query)).toBeUndefined(); expect(f.owner.read().job?.complete).toBe(false);
  const root = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => root), owner = createStartupSchedulePlanner(state,f.home), query = { ...f.query,tick: 2 };
  expect(owner.advance(query,{ frames: 10001,extensions: 16 })).toMatchObject({ status: 'deferred',frames: 10001,extensions: 2 });
  const result = owner.advance({ ...query,tick: 3 },{ frames: 10001,extensions: 16 });
  expect(result).toMatchObject({ status: 'complete',frames: 3,extensions: 0 }); if (result.status !== 'complete') return;
  expect(result.result.spawning.births).toHaveLength(6); expect(result.result.cash.birthEnergy).toBe(900);
  expect(result.query.input.project.spawning.requests).toHaveLength(6); expect(f.query.input.project.spawning.requests).toHaveLength(2);
  const before = JSON.stringify(root); expect(owner.result({ ...query,tick: 3 })?.result).toEqual(result.result);
  expect(owner.advance({ ...query,tick: 3 },{ frames: 0,extensions: 0 })).toMatchObject({ status: 'complete',frames: 0,extensions: 0 }); expect(JSON.stringify(root)).toBe(before);
  const catalog = createStartupCandidateCatalog(state,f.home);
  expect(catalog.capture('expanded',result.query,{ minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 4000,maximumHouseholdCapital: 3000 },0)).toBe('saved');
});
test('extension budget prevents partial plans from being published as final',() => {
  const f = fixture(); expect(f.owner.advance(f.query,{ frames: 4001,extensions: 0 })).toMatchObject({ status: 'deferred',reason: 'extensions',frames: 4001,extensions: 0 });
  expect(f.owner.result(f.query)).toBeUndefined();
  expect(f.owner.advance({ ...f.query,tick: 2 },{ frames: 0,extensions: 1 })).toMatchObject({ status: 'deferred',reason: 'budget',frames: 0,extensions: 1 });
  expect(f.owner.read().job?.input.project.spawning.requests).toHaveLength(3);
});
test('zero admission/frame budgets and expiry cannot initialize planning metadata',() => {
  const f = fixture();
  expect(f.owner.advance(f.query,{ frames: 100,extensions: 2 },() => false)).toMatchObject({ status: 'deferred',reason: 'admission' }); expect(f.root).toEqual({});
  expect(f.owner.advance(f.query,{ frames: 0,extensions: 0 })).toMatchObject({ status: 'deferred',reason: 'budget' }); expect(f.root).toEqual({});
  expect(f.owner.advance({ ...f.query,tick: 101 },{ frames: 100,extensions: 2 })).toMatchObject({ status: 'deferred',reason: 'expired' }); expect(f.root).toEqual({});
});
test('input or context changes restart expanded schedules and cannot expose old results',() => {
  const f = fixture(); f.owner.advance(f.query,{ frames: 10001,extensions: 16 });
  f.query.input.project.source.energy = 900;
  expect(f.owner.result(f.query)).toBeUndefined();
  expect(f.owner.advance({ ...f.query,tick: 2 },{ frames: 10,extensions: 1 })).toMatchObject({ status: 'deferred',frames: 10,extensions: 0 });
  expect(f.owner.read().job?.input.project.spawning.requests).toHaveLength(2);
});
test('unfunded future service remains deferred rather than a complete finite schedule',() => {
  const f = fixture(); f.query.input.project.spawning.funding.initialEnergy = 300;
  expect(f.owner.advance(f.query,{ frames: 10001,extensions: 16 })).toMatchObject({ status: 'deferred',reason: 'unfunded-service',frames: 8002,extensions: 1 });
  expect(f.owner.result(f.query)).toBeUndefined();
});
test('older clocks and incompatible metadata refuse without changing either owner',() => {
  const f = fixture(); f.owner.advance({ ...f.query,tick: 5 },{ frames: 10,extensions: 1 }); const before = JSON.stringify(f.root);
  expect(f.owner.advance(f.query,{ frames: 10,extensions: 1 })).toMatchObject({ status: 'deferred',reason: 'clock' }); expect(JSON.stringify(f.root)).toBe(before);
  const key = 'remoteStartupSchedules/W0N1', envelope = f.state.read(key) as { owner: string; version: number; data: unknown };
  f.state.write(key,{ ...envelope,version: 5 }); const future = JSON.stringify(f.root);
  expect(() => f.owner.result({ ...f.query,tick: 5 })).toThrow('future'); expect(JSON.stringify(f.root)).toBe(future);
});
test('invalid budgets fail before state initialization',() => {
  const f = fixture(); for (const frames of [-1,NaN,10002]) expect(() => f.owner.advance(f.query,{ frames,extensions: 1 })).toThrow('budget');
  expect(() => f.owner.advance(f.query,{ frames: 100,extensions: 17 })).toThrow('budget'); expect(f.root).toEqual({});
});

test('withdrawal is scoped to schedule evidence and never clears scratch planning or other sources',() => {
  const f = fixture(); f.owner.advance(f.query,{ frames: 10,extensions: 1 }); const scratch = JSON.stringify(f.state.read('remoteStartupPlanning/W0N1'));
  expect(f.owner.withdraw(1,2,{ ...f.query,source: 'other' })).toBe(false);
  expect(f.owner.withdraw(0,2,f.query)).toBe(false); expect(f.owner.withdraw(1,2,f.query)).toBe(true);
  expect(f.owner.read().job).toBeNull(); expect(JSON.stringify(f.state.read('remoteStartupPlanning/W0N1'))).toBe(scratch);
});
test('oversized seed metadata refuses capacity without replacing a valid schedule',() => {
  const f = fixture(); f.owner.advance(f.query,{ frames: 10,extensions: 1 }); const before = JSON.stringify(f.root), store = createStartupScheduleStore(f.state,f.home);
  expect(store.save(1,2,{ ...store.read().job!,seedIdentity: 'x'.repeat(262145) })).toBe('capacity'); expect(JSON.stringify(f.root)).toBe(before);
});
