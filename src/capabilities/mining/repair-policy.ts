export interface MiningRepairPolicy { criticalFraction: number; energyReserve: number }
export const defaultMiningRepairPolicy: Readonly<MiningRepairPolicy> = { criticalFraction: 0.2, energyReserve: 20 };
/** Preserve production until damage is critical; use energy-source downtime for routine repairs. */
export function shouldRepairMining(hits: number, hitsMax: number, energy: number, sourceDepleted: boolean,
  policy: Readonly<MiningRepairPolicy> = defaultMiningRepairPolicy): boolean {
  if (!Number.isFinite(policy.criticalFraction) || policy.criticalFraction < 0 || policy.criticalFraction > 1
    || !Number.isFinite(policy.energyReserve) || policy.energyReserve < 0) throw new Error('Invalid mining repair policy');
  if (hits >= hitsMax || energy <= 0) return false;
  return sourceDepleted || (hits < hitsMax * policy.criticalFraction && energy > policy.energyReserve);
}
