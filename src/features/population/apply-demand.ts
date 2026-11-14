import type { StatePort } from '../../persistence/versioned-state';
import type { PopulationDemand, PopulationUnit } from '../../capabilities/spawning/demand';
import { reconcileDemand } from '../../capabilities/spawning/demand';
import type { BodyPart } from '../../capabilities/spawning/body';
import { createSpawnQueue } from './spawn-queue';
import { reserveSpawnIdentity } from './spawn-identity';
export interface DemandPlan extends PopulationDemand {
  body: readonly BodyPart[];
  priority: number;
  requestLifetime: number;
}
export function applyPopulationDemand(port: StatePort, plan: DemandPlan, units: readonly PopulationUnit[], tick: number) {
  if (plan.body.length !== plan.replacementParts) throw new Error('Replacement body differs from demand timing');
  if (!Number.isSafeInteger(plan.requestLifetime) || plan.requestLifetime < 1 || !Number.isSafeInteger(tick + plan.requestLifetime)) throw new Error('Invalid demand lifetime');
  const queue = createSpawnQueue(port, plan.room);
  const decision = reconcileDemand(plan, units, queue.list(), tick);
  for (const id of decision.cancel) queue.cancel(id, plan.owner);
  const created: string[] = [];
  for (let index = 0; index < decision.missing; index++) {
    const id = reserveSpawnIdentity(port, plan.room);
    queue.submit({ id, name: id, owner: plan.owner, room: plan.room, priority: plan.priority,
      readyAt: tick, expiresAt: tick + plan.requestLifetime, body: [...plan.body] });
    created.push(id);
  }
  return { ...decision, created };
}
