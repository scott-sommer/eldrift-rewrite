import { loop as botLoop } from '../../src/main';
import { prepareStampComposition } from '../../src/capabilities/planning/stamp-composition-policy';
import { stampDraftBatch } from '../../src/capabilities/planning/stamp-draft-batch';
import type { StampDraftCheckpoint } from '../../src/capabilities/planning/stamp-draft-batch';
import type { StagedTile } from '../../src/capabilities/planning/template';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { planningLimits } from '../fixtures/planning-limits';
import { planningObservation } from '../fixtures/planning-observation';
export function loop() {
  botLoop();
  const memory = Memory as Memory & { stampProgress?: StampDraftCheckpoint; stampEntries?: StagedTile[]; stampRows?: unknown[] };
  if (memory.stampEntries) return;
  const observation = planningObservation(), storage = { x: 25, y: 25 };
  const result = stampDraftBatch({ storage, observation, limits: planningLimits,
    composition: { ...prepareStampComposition(storage, observation, planningLimits, 200), maximumTotalAttempts: 10000 },
    blocksMovement: type => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: costs => planningRoadSearch('W0N1', costs, 10000) },
  'native-stamp-v1', memory.stampProgress, 100, 2);
  if (!result.ok) throw new Error('STAMP_DRAFT_FAILURE ' + JSON.stringify(result));
  memory.stampProgress = result.checkpoint;
  (memory.stampRows ??= []).push({ tick: Game.time, done: result.done,
    depth: result.checkpoint.composition.choices.length,
    attempts: result.checkpoint.composition.totalAttempts,
    connections: result.checkpoint.roads?.connections.length ?? 0 });
  if (result.done) memory.stampEntries = result.entries;
}
