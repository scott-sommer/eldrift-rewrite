/** Carried-only throughput excludes overflow recovery; full-store handoff consumes a separate action.
 * Zero-CARRY assumes direct collection below the worker. This is not total source extraction. */
export function harvestCycleRate(power: number, capacity: number): number {
  if (!Number.isFinite(power) || power <= 0 || !Number.isFinite(capacity) || capacity < 0) throw new Error('Invalid harvest cycle');
  if (capacity === 0) return power;
  return capacity / (Math.ceil(capacity / power) + 1);
}
