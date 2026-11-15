import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { StructureLimits } from './core-model';
import { stagePositions } from './staging';
import { selectServicePositions, serviceCandidateScore, utilityCandidateScore } from './service-candidates';
import type { ServiceCandidate } from './service-candidates';
import { compactServiceRecipes } from './service-recipes';
import type { ServiceRecipe } from './service-recipes';
export interface ServicePlacement {
  type: string; position: Tile; rcl: number; priority: number; tag: 'service' | 'utility';
}
export type PackingResult =
  | { ok: true; entries: ServicePlacement[]; omitted: string[] }
  | { ok: false; type: string; required: number; available: number };
export interface PackingInput {
  storage: Tile; controller: Tile; candidates: readonly ServiceCandidate[];
  reserved: readonly Tile[]; limits: StructureLimits;
  canPlace: (type: string, position: Tile) => boolean;
}
/** Detached draft: failure never publishes partial placements or mutates caller reservations. */
export function packCompactServices(input: PackingInput): PackingResult {
  const reserved = new Set(input.reserved.map(tileIndex));
  const entries: ServicePlacement[] = [];
  const omitted: string[] = [];
  for (const recipe of compactServiceRecipes) {
    const positions = choosePositions(input, recipe, reserved);
    if (positions.length < recipe.count) {
      if (recipe.required) return { ok: false, type: recipe.type, required: recipe.count, available: positions.length };
      omitted.push(recipe.type);
      continue;
    }
    const capacity = input.limits[recipe.type];
    if (!capacity) throw new Error('Missing structure limits: ' + recipe.type);
    for (const staged of stagePositions(positions, input.storage, capacity, recipe.minimum)) {
      reserved.add(tileIndex(staged.position));
      entries.push({ ...staged, type: recipe.type, priority: recipe.priority, tag: recipe.tag });
    }
  }
  return { ok: true, entries, omitted };
}
function choosePositions(input: PackingInput, recipe: ServiceRecipe, reserved: ReadonlySet<number>): Tile[] {
  const candidates = input.candidates.filter(candidate =>
    candidate.range >= recipe.minRange && candidate.range <= recipe.maxRange
    && !reserved.has(tileIndex(candidate.position)) && input.canPlace(recipe.type, candidate.position));
  return selectServicePositions(candidates, recipe.count, candidate => recipe.tag === 'utility'
    ? utilityCandidateScore(candidate, input.controller)
    : serviceCandidateScore(candidate, recipe.type, input.storage, input.controller));
}
