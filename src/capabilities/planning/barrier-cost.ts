import { validatePlanningConstraints } from './preservation';
import { defenseEntryTiles, defenseSeparation } from './defense-separation';
import { placementFailures } from './placement-validation';
import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { PlacedTile } from './template';
import type { AssessmentInput } from './assessment-model';
export interface BarrierCostInput {
  observation: AssessmentInput;
  attackerEntries?: readonly Tile[];
  barriers: readonly PlacedTile[];
  protectedAssets: readonly PlacedTile[];
  costs: Readonly<Record<'rampart' | 'constructedWall', number>>;
}
/** Static intact-barrier separation and tile cost, not a combat survival prediction. */
export function barrierCost(input: BarrierCostInput) {
  if (!input.protectedAssets.length) throw new Error('Missing protected assets');
  if (input.observation.terrain.length !== 2500) throw new Error('Invalid defense terrain');
  const keys = input.barriers.map(entry => tileIndex(entry.position));
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate barrier tile');
  const cost = barrierInventoryCost(input);
  const constraints = validatePlanningConstraints(input.barriers,
    input.observation.constraints.filter(constraint => constraint.kind !== 'locked'));
  if (constraints.length) return { ok: false as const, reason: 'constraints' as const, details: constraints };
  const failures = placementFailures([...input.protectedAssets, ...input.barriers], input.observation);
  if (failures.length) return { ok: false as const, reason: 'placement' as const, details: failures };
  const separation = defenseSeparation({
    terrain: input.observation.terrain,
    entries: input.attackerEntries ?? defenseEntryTiles(input.observation.terrain),
    barriers: input.barriers.map(entry => entry.position),
    assets: input.protectedAssets.map(entry => ({
      id: entry.type + ':' + tileIndex(entry.position), position: entry.position,
    })),
  });
  const unprotected = separation.exposed;
  if (unprotected.length) return { ok: false as const, reason: 'exposed' as const, details: unprotected };
  return { ok: true as const, cost, barrierTiles: keys.length, protectedAssets: input.protectedAssets.length };
}
function barrierInventoryCost(input: BarrierCostInput): number {
  let total = 0;
  for (const entry of input.barriers) {
    if (entry.type !== 'rampart' && entry.type !== 'constructedWall') throw new Error('Invalid barrier type');
    const cost = input.costs[entry.type];
    if (!Number.isFinite(cost) || cost < 0) throw new Error('Invalid barrier cost');
    total += cost;
  }
  if (!Number.isFinite(total)) throw new Error('Barrier cost overflow');
  return total;
}
