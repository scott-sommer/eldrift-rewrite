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
