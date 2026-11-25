import { copyPlain } from '../../../../../core/plain-data';
import { quoteHouseholdLaborJob } from './quote';
import { laborWorker, natural } from './validation';
import type { LaborProposalInput, LaborProposalPorts, LaborProposalFacts } from './proposal-model';
/** Transient proposal: read-only snapshots and current-fact checks, never a claim or dispatch permit. */
export function createLaborProposal(ports: LaborProposalPorts) {
  return (original: LaborProposalInput, guard: () => boolean = () => true) => {
    const input = copyPlain(original); validateInput(input);
    if (!guard()) return deferred('admission');
    if (input.request.boost !== undefined) return deferred('boost-policy');
    if (input.observedAt !== ports.now()) return deferred('observation');
    const observed = ports.observe(copyPlain(input)); if (observed.status !== 'observed') return observed;
    return prepare(input,copyPlain(observed.facts),ports,guard);
  };
}
function prepare(input: LaborProposalInput, facts: LaborProposalFacts, ports: LaborProposalPorts, guard: () => boolean) {
  const maximumLoad = Math.min(input.policy.maximumLoad,facts.source.availableEnergy-input.policy.reserve);
  if (maximumLoad < 1) return deferred('endpoint-capital');
  const initial = { id: input.request.id+':work',request: input.request.id,kind: input.order.kind,pickupAt: input.birth.activeAt,outboundTicks: 0,returnTicks: 0 };
  const first = quoteHouseholdLaborJob({ job: initial,body: input.request.body,...input.policy,maximumLoad,remainingWork: facts.target.remainingWork });
  if (first.status !== 'ready') return first;
  const worker = laborWorker({ birth: input.birth,body: input.request.body },first.job,input.birth.activeAt);
  if (!worker) return deferred('paid-body');
  const route = ports.travel(copyPlain({ home: input.request.room,body: input.request.body,kind: input.order.kind,load: first.job.energy,remainingLoad: 0,workTicks: first.job.workTicks,
    spawn: { position: facts.spawn.position,exit: input.request.placement!.exit },source: { position: facts.source.position,pickup: input.pickup },target: { position: facts.target.position,service: input.service } }),guard);
  if (route.status !== 'complete') return route;
  const seed = { ...initial,pickupAt: input.birth.activeAt+route.legs[0]!.ticks,outboundTicks: route.legs[1]!.ticks,returnTicks: route.legs[2]!.ticks };
  const final = quoteHouseholdLaborJob({ job: seed,body: input.request.body,...input.policy,maximumLoad,remainingWork: facts.target.remainingWork });
  if (final.status !== 'ready') return final;
  if (final.job.energy !== first.job.energy) return deferred('route-work-window');
  if (final.job.pickupAt+1+final.job.outboundTicks+final.job.workTicks+final.job.returnTicks >= worker.expiresAt) return deferred('lifetime');
  const current = () => currentFacts(input,facts,ports);
  if (!guard()) return deferred('admission');
  if (!current()) return deferred('facts-changed');
  const snapshot = copyPlain({ observedAt: input.observedAt,input,facts,job: final.job,route });
  return { status: 'ready' as const,read: () => copyPlain(snapshot),current };
}
function currentFacts(input: LaborProposalInput, facts: LaborProposalFacts, ports: LaborProposalPorts): boolean {
  if (ports.now() !== input.observedAt) return false;
  const observed = ports.observe(copyPlain(input));
  return observed.status === 'observed' && JSON.stringify(observed.facts) === JSON.stringify(facts);
}
function validateInput(input: LaborProposalInput): void {
  const { policy } = input;
  if (![input.observedAt,policy.horizon,policy.maximumLoad,policy.maximumWorkTicks,policy.reserve].every(natural)) throw new Error('Invalid labor proposal bounds');
  if (policy.horizon > 10000 || policy.maximumLoad < 1 || policy.maximumLoad > 2500 || policy.maximumWorkTicks < 1 || policy.maximumWorkTicks > 1500 || policy.reserve > 1000000000) throw new Error('Invalid labor proposal policy');
  validatePlacement(input);
}
function validatePlacement(input: LaborProposalInput): void {
  const { request,birth } = input;
  if (!request.placement || request.placement.spawn !== birth.spawn || request.id !== birth.request) throw new Error('Invalid labor proposal paid placement');
  if (!natural(request.readyAt) || !natural(request.expiresAt) || birth.startAt < request.readyAt || birth.startAt >= request.expiresAt) throw new Error('Invalid labor proposal birth window');
}
function deferred(reason: string) { return { status: 'deferred' as const,reason }; }

export type ReadyLaborProposal = Extract<ReturnType<ReturnType<typeof createLaborProposal>>,{ status: 'ready' }>;
export type LaborProposalSnapshot = ReturnType<ReadyLaborProposal['read']>;
