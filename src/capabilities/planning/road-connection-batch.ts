import { connectRoads } from './road-connections';
import type { RoadConnectionsInput } from './road-connections';
import { roadCheckpoint } from './road-checkpoint';
import type { RoadCheckpoint } from './road-checkpoint';
/** Pending checkpoints are drafts only; callers must not publish them as complete networks. */
export function connectRoadBatch(
  input: RoadConnectionsInput, networkRevision: string, previous: RoadCheckpoint | undefined,
  maximumSearches: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumSearches) || maximumSearches < 0) throw new Error('Invalid road batch budget');
  const checkpoint = roadCheckpoint(input, networkRevision, previous);
  let searches = 0;
  while (checkpoint.connections.length < input.targets.length && searches < maximumSearches && canContinue()) {
    const target = input.targets[checkpoint.connections.length]!;
    const result = connectRoads({ ...input, roads: checkpoint.roads, targets: [target] });
    searches++;
    if (!result.ok) return { ...result, checkpoint, searches };
    checkpoint.roads = result.roads;
    checkpoint.connections.push(result.connections[0]!);
  }
  return { ok: true as const, checkpoint, searches, done: checkpoint.connections.length === input.targets.length };
}
