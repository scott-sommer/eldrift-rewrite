import { createAssessmentCache } from '../../src/capabilities/planning/assessment-cache';
import { assessRoom } from '../../src/capabilities/planning/assessment';
import { loop as botLoop } from '../../src/main';
import { standardDraft } from '../../src/capabilities/planning/standard-draft';
import { standardDraftBatch } from '../../src/capabilities/planning/standard-draft-batch';
import type { RoadCheckpoint } from '../../src/capabilities/planning/road-checkpoint';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
import { planningLimits } from '../fixtures/planning-limits';
import { planningObservation } from '../fixtures/planning-observation';
let calls = 0;
let assessmentBuilds = 0;
const assess = createAssessmentCache(input => { assessmentBuilds++; return assessRoom(input); });
export function loop() {
  botLoop();
  const memory = Memory as Memory & { draftCheckpoint?: RoadCheckpoint; expectedDraft?: string; draftResumeRows?: unknown[] };
  const input = { candidate: { anchor: { x: 25, y: 25 }, transform: 0 as const },
    assess, observation: planningObservation(), limits: planningLimits,
    blocksMovement: (type: string) => OBSTACLE_OBJECT_TYPES.some(obstacle => obstacle === type),
    search: (costs: readonly number[]) => planningRoadSearch('W0N1', costs, 10000) };
  if (Game.time === 1) {
    const full = standardDraft(input);
    if (!full.ok) throw new Error('Uninterrupted fixture failed');
    memory.expectedDraft = JSON.stringify({ entries: full.entries, connections: full.connections });
  }
  const result = standardDraftBatch(input, 'native-v1:maxOps=10000', memory.draftCheckpoint, 1);
  if (!result.ok) throw new Error('Resumed standard draft failed: ' + JSON.stringify(result));
  if (assessmentBuilds !== 1) throw new Error('Repeated room assessment in unchanged planning runtime');
  memory.draftCheckpoint = result.checkpoint;
  const identical = result.done
    ? JSON.stringify({ entries: result.entries, connections: result.connections }) === memory.expectedDraft : null;
  (memory.draftResumeRows ??= []).push({ tick: Game.time, calls: ++calls, done: result.done,
    searches: result.searches, completed: result.checkpoint.connections.length, identical,
    exposedEntries: 'entries' in result });
}
