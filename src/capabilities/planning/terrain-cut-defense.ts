import { tileAt, tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import { createTerrainCutNetwork } from './terrain-cut-network';
import { defenseEntryTiles } from './defense-separation';
import { barrierCost } from './barrier-cost';
import type { BarrierCostInput } from './barrier-cost';
import { placementFailures } from './placement-validation';
import type { StagedTile } from './template';
export interface TerrainCutDefenseInput extends Omit<BarrierCostInput, 'barriers'> {
  protectedTiles: readonly Tile[]; rcl: number;
}
/** Legal-grid adapter. Protected tiles define the desired interior, independently of protected assets. */
export function createTerrainCutDefense(source: TerrainCutDefenseInput) {
  const input: TerrainCutDefenseInput = JSON.parse(JSON.stringify(source));
  if (!Number.isSafeInteger(input.rcl) || input.rcl < 2 || input.rcl > 8) throw new Error('Invalid defense RCL');
  const entries = input.attackerEntries ?? defenseEntryTiles(input.observation.terrain);
  const prepare = createLegalCosts(input);
  let network: ReturnType<typeof createTerrainCutNetwork> | undefined;
  return { advance(augmentations: number, guard: () => boolean = () => true, maximumScans = Number.MAX_SAFE_INTEGER) {
    const prepared = prepare(maximumScans, guard);
    if (!prepared.done) return { status: 'pending' as const };
    network ??= createTerrainCutNetwork({
      walkable: input.observation.terrain.map(cell => cell !== 'wall'),
      barrierCosts: prepared.costs, entries, protectedTiles: input.protectedTiles,
    });
    const result = network.advance(augmentations, guard, maximumScans - prepared.scans);
    if (result.status !== 'complete') return result;
    const barriers: StagedTile[] = result.barriers.map(position =>
      ({ type: 'rampart', position, rcl: input.rcl, priority: 50, tag: 'terrain-cut' }));
    const validation = barrierCost({ ...input, barriers });
    if (!validation.ok) return { status: 'rejected' as const, reason: 'validation' as const, validation };
    return { status: 'complete' as const, strategy: 'terrain-cut-v1', barriers, validation };
  } };
}
function createLegalCosts(input: TerrainCutDefenseInput) {
  const forbidden = new Set(input.observation.constraints.filter(item => item.kind !== 'locked')
    .map(item => tileIndex(item.position)));
  const costs: (number | null)[] = [];
  return (maximum: number, guard: () => boolean) => {
    if (!Number.isSafeInteger(maximum) || maximum < 0) throw new Error('Invalid flow scan budget');
    let scans = 0;
    while (costs.length < 2500 && scans < maximum && guard()) {
      const index = costs.length, barrier = { type: 'rampart', position: tileAt(index) };
      costs.push(forbidden.has(index) || placementFailures([barrier], input.observation).length ? null : 1);
      scans++;
    }
    return { done: costs.length === 2500, costs, scans };
  };
}
