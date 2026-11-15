import { loop as botLoop } from '../../src/main';
import { constrainedDraft } from '../../src/capabilities/planning/constrained-draft';
import { constrainedDraftBatch } from '../../src/capabilities/planning/constrained-draft-batch';
import type { ConstrainedDraftCheckpoint } from '../../src/capabilities/planning/constrained-draft-batch';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { planningLimits } from '../fixtures/planning-limits';
import { planningObservation } from '../fixtures/planning-observation';
let calls = 0;
export function loop() {
  botLoop();
  const memory = Memory as Memory & { draftCheckpoint?: ConstrainedDraftCheckpoint; expectedDraft?: string; draftResumeRows?: unknown[]; checkpointMetrics?: unknown };
  const input = { candidate: { anchor: { x: 25, y: 25 }, transform: 0 as const },
    observation: planningObservation(), limits: planningLimits,
    blocksMovement: (type: string) => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: (costs: readonly number[]) => planningRoadSearch('W0N1', costs, 10000) };
  if (Game.time === 1) {
    const full = constrainedDraft(input);
    if (!full.ok) throw new Error('Uninterrupted fixture failed');
    memory.expectedDraft = JSON.stringify({ entries: full.entries, connections: full.connections, lanes: full.lanes, omitted: full.omitted });
  }
  const result = constrainedDraftBatch(input, 'native-v1:maxOps=10000', memory.draftCheckpoint, 1);
  if (!result.ok) throw new Error('Resumed constrained draft failed: ' + JSON.stringify(result));
  memory.draftCheckpoint = result.checkpoint;
  memory.checkpointMetrics = {
    serializedCharacters: JSON.stringify(result.checkpoint).length,
    signatureCharacters: result.checkpoint.roads.traffic.network.signature.length
      + (result.checkpoint.roads.stitching?.signature.length ?? 0) + (result.checkpoint.final?.signature.length ?? 0),
  };
  const identical = result.done
    ? JSON.stringify({ entries: result.entries, connections: result.connections, lanes: result.lanes, omitted: result.omitted }) === memory.expectedDraft : null;
  (memory.draftResumeRows ??= []).push({ tick: Game.time, calls: ++calls, done: result.done,
    searches: result.searches, completed: result.checkpoint.roads.traffic.lanes.length, phase: result.checkpoint.final ? 'final' : result.checkpoint.roads.stitching ? 'stitching' : 'traffic', identical,
    exposedEntries: 'entries' in result });
}
