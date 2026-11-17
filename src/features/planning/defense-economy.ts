import type { StagedTile } from '../../capabilities/planning/template';
import { copyPlain } from '../../persistence/plain-data';
/** Reserve requirements are declarative plan policy, not a snapshot of fluctuating room energy. */
export function stageDefenseEconomy(original: readonly StagedTile[], defended: readonly StagedTile[], minimumStoredEnergy: number): StagedTile[] {
  if (!Number.isSafeInteger(minimumStoredEnergy) || minimumStoredEnergy < 0) throw new Error('Invalid defense energy reserve');
  const key = (entry: StagedTile) => JSON.stringify([entry.type, entry.position.x, entry.position.y]);
  const existing = new Set(original.map(key));
  return copyPlain(defended.map(entry => ['rampart', 'constructedWall'].includes(entry.type) && !existing.has(key(entry))
    ? { ...entry, minimumStoredEnergy } : entry));
}
/** Construction consumers must apply both requirements before issuing a site. */
export function defenseEconomyEligible(entry: Pick<StagedTile, 'rcl' | 'minimumStoredEnergy'>, rcl: number, storedEnergy: number): boolean {
  if (!Number.isSafeInteger(rcl) || rcl < 0 || rcl > 8 || !Number.isFinite(storedEnergy) || storedEnergy < 0) {
    throw new Error('Invalid defense economy observation');
  }
  return rcl >= entry.rcl && storedEnergy >= (entry.minimumStoredEnergy ?? 0);
}
