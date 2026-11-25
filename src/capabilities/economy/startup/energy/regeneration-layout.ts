import type { StartupEnergyLayout } from './model';
/** Static forecast assumptions; native admission's current-tick ledger does not enable this mode. */
export function validateRegenerationLayout(input: StartupEnergyLayout): void {
  const policy = input.regeneration; if (!policy) return;
  if (!Number.isSafeInteger(policy.otherRoomEnergy) || policy.otherRoomEnergy < 0 || policy.otherRoomEnergy > 1000000000) throw new Error('Invalid other room energy');
  if (policy.eligibleSpawns.length > 16 || new Set(policy.eligibleSpawns).size !== policy.eligibleSpawns.length) throw new Error('Invalid regeneration eligibility');
  if (input.structures.some(point => point.kind === 'spawn' && point.capacity !== 300)) throw new Error('Regeneration requires native spawn capacities');
  validateEligibleSpawns(input,policy.eligibleSpawns);
}
function validateEligibleSpawns(input: StartupEnergyLayout, ids: readonly string[]): void {
  for (const id of ids) {
    const point = input.structures.find(point => point.id === id);
    if (point?.kind !== 'spawn' || point.capacity !== 300) throw new Error('Regeneration requires eligible native spawn capacity');
  }
}
