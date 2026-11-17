import type { TerrainCutDefenseInput } from '../../capabilities/planning/terrain-cut-defense';
import type { PerimeterDefenseInput } from '../../capabilities/planning/perimeter-defense';
import type { createDefenseSearchStore } from './defense-search-store';
import { createStoredTerrainDefense } from './stored-terrain-defense';
import { createDefenseStrategies } from './defense-strategies';
import type { DefenseStrategy } from './defense-strategies';
/** Composition boundary: only terrain search persists; evaluation and selection remain separate. */
export function createStoredDefenseStrategies(
  store: ReturnType<typeof createDefenseSearchStore>, input: TerrainCutDefenseInput, fallback: PerimeterDefenseInput,
): DefenseStrategy[] {
  const search = createStoredTerrainDefense(store, input);
  const terrain: DefenseStrategy = { id: 'terrain-cut-v1', advance(budget, guard) {
    const step = search.advance(budget, guard);
    if (step.status !== 'advanced') return { status: 'pending' };
    const result = step.result;
    return result.status === 'rejected' ? { status: 'rejected', reason: JSON.stringify(result) } : result;
  } };
  return createDefenseStrategies(input, fallback, terrain);
}
