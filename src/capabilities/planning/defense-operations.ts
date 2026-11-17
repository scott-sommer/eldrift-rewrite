import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { PlacedTile } from './template';
export interface TowerCoveragePolicy {
  power: number; optimalRange: number; falloffRange: number; falloff: number;
}
export interface DefenseOperationsInput {
  barriers: readonly PlacedTile[]; towers: readonly Tile[]; gates: readonly Tile[];
  repairReachable: readonly boolean[]; friendlyReachable: readonly boolean[];
  rampartDecayHits: number; rampartDecayTicks: number; repairEnergyPerHit: number;
  tower: TowerCoveragePolicy; minimumTowerPower: number;
}
/** Nominal intact-plan costs. Caller supplies reachability masks from its movement/access policy. */
export function defenseOperations(input: DefenseOperationsInput) {
  validateInput(input);
  const coverage = input.barriers.map(barrier => {
    tileIndex(barrier.position);
    if (!['rampart', 'constructedWall'].includes(barrier.type)) throw new Error('Invalid defensive barrier');
    return { position: { ...barrier.position },
      power: input.towers.reduce((sum, tower) => sum + towerPower(tower, barrier.position, input.tower), 0) };
  });
  const unreachableRepair = input.barriers.filter(barrier => !input.repairReachable[tileIndex(barrier.position)])
    .map(barrier => ({ ...barrier.position }));
  const blockedGates = input.gates.filter(gate => !input.friendlyReachable[tileIndex(gate)])
    .map(gate => ({ ...gate }));
  const ramparts = input.barriers.filter(barrier => barrier.type === 'rampart').length;
  const upkeepEnergyPerTick = ramparts * input.rampartDecayHits / input.rampartDecayTicks * input.repairEnergyPerHit;
  return { upkeepEnergyPerTick, unreachableRepair, blockedGates, coverage,
    undercovered: coverage.filter(item => item.power < input.minimumTowerPower).map(item => item.position) };
}
/** Unpowered/operated/disrupted towers require a caller-specific policy; this is nominal falloff. */
export function towerPower(tower: Tile, target: Tile, policy: TowerCoveragePolicy): number {
  tileIndex(tower); tileIndex(target);
  const range = Math.max(Math.abs(tower.x - target.x), Math.abs(tower.y - target.y));
  const distance = Math.max(0, Math.min(range, policy.falloffRange) - policy.optimalRange);
  return Math.floor(policy.power * (1 - policy.falloff * distance / (policy.falloffRange - policy.optimalRange)));
}
function validateInput(input: DefenseOperationsInput): void {
  for (const mask of [input.repairReachable, input.friendlyReachable]) {
    if (mask.length !== 2500 || !Array.from(mask).every(value => typeof value === 'boolean')) throw new Error('Invalid access mask');
  }
  const values = [input.rampartDecayHits, input.rampartDecayTicks, input.repairEnergyPerHit,
    input.minimumTowerPower, ...Object.values(input.tower)];
  if (!values.every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid defense costs');
  if (input.rampartDecayTicks === 0 || input.tower.falloffRange <= input.tower.optimalRange
    || input.tower.falloff > 1) throw new Error('Invalid defense intervals');
}
