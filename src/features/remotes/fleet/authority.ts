import type { createRemoteAssignmentStore } from '../assignment-store';
import type { RemoteFleetProfile } from './model';
export function resolveRemoteFleetAssignment(assignments: ReturnType<typeof createRemoteAssignmentStore>, profile: RemoteFleetProfile, tick: number) {
  const lease = assignments.owner(profile.room,tick);
  return lease?.home === profile.home && lease.generation === profile.generation && lease.plan.sources.includes(profile.source) ? lease : undefined;
}
