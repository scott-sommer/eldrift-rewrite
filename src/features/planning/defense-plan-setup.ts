import { defenseAssetInventory } from './defense-asset-inventory';
import { defenseFriendlyMask } from '../../capabilities/planning/defense-candidate';
import type { DefenseCandidateInput } from '../../capabilities/planning/defense-candidate';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
import type { StagedTile } from '../../capabilities/planning/template';
import type { PlanningCandidate } from './planning-job-model';
import { adjacentTiles, tileIndex } from '../../core/geometry/local-grid';
import { copyPlain } from '../../persistence/plain-data';
export interface DefensePlanPolicy {
  valuableTypes: readonly string[]; rcl: number; costs: DefenseCandidateInput['costs'];
  repairRange: number; operations: DefenseCandidateInput['operations'];
  blocksMovement: DefenseCandidateInput['blocksMovement'];
}
/** Pure request preparation; constants, economy staging and selection tolerances remain injected policy. */
export function prepareDefensePlan(candidate: PlanningCandidate, entries: readonly StagedTile[], observed: AssessmentInput, policy: DefensePlanPolicy) {
  const observation = copyPlain(observed), placements = copyPlain(entries);
  const inventory = defenseAssetInventory(observation, placements, policy.valuableTypes);
  const input: Omit<DefenseCandidateInput, 'barriers'> = { observation, placements, ...inventory,
    costs: copyPlain(policy.costs), origins: [], gates: [], repairRange: policy.repairRange,
    operations: copyPlain(policy.operations), blocksMovement: policy.blocksMovement };
  const walkable = defenseFriendlyMask({ ...input, barriers: [] });
  input.origins = adjacentTiles(candidate.anchor).filter(tile => walkable[tileIndex(tile)]);
  if (!input.origins.length) throw new Error('Missing defense service origin');
  const footprint = placements.filter(entry => !['road', 'rampart', 'constructedWall'].includes(entry.type)
    && !['source', 'controller', 'mineral'].includes(entry.tag ?? ''));
  if (!footprint.length) throw new Error('Missing defense footprint');
  const bounds = { minX: Math.min(...footprint.map(entry => entry.position.x)), maxX: Math.max(...footprint.map(entry => entry.position.x)),
    minY: Math.min(...footprint.map(entry => entry.position.y)), maxY: Math.max(...footprint.map(entry => entry.position.y)) };
  const controller = observation.objects.find(object => object.kind === 'controller')?.position;
  return { input, generation: { observation, ...inventory, costs: input.costs, rcl: policy.rcl },
    fallback: { terrain: observation.terrain, bounds, rcl: policy.rcl, ...(controller ? { controller } : {}) } };
}
