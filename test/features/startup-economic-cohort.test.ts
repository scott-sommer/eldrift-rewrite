import { canStartHomeJob } from '../../src/app/remotes/startup/economic/prepare';
import { startupQueueHasUnpaidCohort, startupQueueMatches } from '../../src/features/remotes/startup/queue-fence';
import { createStartupCohortMaintenance } from '../../src/features/remotes/startup/candidates/cohort-maintenance';
import { missingStartupBirths } from '../../src/app/remotes/startup/economic/proposals';
import { startupFixture } from '../fixtures/remote-startup';
import { afterEach, expect, test, vi } from 'vitest';
import { economicCohortFixture } from '../fixtures/startup-economic';
import { advanceEconomicProposal } from '../../src/app/remotes/startup/economic/advance';
import { publishStartupCohort } from '../../src/features/remotes/startup/publish-cohort';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { cleanupStartupCohort } from '../../src/features/remotes/startup/candidates/cohort-cleanup';
import { peekSpawnIdentity } from '../../src/features/population/spawn-identity';
import { createStartupForecastAdmission } from '../../src/features/remotes/startup/candidates/birth-admission';
import { createNativeEconomicStartup } from '../../src/app/remotes/startup/economic/native';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
import type { Envelope } from '../../src/persistence/versioned-state';
afterEach(() => vi.unstubAllGlobals());
test('cooperative planning survives reset and publishes once before the future approved birth window',() => {
  const f = economicCohortFixture();
  f.at(2); expect(advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true)).toBe(false);
  const before = f.root(); expect(advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true)).toBe(false); expect(f.root()).toBe(before);
  expect(f.state.read('spawning/'+f.home)).toBeUndefined(); f.reload();
  for (const tick of [3,4]) { f.at(tick); expect(advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true)).toBe(false); }
  f.at(5); expect(advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true)).toBe(true);
  const queued = createSpawnQueue(f.state,f.home).list(); expect(queued).toHaveLength(2); expect(queued[0]).toMatchObject({ readyAt: 21,expiresAt: 121 }); expect(f.approvals.read().approvals[0]!.approvedAt).toBe(5);
  const request = queued[0]!, profile: RemoteFleetProfile = { home: f.home,room: f.query.room,source: f.query.source,generation: 1,kind: 'miner',owner: request.owner,body: [...request.body],desired: 1,travelTicks: 0,marginTicks: 0,retireTicks: 10,priority: 0 };
  const admit = createStartupForecastAdmission(f.state,f.home,f.approvals.result); expect(admit(profile,request,f.context)).toBe(false);
  f.at(21); expect(admit(profile,request,f.context)).toBe(true);
});
test('missed planning deadline or changed binding discards an unpaid proposal without approval',() => {
  for (const changed of [false,true]) {
    const f = economicCohortFixture(); f.at(changed ? 2 : 21); if (changed) f.context.binding = 'changed';
    expect(advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true)).toBe(false);
    expect(f.planner.read().job).toBeNull(); expect(f.approvals.read().approvals).toEqual([]); expect(createSpawnQueue(f.state,f.home).list()).toEqual([]);
  }
});
test('partial publication cannot approve and a reservation gap requires exact cleanup rather than identity reuse',() => {
  const f = economicCohortFixture(); let fail = true;
  const port = { read: f.state.read,write(key: string,value: Envelope) {
    if (fail && key === 'spawning/'+f.home && (value.data as { requests: unknown[] }).requests.length === 2) { fail = false; throw new Error('interrupted publication'); }
    f.state.write(key,value);
  } };
  expect(() => publishStartupCohort(port,f.home,f.query,new Set())).toThrow('interrupted publication');
  expect(f.approvals.read().approvals).toEqual([]); expect(createSpawnQueue(f.state,f.home).list()).toHaveLength(1);
  f.reload(); expect(publishStartupCohort(f.state,f.home,f.query,new Set())).toBe('identity');
  expect(cleanupStartupCohort(f.state,f.home,f.query,new Set()).cancelled).toEqual(['ed-'+f.home+'-1']); expect(peekSpawnIdentity(f.state,f.home)).toBe('ed-'+f.home+'-3');
});
test('ordinary configured modes retain ordinary admission while a financial marker cannot downgrade',() => {
  const f = economicCohortFixture(), policy = createNativeEconomicStartup(f.state,{ availableEnergy: (_home,value) => value }), request = f.query.input.project.spawning.requests[0]!;
  const profile = { home: f.home } as RemoteFleetProfile, ordinary = { ...request }; delete ordinary.admission;
  const eager = { ...f.config,remoteStartupPolicy: 'eager' as const };
  expect(policy.prepare!(profile,eager,() => true)).toBeUndefined(); expect(policy.admit!(profile,ordinary,eager)).toBe(true); expect(policy.admit!(profile,request,eager)).toBe(false);
  expect(policy.current(profile,eager)).toBeUndefined(); expect(policy.admit!(profile,request,f.config)).toBe(false);
});

test('a damaged incumbent cannot suppress an economically modeled replacement',() => {
  const f = startupFixture(), creep = f.activeMiner(); f.game.creeps[creep.name] = creep;
  expect(missingStartupBirths(f.state,f.miner,f.config)).toBe(0);
  creep.getActiveBodyparts = () => 0; expect(missingStartupBirths(f.state,f.miner,f.config)).toBe(1);
});

test('new home spending during planning refuses publication and preserves the competing request',() => {
  const f = economicCohortFixture(), queue = createSpawnQueue(f.state,f.home);
  queue.submit({ id: 'new-home-work',name: 'new-home-work',owner: 'household',room: f.home,body: ['work','carry','move'],priority: 0,readyAt: 10,expiresAt: 100 });
  for (const tick of [2,3,4,5]) { f.at(tick); expect(advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true)).toBe(false); }
  expect(f.approvals.read().approvals).toEqual([]);
  expect(queue.list().map(request => request.id)).toEqual(['new-home-work']);
  expect(f.planner.read().job).toBeNull();
});
test('new spending after approval cannot borrow its old financial calendar at final payment',() => {
  const f = economicCohortFixture();
  for (const tick of [2,3,4,5]) { f.at(tick); advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true); }
  const queue = createSpawnQueue(f.state,f.home), request = queue.list()[0]!;
  const profile = { home: f.home,room: f.query.room,source: f.query.source,generation: 1,owner: request.owner } as RemoteFleetProfile;
  f.at(21); const admit = createStartupForecastAdmission(f.state,f.home,f.approvals.result);
  expect(admit(profile,request,f.context)).toBe(true);
  queue.defer(new Set([request.id]),21); expect(admit(profile,request,f.context)).toBe(true);
  queue.submit({ id: 'new-home-work',name: 'new-home-work',owner: 'household',room: f.home,body: ['work','carry','move'],priority: 0,readyAt: 21,expiresAt: 100 });
  const before = f.root(); expect(admit(profile,request,f.context)).toBe(false); expect(f.root()).toBe(before);
});

test('queue changes revoke only unstarted cohort members and preserve the other spending owner',() => {
  const f = economicCohortFixture();
  for (const tick of [2,3,4,5]) { f.at(tick); advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true); }
  const queue = createSpawnQueue(f.state,f.home);
  queue.submit({ id: 'new-home-work',name: 'new-home-work',owner: 'household',room: f.home,body: ['move'],priority: 0,readyAt: 10,expiresAt: 100 });
  f.at(6);
  const result = createStartupCohortMaintenance(f.state,f.home,f.approvals.result)(f.context,new Set([queue.list()[0]!.name]));
  expect(result).toMatchObject({ status: 'invalid',reason: 'queue-context',cancelled: ['ed-'+f.home+'-2'],occupied: ['ed-'+f.home+'-1'] });
  expect(queue.list().map(request => request.id)).toEqual(['ed-'+f.home+'-1','new-home-work']);
});
test('queue comparison normalizes observation clocks, ignores expired and beyond-horizon requests, and fences changed terms read-only',() => {
  const f = economicCohortFixture(), queue = createSpawnQueue(f.state,f.home);
  const proposed = { id: 'priced',name: 'priced',owner: 'household',room: f.home,body: ['move' as const],priority: 0,readyAt: 0,expiresAt: 100 };
  f.query.input.project.spawning.requests = [...f.query.input.project.spawning.requests,proposed];
  const current = { ...proposed,readyAt: 0,expiresAt: 101 }; queue.submit(current);
  queue.submit({ ...current,id: 'expired',name: 'expired',readyAt: 0,expiresAt: 1 });
  queue.submit({ ...current,id: 'later',name: 'later',readyAt: 1002,expiresAt: 1100 });
  const before = f.root(); expect(startupQueueMatches(f.state,f.home,f.query)).toBe(true); expect(f.root()).toBe(before);
  queue.defer(new Set([current.id]),1); expect(startupQueueMatches(f.state,f.home,f.query,{ attempt: current })).toBe(true);
  expect(startupQueueMatches(f.state,f.home,f.query,{ attempt: { ...current,body: ['carry'] } })).toBe(false);
  for (const changed of [{ priority: 2 },{ readyAt: 3 },{ expiresAt: 102 },{ body: ['carry' as const] }]) {
    queue.cancel(current.id,current.owner); queue.submit({ ...current,...changed });
    const snapshot = f.root(); expect(startupQueueMatches(f.state,f.home,f.query)).toBe(false); expect(f.root()).toBe(snapshot);
  }
});

test('an observed paid attempt can remain queued until reconciliation without revoking unpaid companions',() => {
  const f = economicCohortFixture();
  for (const tick of [2,3,4,5]) { f.at(tick); advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true); }
  const queue = createSpawnQueue(f.state,f.home), request = queue.list()[0]!, result = f.approvals.result(f.query)!;
  const birth = result.spawning.births.find(birth => birth.request === request.id)!;
  const startAt = birth.startAt+f.query.observedAt, activeAt = birth.activeAt+f.query.observedAt;
  queue.defer(new Set([request.id]),startAt); f.at(startAt+1);
  const current = { ...f.context,births: [{ request: request.id,owner: request.owner,home: f.home,body: request.body,startAt,activeAt }] };
  const before = f.root();
  expect(createStartupCohortMaintenance(f.state,f.home,f.approvals.result)(current,new Set([request.name]))).toEqual({ status: 'current' });
  expect(f.root()).toBe(before);
  const changed = { ...current,births: [{ ...current.births[0]!,body: ['move' as const] }] };
  expect(startupQueueMatches(f.state,f.home,f.query,{ births: changed.births })).toBe(false);
});

test('a second source waits for the current home cohort payments instead of invalidating their priced queue',() => {
  const f = economicCohortFixture();
  for (const tick of [2,3,4,5]) { f.at(tick); advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true); }
  f.at(6); const second = { home: f.home,room: f.query.room,source: 'second-source',generation: 1 } as RemoteFleetProfile;
  const before = f.root(); expect(canStartHomeJob(f.state,second)).toBe(false); expect(f.root()).toBe(before);
});

test('home cohort coordination resumes after observed payment and isolates other homes, ordinary requests and expired records',() => {
  const f = economicCohortFixture();
  for (const tick of [2,3,4,5]) { f.at(tick); advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true); }
  const queue = createSpawnQueue(f.state,f.home), pending = queue.list(), observe = vi.fn(() => [] as { request: string; owner: string; home: string; body: typeof pending[number]['body']; startAt: number; activeAt: number }[]);
  f.at(6); const before = f.root();
  expect(startupQueueHasUnpaidCohort(f.state,f.home,6,observe)).toBe(true);
  const births = pending.map(request => ({ request: request.id,owner: request.owner,home: f.home,body: request.body,startAt: 5,activeAt: 5+request.body.length*3 }));
  observe.mockReturnValue(births.slice(0,1)); expect(startupQueueHasUnpaidCohort(f.state,f.home,6,observe)).toBe(true);
  observe.mockReturnValue(births); expect(startupQueueHasUnpaidCohort(f.state,f.home,6,observe)).toBe(false);
  observe.mockReturnValue(births.map(birth => ({ ...birth,owner: 'changed' }))); expect(startupQueueHasUnpaidCohort(f.state,f.home,6,observe)).toBe(true);
  expect(startupQueueHasUnpaidCohort(f.state,'W1N1',6,observe)).toBe(false); expect(f.root()).toBe(before);
  for (const request of pending) queue.cancel(request.id,request.owner);
  queue.submit({ id: 'ordinary',name: 'ordinary',owner: 'household',room: f.home,body: ['move'],priority: 0,readyAt: 1,expiresAt: 100 });
  queue.submit({ ...pending[0]!,expiresAt: 6,readyAt: 1 });
  expect(startupQueueHasUnpaidCohort(f.state,f.home,6,() => [])).toBe(false);
});
