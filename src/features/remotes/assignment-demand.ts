import { framedIdentity } from '../../core/framed-identity';
import { copyPlain } from '../../persistence/plain-data';
import { natural, validRemoteAssignment } from './assignment-validation';
import type { RemoteAssignment, RemoteAssignmentDemand } from './assignment-model';
/** Demand describes desired work; movement, population, construction and controller actions keep their existing owners. */
export function remoteAssignmentDemands(input: RemoteAssignment, tick: number): RemoteAssignmentDemand[] {
  if (!validRemoteAssignment(input) || !natural(tick)) throw new Error('Invalid remote demand assignment');
  if (tick < input.renewedAt || tick >= input.expiresAt) return [];
  const assignment = copyPlain(input), plan = assignment.plan;
  const common = { assignment: assignment.id,generation: assignment.generation,expiresAt: assignment.expiresAt,
    home: assignment.home,room: plan.room };
  const identity = (kind: string, target: string) => 'remote-demand:' + framedIdentity([assignment.home,plan.room,kind,target]);
  const demands: RemoteAssignmentDemand[] = plan.sources.map(source => ({ ...common,kind: 'mine',source,id: identity('mine',source) }));
  if (plan.reserve) demands.push({ ...common,kind: 'reserve',controller: plan.reserve,id: identity('reserve',plan.reserve.id) });
  if (plan.infrastructure) demands.push({ ...common,kind: 'outpost',infrastructure: plan.infrastructure,id: identity('outpost',plan.room) });
  return demands;
}
