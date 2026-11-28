/** Unboosted native WORK repair: 100 hits per part, one energy per 100 hits rounded up. */
export function energyRepairEffect(workParts: number, hits: number, hitsMax: number, energy: number) {
  if (![workParts,hits,hitsMax,energy].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000) || workParts > 50 || hits > hitsMax) throw new Error('Invalid repair quantities');
  const repairedHits = Math.min(workParts*100,energy*100,hitsMax-hits);
  return { repairedHits,energySpent: Math.ceil(repairedHits/100) };
}

export interface RepairProfile { workParts: number; boostBonuses: readonly number[] }
/** Preserve the pinned processor's base-energy charge and bonus ordering, including inactive boosted parts. */
export function boostedEnergyRepairEffect(profile: RepairProfile,hits: number,hitsMax: number,energy: number) {
  validateRepairProfile(profile);
  const base = energyRepairEffect(profile.workParts,hits,hitsMax,energy);
  const bonuses = [...profile.boostBonuses].sort((a,b) => b-a).slice(0,base.repairedHits);
  const repairedHits = Math.min(Math.floor(base.repairedHits+bonuses.reduce((sum,bonus) => sum+bonus,0)),hitsMax-hits);
  return { repairedHits,energySpent: base.energySpent };
}
export function validateRepairProfile(profile: RepairProfile): void {
  if (!Number.isSafeInteger(profile.workParts) || profile.workParts < 0 || profile.workParts > 50 || profile.boostBonuses.length > 50) throw new Error('Invalid repair body profile');
  if (profile.boostBonuses.some(bonus => !Number.isFinite(bonus) || bonus < 0 || bonus > 1000000)) throw new Error('Invalid repair boost bonus');
}
