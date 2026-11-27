import type { StateSchema } from '../versioned-state';
import { validQuantityClaim } from '../../core/resources/quantity-claim';
import type { QuantityClaim } from '../../core/resources/quantity-claim';
export { validQuantityClaim } from '../../core/resources/quantity-claim';
export type { QuantityAllocation, QuantityClaim } from '../../core/resources/quantity-claim';
export interface QuantityLedger { claims: QuantityClaim[] }
function valid(value: unknown): value is QuantityLedger {
  if (!value || typeof value !== 'object' || !('claims' in value)) return false;
  return Array.isArray(value.claims) && value.claims.length <= 1000 && value.claims.every(validQuantityClaim)
    && new Set(value.claims.map(claim => claim.id)).size === value.claims.length;
}
export const quantitySchema: StateSchema<QuantityLedger> = {
  owner: 'quantity-reservations', version: 1, initial: () => ({ claims: [] }), valid, migrations: {},
};
