import { advanceEconomicProposal } from '../../src/app/remotes/startup/economic/advance';
import { economicCohortFixture } from './startup-economic';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { spawnedActiveTicks } from '../../src/capabilities/spawning/lifetime';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
import type { PaidCohortEvidence,PaidCohortScope,PaidWorkerObservation } from '../../src/features/remotes/startup/paid-cohorts';
export function paidCohortFixture() {
  const f = economicCohortFixture();
  for (const tick of [2,3,4,5]) { f.at(tick); advanceEconomicProposal(f.state,f.home,f.context,f.config,() => true); }
  const approval = f.approvals.read().approvals[0]!, result = f.approvals.result(f.query)!;
  f.at(50);
  const births = result.spawning.births.map(birth => {
    const request = f.query.input.project.spawning.requests.find(request => request.id === birth.request)!;
    return { request: birth.request,owner: request.owner,home: f.home,body: request.body,startAt: birth.startAt+1,activeAt: birth.activeAt+1 };
  });
  const workers: PaidWorkerObservation[] = births.map(birth => ({ name: birth.request,owner: birth.owner,spawning: false,ticksToLive: birth.activeAt+spawnedActiveTicks(birth.body)-50,
    body: birth.body.map(type => ({ type,hits: 100,boost: null })) }));
  const profiles: RemoteFleetProfile[] = births.map(birth => ({ ...remoteFleetIdentity(birth.owner)!,generation: 1,owner: birth.owner,body: [...birth.body],desired: 1,travelTicks: 0,marginTicks: 0,retireTicks: 10,priority: 0 }));
  const evidence: PaidCohortEvidence = { approval,profiles,births,current: true };
  const scope: PaidCohortScope = { home: f.home,room: f.query.room,source: 'new-source',endpoint: approval.quote.plan.endpoint.id,observedAt: 50,horizon: 100,freeCapacity: 100000 };
  return { ...f,evidence,workers,scope };
}
