import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import { logisticsPool } from '../../capabilities/logistics/request';
import type { LabReaction, ReactionLab } from '../../capabilities/industry/labs/model';
/** Share exact stock and specialized mineral-capacity pools with hauling; intents retain claims through this frame. */
export function reserveLabReaction(state: StatePort,room: string,tick: number,reaction: LabReaction,labs: readonly ReactionLab[]): boolean {
  const capacities: Record<string,number> = {}, allocations = [];
  for (const id of reaction.inputs) {
    const lab = labs.find(lab => lab.id === id);
    if (!lab?.mineral) return false;
    const pool = logisticsPool('stock',id,lab.mineral); capacities[pool] = lab.amount;
    allocations.push({ pool,amount: reaction.amount });
  }
  const output = labs.find(lab => lab.id === reaction.output);
  if (!output) return false;
  const pool = logisticsPool('capacity',output.id,'mineral'); capacities[pool] = output.free;
  allocations.push({ pool,amount: reaction.amount });
  const scope = 'reaction:'+room+':'+tick+':'+output.id;
  return createQuantityReservations(state).reserve({ id: scope,owner: 'industry',holder: output.id,scope,expiresAt: tick+1,allocations },capacities,tick);
}
