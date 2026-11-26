import type { SpawnAdmission } from '../../capabilities/spawning/admission';
import { demandScope } from './demand-scope';
import type { BodyPart } from '../../capabilities/spawning/body';
import type { SpawnBoost } from '../../capabilities/spawning/boost';
import type { SpawnPlacement, SpawnRequest } from '../../capabilities/spawning/request';
import { copySpawnRequest } from '../../capabilities/spawning/placement';
import { validateRequest } from '../../capabilities/spawning/allocate';
import type { StatePort } from '../../persistence/versioned-state';
import type { PopulationDemand, PopulationUnit } from '../../capabilities/spawning/demand';
import { reconcileDemand } from '../../capabilities/spawning/demand';
import { createSpawnQueue } from './spawn-queue';
import { reserveSpawnIdentity } from './spawn-identity';
export interface DemandPlan extends PopulationDemand {
  body: readonly BodyPart[];
  priority: number;
  requestLifetime: number;
  placement?: SpawnPlacement;
  admission?: SpawnAdmission;
  boost?: SpawnBoost;
  externallyOwned?: (request: SpawnRequest) => boolean;
  selectBirthBoost?: (body: readonly BodyPart[]) => SpawnBoost | null | 'wait';
}
export function applyPopulationDemand(port: StatePort, plan: DemandPlan, units: readonly PopulationUnit[], tick: number) {
  if (plan.body.length !== plan.replacementParts) throw new Error('Replacement body differs from demand timing');
  if (!Number.isSafeInteger(plan.requestLifetime) || plan.requestLifetime < 1 || !Number.isSafeInteger(tick + plan.requestLifetime)) throw new Error('Invalid demand lifetime');
  validateRequest(demandRequest(plan,'validation',tick));
  const queue = createSpawnQueue(port, plan.room);
  const pending = queue.list();
  const scope = demandScope(units,pending,tick,plan.externallyOwned);
  const decision = reconcileDemand(plan, scope.units, scope.pending, tick);
  if (pending.length - decision.cancel.length + decision.missing > 200) throw new Error('Spawn demand exceeds queue capacity');
  for (const id of decision.cancel) queue.cancel(id, plan.owner);
  const created: string[] = [];
  for (let index = 0; index < decision.missing; index++) {
    const selected = birthBoost(plan);
    if (selected === 'wait') break;
    const id = reserveSpawnIdentity(port, plan.room);
    const request = demandRequest(plan,id,tick);
    if (selected) request.boost = selected; else delete request.boost;
    queue.submit(copySpawnRequest(request));
    created.push(id);
  }
  return { ...decision, created };
}


function demandRequest(plan: DemandPlan, id: string, tick: number) {
  return copySpawnRequest({ id,name: id,owner: plan.owner,room: plan.room,priority: plan.priority,readyAt: tick,expiresAt: tick+plan.requestLifetime,body: plan.body,...(plan.admission ? { admission: plan.admission } : {}),...(plan.boost ? { boost: plan.boost } : {}),...(plan.placement !== undefined ? { placement: plan.placement } : {}) });
}

function birthBoost(plan: DemandPlan): SpawnBoost | null | 'wait' | undefined {
  return plan.selectBirthBoost ? plan.selectBirthBoost(plan.body) : plan.boost;
}
