/** A processor-time WORK profile; bonuses retain inactive boosted parts. */
export interface WorkProfile { workParts: number; boostBonuses: readonly number[] }
export function validateWorkProfile(profile: WorkProfile): void {
  if (!Number.isSafeInteger(profile.workParts) || profile.workParts < 0 || profile.workParts > 50 || profile.boostBonuses.length > 50) throw new Error('Invalid WORK body profile');
  if (profile.boostBonuses.some(bonus => !Number.isFinite(bonus) || bonus < 0 || bonus > 1000000)) throw new Error('Invalid WORK boost bonus');
}
export function boostedWorkEffect(profile: WorkProfile,base: number,remaining: number): number {
  const bonuses = [...profile.boostBonuses].sort((a,b) => b-a).slice(0,base);
  return Math.min(Math.floor(base+bonuses.reduce((sum,bonus) => sum+bonus,0)),remaining);
}
