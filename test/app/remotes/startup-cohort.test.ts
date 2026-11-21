import { afterEach, expect, test, vi } from 'vitest';
import { startupProjectionFixture } from '../../fixtures/native-startup-projection';
import { createNativeStartupCohort } from '../../../src/app/remotes/startup/proposals/cohort';
import { createStartupCandidateCycle } from '../../../src/features/remotes/startup/candidates/cycle';
import type { StartupCohortPolicy } from '../../../src/app/remotes/startup/proposals/cohort';
const policy: StartupCohortPolicy = { horizon: 1500,validityTicks: 100,protectedEnergy: 350,retirementMargin: 4,minimumBatch: 25,minerPriority: 20,courierPriority: 30,courierReadyAt: 0,assumeAssignmentRenewal: true,repairPolicy: { criticalFraction: 0.2,energyReserve: 20 } };
afterEach(() => vi.unstubAllGlobals());
test('native quote creates exact finite cohort, return margins and authority-bounded observation without writes',() => {
  const f = startupProjectionFixture(), before = JSON.stringify(f.root), build = createNativeStartupCohort(f.state), proposal = build('initial',f.quote,policy);
  expect(proposal.status).toBe('ready'); if (proposal.status !== 'ready') return;
  const query = proposal.candidate.query, spawning = query.input.project.spawning;
  expect(query).toMatchObject({ generation: f.quote.facts.authority!.generation,observedAt: 1,expiresAt: Math.min(101,f.quote.facts.authority!.expiresAt),tick: 1 });
  expect(spawning.requests).toHaveLength(2); expect(spawning.requests.map(birth => birth.body)).toEqual([f.quote.plan.miner,f.quote.plan.courier]);
  expect(query.input.project.workers[0]?.retireTicks).toBe(25); expect(query.input.couriers[0]?.retireTicks).toBe(21);
  expect(spawning.requests.every(birth => birth.placement?.spawn === f.quote.plan.spawn.id)).toBe(true);
  expect(spawning.requests.map(birth => birth.readyAt)).toEqual([0,0]); expect(spawning.requests.every(birth => birth.expiresAt === 1501)).toBe(true);
  expect(JSON.stringify(f.root)).toBe(before);
});
test('configurable delayed courier binds a distinct proposal and flows directly into the cooperative evaluator',() => {
  const f = startupProjectionFixture(), build = createNativeStartupCohort(f.state), eager = build('eager',f.quote,policy), delayed = build('delayed',f.quote,{ ...policy,courierReadyAt: 1000 });
  if (eager.status !== 'ready' || delayed.status !== 'ready') throw new Error('Expected proposals');
  expect(delayed.candidate.query.input.project.spawning.requests[1]?.readyAt).toBe(1000);
  expect(delayed.candidate.query.binding).not.toBe(eager.candidate.query.binding);
  const result = createStartupCandidateCycle(f.state,f.quote.plan.home).advance([eager.candidate,delayed.candidate],{ minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1500,maximumHouseholdCapital: 10000 },'final-return',{ frames: 3002,candidates: 2 });
  expect(result.status).toBe('complete'); expect(result.frames).toBe(3002);
});
test('initial-cohort strategy explicitly defers current workers and absent authority',() => {
  const f = startupProjectionFixture(), build = createNativeStartupCohort(f.state);
  f.quote.facts.workers.push({ name: 'paid',owner: f.miner.owner,position: f.quote.plan.station,spawning: true,ticksToLive: null,energy: 0,fatigue: 0,usedCapacity: 0,body: [] });
  expect(build('initial',f.quote,policy)).toEqual({ status: 'deferred',reason: 'incumbent-cohort' }); f.quote.facts.workers = []; f.quote.facts.authority = null;
  expect(build('initial',f.quote,policy)).toEqual({ status: 'deferred',reason: 'authority' });
});
test('stale observations, oversized batches and exhausted return margins do not produce candidates',() => {
  const f = startupProjectionFixture(), build = createNativeStartupCohort(f.state);
  expect(build('initial',f.quote,{ ...policy,minimumBatch: 2500 })).toEqual({ status: 'deferred',reason: 'cohort-service' });
  expect(build('initial',f.quote,{ ...policy,retirementMargin: 1499 })).toEqual({ status: 'deferred',reason: 'cohort-service' });
  f.quote.observedAt = 0; expect(build('initial',f.quote,policy)).toEqual({ status: 'deferred',reason: 'stale-observation' });
});
test('projection refuses known reservation transitions and guard admission publishes no state',() => {
  const f = startupProjectionFixture(), before = JSON.stringify(f.root), build = createNativeStartupCohort(f.state);
  expect(build('initial',f.quote,policy,() => false)).toEqual({ status: 'deferred',reason: 'budget' });
  f.quote.facts.reservation = { username: 'me',ticksToEnd: 100 };
  expect(build('initial',f.quote,policy)).toEqual({ status: 'deferred',reason: 'reservation-transition' }); expect(JSON.stringify(f.root)).toBe(before);
});
test('invalid policy clocks and non-finite priority are rejected',() => {
  const f = startupProjectionFixture(), build = createNativeStartupCohort(f.state);
  for (const changed of [{ horizon: -1 },{ validityTicks: 0 },{ minimumBatch: 0 },{ courierReadyAt: 1501 },{ minerPriority: NaN }]) expect(() => build('initial',f.quote,{ ...policy,...changed })).toThrow('cohort');
});

test('longer-than-lease forecasts require an explicit assignment-renewal assumption',() => {
  const f = startupProjectionFixture(), build = createNativeStartupCohort(f.state);
  expect(build('initial',f.quote,{ ...policy,assumeAssignmentRenewal: false })).toEqual({ status: 'deferred',reason: 'authority-horizon' });
  expect(build('short',f.quote,{ ...policy,horizon: 5,assumeAssignmentRenewal: false }).status).toBe('ready');
});
test('admission callbacks cannot alter the detached quoted source or cohort policy',() => {
  const f = startupProjectionFixture(), options = { ...policy }, build = createNativeStartupCohort(f.state); let calls = 0;
  const result = build('initial',f.quote,options,() => { if (++calls === 1) { f.quote.facts.source.energy = 0; options.courierReadyAt = 1000; } return true; });
  if (result.status !== 'ready') throw new Error(result.reason);
  expect(result.candidate.query.input.project.source.energy).toBe(1500); expect(result.candidate.query.input.project.spawning.requests[1]?.readyAt).toBe(0);
});
