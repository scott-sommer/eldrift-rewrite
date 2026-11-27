export interface RegeneratingSource { energy: number; capacity: number; regenerationIn: number | null; regenerationTicks: number }
/** Action-frame recurrence; a partial source starts its clock after actions. */
export function advanceEnergySource(source: RegeneratingSource,ticks: number): number {
  if (ticks === 0 || source.energy === source.capacity) return 0;
  const remaining = Math.max(1,source.regenerationIn ?? source.regenerationTicks);
  if (ticks < remaining) { source.regenerationIn = remaining-ticks; return 0; }
  const regenerated = source.capacity-source.energy;
  source.energy = source.capacity; source.regenerationIn = null;
  return regenerated;
}
