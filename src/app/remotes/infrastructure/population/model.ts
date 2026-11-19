import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { PopulationUnit } from '../../../../capabilities/spawning/demand';
import type { RemoteOutpostDemand } from '../../../../features/remotes/infrastructure/model';
import type { BodyPlan } from '../../../../capabilities/spawning/body';
import type { RemoteServiceTiming } from '../../../../capabilities/economy/remote-model';
import type { RemoteConstructionCandidate } from '../../../../features/remotes/infrastructure/worker-budget';
import type { DemandPlan } from '../../../../features/population/apply-demand';
export interface NativeConstructionPlan extends RemoteConstructionCandidate {
  demand: RemoteOutpostDemand; body: BodyPlan; timing: RemoteServiceTiming;
}
export function constructionPopulation(plan: NativeConstructionPlan, desired: number, requestLifetime: number): DemandPlan {
  return { owner: plan.owner,room: plan.demand.home,desired,body: plan.body.parts,replacementParts: plan.body.parts.length,
    travelTicks: plan.timing.travelTicks+plan.timing.retireTicks,marginTicks: plan.timing.marginTicks,priority: 40,requestLifetime };
}
export function healthyConstructionWorker(creep: Creep, body: readonly string[]): boolean {
  return JSON.stringify(creep.body.map(part => part.type)) === JSON.stringify(body)
    && (creep.spawning || creep.body.every(part => part.hits > 0) && creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0 && creep.getActiveBodyparts(MOVE) > 0);
}

export interface ConstructionHomeSnapshot { home: Room; body: BodyPlan; roster: PopulationUnit[]; pending: SpawnRequest[] }

export function constructionServiceDemand(creep: Creep, plan: NativeConstructionPlan | undefined, selected: ReadonlySet<string>) {
  return plan && selected.has(plan.owner) && healthyConstructionWorker(creep,plan.body.parts) && (creep.ticksToLive ?? 0) > plan.timing.retireTicks ? plan.demand : undefined;
}
