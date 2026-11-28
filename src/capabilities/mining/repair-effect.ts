import { boostedWorkEffect,validateWorkProfile } from '../actions/work-profile';
import type { WorkProfile } from '../actions/work-profile';
/** Unboosted native WORK repair: 100 hits per part, one energy per 100 hits rounded up. */
export function energyRepairEffect(workParts: number, hits: number, hitsMax: number, energy: number) {
  if (![workParts,hits,hitsMax,energy].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000) || workParts > 50 || hits > hitsMax) throw new Error('Invalid repair quantities');
  const repairedHits = Math.min(workParts*100,energy*100,hitsMax-hits);
  return { repairedHits,energySpent: Math.ceil(repairedHits/100) };
}

export type RepairProfile = WorkProfile;
export const validateRepairProfile = validateWorkProfile;
/** Preserve the pinned processor's base-energy charge and bonus ordering, including inactive boosted parts. */
export function boostedEnergyRepairEffect(profile: RepairProfile,hits: number,hitsMax: number,energy: number) {
  validateRepairProfile(profile);
  const base = energyRepairEffect(profile.workParts,hits,hitsMax,energy);
  const repairedHits = boostedWorkEffect(profile,base.repairedHits,hitsMax-hits);
  return { repairedHits,energySpent: base.energySpent };
}
