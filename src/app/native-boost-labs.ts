import { boostLabRoles, boostRoleAllows } from '../features/industry/boost-labs/store';
import type { LabBoostRole } from '../config/lab-boost-roles';
import type { StatePort } from '../persistence/versioned-state';
import type { BoostJob, BoostStep } from '../capabilities/industry/boosts/model';
import { boostScope } from '../capabilities/industry/boosts/model';
import { createBoostRequests } from '../features/industry/boosts/store';
import { boostLabBusy } from './native-boost-facts';
import { reconcileServiceRequest } from '../features/logistics/service-request';
import { labServiceOwner } from '../features/industry/lab-services';
import type { createNativeStructureActions } from '../adapters/screeps/structure-actions';
type Actions = Pick<ReturnType<typeof createNativeStructureActions>,'holdLab'>;
export function selectNativeBoostLab(state: StatePort,job: BoostJob,step: BoostStep,actions: Actions,roles: readonly LabBoostRole[] = []): StructureLab | null {
  const room = Game.rooms[job.request.home];
  if (!room) return null;
  const current = boostLabRoles(state,room.name);
  const occupied = new Set(createBoostRequests(state).read().filter(other => other.request.owner !== job.request.owner || other.request.id !== job.request.id).flatMap(other => other.lab ? [other.lab] : []));
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB)
    .filter(lab => boostRoleAllows(current,roles,lab.id,step.resource) && lab.isActive() && !occupied.has(lab.id) && (job.request.preferredLab === undefined || job.request.preferredLab === lab.id));
  labs.sort((a,b) => rank(b,step.resource)-rank(a,step.resource) || a.id.localeCompare(b.id));
  return labs.find(lab => !boostLabBusy(state,job,lab) && actions.holdLab(lab,boostScope(job.request))) ?? null;
}
function rank(lab: StructureLab,resource: string): number {
  if (lab.mineralType === resource) return 10000+lab.mineralAmount;
  return lab.mineralType === null ? 1000 : 0;
}
export function fenceReactionService(state: StatePort,job: BoostJob,lab: StructureLab): void {
  reconcileServiceRequest(state,job.request.home,Game.time,labServiceOwner(job.request.home,lab.id),0,undefined);
}
