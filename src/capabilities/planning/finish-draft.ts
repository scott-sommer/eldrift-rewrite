import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { AssessmentInput } from './assessment-model';
import type { StagedTile } from './template';
import type { StructureLimits } from './core-model';
import type { RoadConnectionsInput, RoadConnectionsResult } from './road-connections';
import { assessRoom } from './assessment';
import { planningRoadCosts } from './road-costs';
import { connectRoads } from './road-connections';
import { placementFailures } from './placement-validation';
import { validateDraft } from './draft-validation';
export interface FinishDraftInput {
  assess?: typeof assessRoom;
  entries: readonly StagedTile[]; storage: Tile; anchors: readonly Tile[];
  observation: AssessmentInput; limits: StructureLimits;
  blocksMovement: (type: string) => boolean;
  search: (costs: readonly number[]) => RoadConnectionsInput['search'];
}
export function finishDraft(input: FinishDraftInput) {
  const prepared = prepareDraftRoads(input);
  const result = connectRoads(prepared.roads);
  if (!result.ok) return { ok: false as const, phase: 'roads' as const, details: result };
  return completeDraftRoads(input, prepared.assessment, result);
}
export function prepareDraftRoads(input: FinishDraftInput) {
  const assessment = (input.assess ?? assessRoom)(input.observation);
  const existingRoads = input.observation.infrastructure.filter(entry => entry.type === 'road').map(entry => entry.position);
  const costs = planningRoadCosts(assessment, input.entries, existingRoads, input.blocksMovement);
  const roads = input.entries.filter(entry => entry.type === 'road').map(entry => entry.position);
  const connections: RoadConnectionsInput = {
    start: input.storage, targets: input.anchors.map((position, index) => ({ id: String(index), position })),
    roads, search: input.search(costs),
    traversable: position => costs[tileIndex(position)]! < 255,
    buildable: position => placementFailures([{ type: 'road', position }], input.observation).length === 0,
  };
  return { assessment, costs, roads: connections };
}
export function completeDraftRoads(
  input: FinishDraftInput, assessment: ReturnType<typeof assessRoom>, result: Extract<RoadConnectionsResult, { ok: true }>,
) {
  const existing = new Set(input.entries.filter(entry => entry.type === 'road').map(entry => tileIndex(entry.position)));
  const additions = result.roads.filter(position => !existing.has(tileIndex(position)))
    .map(position => ({ type: 'road', position, rcl: 4, priority: -190, tag: 'logistics' }));
  const entries = [...input.entries, ...additions];
  const validation = validateDraft({
    assessment, entries, limits: input.limits, constraints: input.observation.constraints,
    blocksMovement: input.blocksMovement, placementFailures: draft => placementFailures(draft, input.observation),
  });
  if (!validation.ok) return validation;
  return { ok: true as const, entries, connections: result.connections };
}
