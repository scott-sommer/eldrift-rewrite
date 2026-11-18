/** Full-store handoff consumes a separate body action; zero-CARRY miners harvest directly below them. */
export function harvestCycleRate(power: number, capacity: number): number {
  if (!Number.isFinite(power) || power <= 0 || !Number.isFinite(capacity) || capacity < 0) throw new Error('Invalid harvest cycle');
  if (capacity === 0) return power;
  return capacity / (Math.ceil(capacity / power) + 1);
}
