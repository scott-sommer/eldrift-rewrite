export interface HarvestPart { type: string; hits: number; multiplier: number }
export interface HarvestProfile { power: number; interval: number }
/** Potential steady production; excludes travel, maintenance and cargo handoff downtime. */
export function harvestRate(body: readonly HarvestPart[], profile: HarvestProfile): number {
  if (!Number.isFinite(profile.power) || profile.power <= 0 || !Number.isSafeInteger(profile.interval) || profile.interval < 1) {
    throw new Error('Invalid harvest profile');
  }
  let power = 0;
  for (const part of body) {
    validatePart(part);
    if (part.type === 'work' && part.hits > 0) power += profile.power * part.multiplier;
  }
  return power / profile.interval;
}

function validatePart(part: HarvestPart): void {
  if (!Number.isFinite(part.hits) || part.hits < 0 || !Number.isFinite(part.multiplier) || part.multiplier <= 0) throw new Error('Invalid harvest part');
}
