import { boostedWorkEffect,validateWorkProfile } from '../actions/work-profile';
import type { WorkProfile } from '../actions/work-profile';
/** Native construction charges base progress energy before applying WORK boost bonuses. */
export type BuildProfile = WorkProfile;
export const validateBuildProfile = validateWorkProfile;

export function energyBuildEffect(profile: BuildProfile,progress: number,total: number,energy: number) {
  validateBuildProfile(profile);
  if (![progress,total,energy].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000) || progress > total) throw new Error('Invalid construction quantities');
  const energySpent = Math.min(profile.workParts*5,total-progress,energy);
  const progressAdded = boostedWorkEffect(profile,energySpent,total-progress);
  return { energySpent,progressAdded };
}
