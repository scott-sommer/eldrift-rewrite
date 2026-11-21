import { copyPlain } from '../../../../core/plain-data';
import { spawnedActiveTicks } from '../../../../capabilities/spawning/lifetime';
import { remoteFleetOwner } from '../../../../features/remotes/fleet/identity';
import { validCompleteStartupTravel, selectionBinding } from '../../../../features/remotes/startup/selection-validation';
import { startupTravelLegs } from '../../../../features/remotes/startup/travel-plan';
import type { MiningRepairPolicy } from '../../../../capabilities/mining/repair-policy';
import type { StatePort } from '../../../../persistence/versioned-state';
import { natural } from '../../../../features/remotes/assignment-validation';
import { createNativeStartupProjection } from '../projection/native';
import type { NativeStartupQuote, NativeStartupProjectionOptions, StartupBirthProposal } from '../projection/model';
export interface StartupCohortPolicy {
  horizon: number; validityTicks: number; protectedEnergy: number; retirementMargin: number;
  minimumBatch: number; minerPriority: number; courierPriority: number; courierReadyAt: number;
  assumeAssignmentRenewal: boolean; repairPolicy: Readonly<MiningRepairPolicy> | null;
}
/** Finite initial cohort proposal, never a native enqueue or a source of synthetic future replacements. */
export function createNativeStartupCohort(state: StatePort) {
  const project = createNativeStartupProjection(state);
  return (id: string, input: NativeStartupQuote, inputPolicy: StartupCohortPolicy, guard: () => boolean = () => true) => {
    validatePolicy(id,inputPolicy);
    const quote = copyPlain(input), policy = copyPlain(inputPolicy);
    if (!guard()) return refused('budget');
    if (!validCompleteStartupTravel(quote,quote.plan.home)) return refused('quote-facts');
    const authorityReason = cohortAuthorityRefusal(quote,policy);
    if (authorityReason) return refused(authorityReason);
    const authority = quote.facts.authority!;
    if (quote.facts.workers.length) return refused('incumbent-cohort');
    const births = cohortBirths(id,quote,policy);
    if (!births) return refused('cohort-service');
    const options: NativeStartupProjectionOptions = { horizon: policy.horizon,protectedEnergy: policy.protectedEnergy,unaffordable: 'skip',
      repairPolicy: policy.repairPolicy,refills: [],householdFlows: [],sinkChanges: [],births };
    const projection = project(quote,options,guard);
    if (projection.status === 'deferred') return projection;
    const binding = JSON.stringify(['initial-cohort-v1',id,quote.identity,policy]);
    if (!selectionBinding(binding)) return refused('binding-capacity');
    return { status: 'ready' as const,candidate: { id,query: { room: quote.plan.room,source: quote.plan.source,generation: authority.generation,binding,
      observedAt: quote.observedAt,expiresAt: Math.min(authority.expiresAt,quote.observedAt+policy.validityTicks),tick: quote.observedAt,input: projection.input } } };
  };
}
function cohortBirths(id: string, quote: NativeStartupQuote, policy: StartupCohortPolicy): StartupBirthProposal[] | undefined {
  const capacity = startupTravelLegs(quote.plan).find(leg => leg.kind === 'courier-loaded')!.load;
  if (policy.minimumBatch > capacity) return undefined;
  const births: StartupBirthProposal[] = [];
  for (const kind of ['miner','courier'] as const) {
    const returnKind = kind === 'miner' ? 'miner-return' : 'courier-loaded';
    const retireTicks = quote.legs.find(leg => leg.kind === returnKind)!.ticks+policy.retirementMargin+1;
    const approach = quote.legs.find(leg => leg.kind === kind+'-approach')!.ticks;
    if (approach+retireTicks >= spawnedActiveTicks(quote.plan[kind])) return undefined;
    const key = 'startup-proposal:'+JSON.stringify([id,quote.plan.home,quote.plan.room,quote.plan.source,quote.facts.authority!.generation,kind]);
    const request = { id: key,name: key,owner: remoteFleetOwner({ ...quote.plan,kind }),room: quote.plan.home,body: [...quote.plan[kind]],
      priority: kind === 'miner' ? policy.minerPriority : policy.courierPriority,readyAt: kind === 'miner' ? 0 : policy.courierReadyAt,expiresAt: policy.horizon+1 };
    births.push(kind === 'miner' ? { kind,request,retireTicks } : { kind,request,retireTicks,minimumBatch: policy.minimumBatch });
  }
  return births;
}
function cohortAuthorityRefusal(quote: NativeStartupQuote, policy: StartupCohortPolicy): string | undefined {
  const authority = quote.facts.authority;
  if (!authority || authority.expiresAt <= quote.observedAt) return 'authority';
  if (!policy.assumeAssignmentRenewal && quote.observedAt+policy.horizon >= authority.expiresAt) return 'authority-horizon';
  return undefined;
}
function validatePolicy(id: string, policy: StartupCohortPolicy): void {
  if (typeof id !== 'string' || !id.length || id.length > 64) throw new Error('Invalid startup cohort identity');
  if (![policy.horizon,policy.validityTicks,policy.protectedEnergy,policy.retirementMargin,policy.minimumBatch,policy.courierReadyAt].every(natural)) throw new Error('Invalid startup cohort policy');
  if (typeof policy.assumeAssignmentRenewal !== 'boolean') throw new Error('Invalid startup cohort authority policy');
  validateLimits(policy);
}
function validateLimits(policy: StartupCohortPolicy): void {
  if (policy.horizon > 10000 || policy.validityTicks < 1 || policy.validityTicks > 10000 || policy.protectedEnergy > 1000000000) throw new Error('Invalid startup cohort limits');
  if (policy.retirementMargin > 1499 || policy.minimumBatch < 1 || policy.minimumBatch > 2500 || policy.courierReadyAt > policy.horizon) throw new Error('Invalid startup cohort service policy');
  if (![policy.minerPriority,policy.courierPriority].every(Number.isFinite)) throw new Error('Invalid startup cohort priority');
}
function refused(reason: string) { return { status: 'deferred' as const,reason }; }
