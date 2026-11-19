import type { StatePort } from '../../../../persistence/versioned-state';
import type { createNativeDispatch } from '../../../native-dispatch';
import { remoteConstructionIdentity } from '../../../../features/remotes/infrastructure/worker-identity';
import { cancelRemotePopulation } from '../../cancel-population';
export function cancelUnselected(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, selected: ReadonlySet<string>): void {
  cancelRemotePopulation(state,dispatch,home,selected,remoteConstructionIdentity);
}
