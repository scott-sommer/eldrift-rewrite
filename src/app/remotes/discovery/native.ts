import type { StatePort } from '../../../persistence/versioned-state';
import type { IntelTraversalPolicy } from '../../../features/intel/traversal-model';
import { createIntelTraversal } from '../../../features/intel/traversal';
import { createRemoteDiscovery } from '../../../features/remotes/discovery/cycle';
import type { RemoteDiscoveryPolicy } from '../../../features/remotes/discovery/model';
import { nativeScoutIntelPorts } from '../../native-scout-policy';
import { createRemoteObservationRefresh } from '../native-observations';
export function advanceNativeRemoteDiscovery(state: StatePort, home: string, policy: IntelTraversalPolicy, bounds: RemoteDiscoveryPolicy,
  reads: number, guard: () => boolean) {
  if (policy.mode !== 'known-safe') throw new Error('Remote discovery requires known-safe traversal');
  const refresh = createRemoteObservationRefresh(state), ports = nativeScoutIntelPorts(state);
  refresh([home]);
  const traversal = createIntelTraversal({ ...ports,intel(room) { refresh([room]); return ports.intel(room); } },policy,Game.time,guard);
  const admitted = () => guard() && !traversal.diagnostics().incomplete;
  return createRemoteDiscovery(state,home).advance(Game.time,JSON.stringify(policy),bounds,reads,{ exits: ports.exits,allows: traversal.allows },admitted);
}
