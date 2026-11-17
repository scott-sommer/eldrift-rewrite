import { createTerrainCutDefense } from '../../capabilities/planning/terrain-cut-defense';
import type { TerrainCutDefenseInput } from '../../capabilities/planning/terrain-cut-defense';
import { exitPerimeterDefense } from '../../capabilities/planning/exit-perimeter-defense';
import { perimeterDefense } from '../../capabilities/planning/perimeter-defense';
import type { PerimeterDefenseInput } from '../../capabilities/planning/perimeter-defense';
import { barrierCost } from '../../capabilities/planning/barrier-cost';
import type { StagedTile } from '../../capabilities/planning/template';
export type DefenseStep = { status: 'pending' } | { status: 'rejected'; reason: string }
  | { status: 'complete'; barriers: StagedTile[] };
export interface DefenseStrategy {
  id: string;
  advance(budget: { augmentations: number; scans: number }, guard: () => boolean): DefenseStep;
}
/** Lazy strategy adapters. Graph construction and synchronous generators still need CPU qualification. */
export function createDefenseStrategies(
  input: TerrainCutDefenseInput, fallback: PerimeterDefenseInput, terrainStrategy?: DefenseStrategy,
): DefenseStrategy[] {
  const snapshot: TerrainCutDefenseInput = JSON.parse(JSON.stringify(input));
  const legacy: PerimeterDefenseInput = JSON.parse(JSON.stringify(fallback));
  let cut: ReturnType<typeof createTerrainCutDefense> | undefined;
  return [
    terrainStrategy ?? { id: 'terrain-cut-v1', advance(budget, guard) {
      if (!guard()) return { status: 'pending' };
      cut ??= createTerrainCutDefense(snapshot);
      const result = cut.advance(budget.augmentations, guard, budget.scans);
      return result.status === 'rejected' ? { status: 'rejected', reason: JSON.stringify(result) } : result;
    } },
    { id: 'exit-perimeter-v1', advance(_budget, guard) {
      if (!guard()) return { status: 'pending' };
      const result = exitPerimeterDefense(snapshot);
      return result.ok ? { status: 'complete', barriers: result.barriers }
        : { status: 'rejected', reason: JSON.stringify(result.validation) };
    } },
    { id: 'legacy-perimeter-v1', advance(_budget, guard) {
      if (!guard()) return { status: 'pending' };
      const barriers = perimeterDefense(legacy), validation = barrierCost({ ...snapshot, barriers });
      return validation.ok ? { status: 'complete', barriers }
        : { status: 'rejected', reason: JSON.stringify(validation) };
    } },
  ];
}
