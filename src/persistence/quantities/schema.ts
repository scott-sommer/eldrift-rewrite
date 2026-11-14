import type { StateSchema } from '../versioned-state';
export interface QuantityAllocation { pool: string; amount: number }
export interface QuantityClaim {
  id: string;
  owner: string;
  holder: string;
  scope: string;
  expiresAt: number;
  allocations: QuantityAllocation[];
}
export interface QuantityLedger { claims: QuantityClaim[] }
export function validQuantityClaim(value: unknown): value is QuantityClaim {
  if (!value || typeof value !== 'object') return false;
  const claim = value as Partial<QuantityClaim>;
  return [claim.id, claim.owner, claim.holder, claim.scope].every(nonempty)
    && Number.isSafeInteger(claim.expiresAt) && (claim.expiresAt ?? -1) >= 0
    && validAllocations(claim.allocations);
}
function validAllocations(value: unknown): value is QuantityAllocation[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return false;
  return value.every(item => item && typeof item === 'object' && nonempty(item.pool)
    && Number.isSafeInteger(item.amount) && item.amount > 0)
    && new Set(value.map(item => item.pool)).size === value.length;
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
function valid(value: unknown): value is QuantityLedger {
  if (!value || typeof value !== 'object' || !('claims' in value)) return false;
  return Array.isArray(value.claims) && value.claims.length <= 1000 && value.claims.every(validQuantityClaim)
    && new Set(value.claims.map(claim => claim.id)).size === value.claims.length;
}
export const quantitySchema: StateSchema<QuantityLedger> = {
  owner: 'quantity-reservations', version: 1, initial: () => ({ claims: [] }), valid, migrations: {},
};
