import type { SelfBuildInput } from './build-model';
/** Advance action frames without harvesting; partial stock starts a regeneration clock. */
export function advanceStartupSource(source: SelfBuildInput['source'], ticks: number): number {
  if (ticks === 0 || source.energy === source.capacity) return 0;
  const remaining = Math.max(1,source.regenerationIn ?? source.regenerationTicks);
  if (ticks < remaining) { source.regenerationIn = remaining-ticks; return 0; }
  const regenerated = source.capacity-source.energy;
  source.energy = source.capacity; source.regenerationIn = null;
  return regenerated;
}
