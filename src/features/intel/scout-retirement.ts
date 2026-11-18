import type { StatePort } from '../../persistence/versioned-state';
import { createScoutHistoryStore } from './scout-store';
import { createIntelStore } from './store';
/** Replay-safe callback for the complete owned-creep lifecycle, never room visibility. */
export function createScoutRetirement(state: StatePort, clock: () => number) {
  const history = createScoutHistoryStore(state), intel = createIntelStore(state);
  return (id: string): void => {
    const loss = history.retire(id, clock());
    if (!loss?.failurePending) return;
    intel.recordFailure(loss.position.room, { id: `scout-loss:${loss.id}`, tick: loss.detectedAt, reason: loss.kind });
    history.acknowledge(loss.id);
  };
}
