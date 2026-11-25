import type { StartupEnergyRegeneration } from '../../../../capabilities/economy/startup/energy/model';
import { copyPlain } from '../../../../core/plain-data';
import { snapshotStartupProject } from '../../../../capabilities/economy/startup/snapshot';
import { createStartupSpawnTimeline } from '../../../../capabilities/economy/startup/spawn-timeline';
import { createStartupProject } from '../../../../capabilities/economy/startup/project';
import type { StartupDeliveryInput } from '../../../../capabilities/economy/startup/delivery-model';
import type { HouseholdTravelPlan } from '../../../../capabilities/economy/startup/household/travel';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { StatePort } from '../../../../persistence/versioned-state';
import { observeNativeStartupEnergy } from '../energy';
import { createNativeHouseholdTravel } from './travel';
export interface NativeHouseholdProposal {
  regeneration?: StartupEnergyRegeneration;
  request: SpawnRequest; plan: HouseholdTravelPlan; trips: number; energy: number; observedAt: number;
}
/** Finite initial paid-body strategy; queue writes and native admission remain separate owners. */
export function createNativeHouseholdProposal(state: StatePort, maximumOps: number) {
  const travel = createNativeHouseholdTravel(state,maximumOps);
  return (base: StartupDeliveryInput, proposal: NativeHouseholdProposal, guard: () => boolean = () => true) => {
    base = snapshotStartupProject(base); proposal = copyPlain(proposal);
    validateProposal(proposal);
    if (!guard()) return deferred('admission');
    const reason = contextRefusal(base,proposal); if (reason) return deferred(reason);
    const physical = observeNativeStartupEnergy(state,proposal.plan.home,base.project.spawning.spawns.map(spawn => spawn.id));
    if (physical.status !== 'observed') return physical;
    if (physical.layout.structures.reduce((sum,point) => sum+point.energy,0) > base.project.spawning.cash.homeEnergy) return deferred('physical-bank');
    const quoted = travel(proposal.plan,guard); if (quoted.status !== 'complete') return quoted;
    if (!guard()) return deferred('admission');
    const input = base, spawning = input.project.spawning;
    spawning.funding = householdFunding(physical,proposal.regeneration);
    spawning.requests = [{ ...proposal.request,body: [...proposal.request.body] },...spawning.requests];
    const preview = createStartupSpawnTimeline(spawning), birth = preview.begin(0).find(birth => birth.request === proposal.request.id); preview.finish();
    if (!birth) return deferred('initial-household-birth');
    const legs = new Map(quoted.legs.map(leg => [leg.kind,leg.ticks]));
    const first = birth.activeAt+legs.get('approach')!, loadedTicks = legs.get('loaded')!, returnTicks = legs.get('return')!;
    const stock = physical.layout.structures.reduce((sum,point) => sum+point.energy,0);
    const endpointEnergy = Math.max(0,Math.min(quoted.source.availableEnergy,spawning.cash.homeEnergy-stock));
    const trips = Array.from({ length: proposal.trips },(_,index) => ({ id: proposal.request.id+':trip'+index,request: proposal.request.id,destination: quoted.plan.destination.id,
      pickupAt: first+index*(1+loadedTicks+1+returnTicks),loadedTicks,returnTicks,energy: proposal.energy }));
    if (trips.at(-1)!.pickupAt > spawning.cash.horizon) return deferred('trip-horizon');
    input.household = { endpointEnergy,redistribution: { horizon: spawning.cash.horizon,trips } };
    createStartupProject(input);
    return { status: 'ready' as const,input,observedAt: Game.time,energyPolicy: physical.policy,travelIdentity: quoted.identity,previewFrames: 1 };
  };
}
function validateProposal(proposal: NativeHouseholdProposal): void {
  validateLimits(proposal);
  const { request,plan } = proposal;
  if (request.room !== plan.home || JSON.stringify(request.body) !== JSON.stringify(plan.body)) throw new Error('Household request/route mismatch');
  if (request.placement?.spawn !== plan.spawn.id || !sameExit(request.placement.exit,plan.spawn.exit)) throw new Error('Household request/exit mismatch');
}
function validateLimits(proposal: NativeHouseholdProposal): void {
  if (!Number.isSafeInteger(proposal.trips) || proposal.trips < 1 || proposal.trips > 64 || !Number.isSafeInteger(proposal.energy) || proposal.energy < 1 || proposal.energy > 2500) throw new Error('Invalid household proposal limits');
}
function contextRefusal(base: StartupDeliveryInput, proposal: NativeHouseholdProposal): string | undefined {
  if (proposal.observedAt !== Game.time || proposal.plan.home !== base.project.spawning.room) return 'observation';
  if (base.household || base.project.spawning.funding.refills.length) return 'refill-owner';
  return undefined;
}
function sameExit(a: HouseholdTravelPlan['spawn']['exit'], b: typeof a): boolean {
  return a.room === b.room && a.x === b.x && a.y === b.y;
}

function deferred(reason: string) { return { status: 'deferred' as const,reason }; }

function householdFunding(physical: Extract<ReturnType<typeof observeNativeStartupEnergy>,{ status: 'observed' }>, regeneration?: StartupEnergyRegeneration) {
  const layout = { ...physical.layout,...(regeneration ? { regeneration } : {}) };
  const capacity = regeneration ? layout.structures.reduce((sum,point) => sum+point.capacity-(point.reservedEnergy ?? 0),0) : physical.capacity;
  return { capacity,initialEnergy: physical.initialEnergy,energyLayout: layout,refills: [] };
}
