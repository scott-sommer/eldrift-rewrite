import { copyPlain } from '../plain-data';
import { validQuantityClaim } from './schema';
import type { QuantityClaim } from './schema';
export interface QuantityParticipant { owner: string; holder: string; scope: string }
export interface QuantityClaimPartition { owned: QuantityClaim[]; external: QuantityClaim[]; pools: { pool: string; owned: number; external: number }[] }
/** Classify whole live bookings once; only selected physical pools enter totals. No reservation is released or renewed. */
export function partitionQuantityClaims(claims: readonly QuantityClaim[],tick: number,participants: readonly QuantityParticipant[],selectedPools: readonly string[]): QuantityClaimPartition {
  validate(claims,tick,participants,selectedPools);
  const owners = new Set(participants.map(identity)),selected = new Set(selectedPools),totals = new Map(selectedPools.map(pool => [pool,{ pool,owned: 0,external: 0 }]));
  const result: QuantityClaimPartition = { owned: [],external: [],pools: [] };
  for (const claim of claims) {
    if (claim.expiresAt <= tick || !claim.allocations.some(allocation => selected.has(allocation.pool))) continue;
    const kind = owners.has(identity(claim)) ? 'owned' : 'external'; result[kind].push(copyPlain(claim));
    for (const allocation of claim.allocations) {
      const total = totals.get(allocation.pool); if (!total) continue;
      total[kind] += allocation.amount;
      if (!Number.isSafeInteger(total.owned+total.external)) throw new Error('Claim pool total overflow');
    }
  }
  result.pools = [...totals.values()].sort((a,b) => a.pool.localeCompare(b.pool)); return result;
}
function identity(value: QuantityParticipant): string { return JSON.stringify([value.owner,value.holder,value.scope]); }
function validate(claims: readonly QuantityClaim[],tick: number,participants: readonly QuantityParticipant[],pools: readonly string[]): void {
  if (!Number.isSafeInteger(tick) || tick < 0 || claims.length > 1000 || !claims.every(validQuantityClaim) || new Set(claims.map(claim => claim.id)).size !== claims.length) throw new Error('Invalid claim partition input');
  validateParticipants(participants); validatePools(pools);
}
function validateParticipants(participants: readonly QuantityParticipant[]): void {
  if (participants.length > 128 || participants.some(participant => ![participant.owner,participant.holder,participant.scope].every(value => typeof value === 'string' && value.length > 0))) throw new Error('Invalid claim participant');
  if (new Set(participants.map(participant => participant.holder)).size !== participants.length) throw new Error('Ambiguous claim participant');
}
function validatePools(pools: readonly string[]): void {
  if (pools.length > 256 || pools.some(pool => typeof pool !== 'string' || !pool) || new Set(pools).size !== pools.length) throw new Error('Invalid selected claim pools');
}
