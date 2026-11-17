import type { Position } from '../../capabilities/movement/step';
import { withinRange } from '../../capabilities/movement/path-model';
import { upgradeSupplyTarget } from './upgrade-supply-identity';
export interface MasterHandoffView { level: number; cargo: number; position: Position }
export interface MasterHandoffSupplier {
  owned: boolean; spawning: boolean; recovering: boolean; energy: number; position: Position;
  population: { home: string; owner: string } | undefined;
}
/** Yield empty low-RCL collection to actual inbound supply, not indefinitely idle adjacent units. */
export function awaitsUpgradeMasterHandoff(view: MasterHandoffView, observe: () => readonly MasterHandoffSupplier[]): boolean {
  if (view.level >= 6 || view.cargo !== 0) return false;
  return observe().some(unit => eligibleSupplier(unit, view.position));
}
function eligibleSupplier(unit: MasterHandoffSupplier, position: Position): boolean {
  return unit.owned && !unit.spawning && !unit.recovering && unit.energy > 0
    && supplyTarget(unit.population) === position.room && withinRange(unit.position, position, 1);
}
function supplyTarget(population: MasterHandoffSupplier['population']): string | undefined {
  return population ? upgradeSupplyTarget(population.owner, population.home) : undefined;
}
