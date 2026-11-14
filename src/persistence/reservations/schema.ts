import type { StateSchema } from '../versioned-state';
export interface Claim {
  resource: string;
  holder: string;
  scope: string;
  expiresAt: number;
}
export interface Reservations { claims: Claim[] }
function validClaim(value: unknown): value is Claim {
  if (!value || typeof value !== 'object') return false;
  const claim = value as Partial<Claim>;
  return [claim.resource, claim.holder, claim.scope].every(item => typeof item === 'string' && item.length > 0)
    && typeof claim.expiresAt === 'number' && Number.isSafeInteger(claim.expiresAt) && claim.expiresAt >= 0;
}
function valid(value: unknown): value is Reservations {
  if (!value || typeof value !== 'object' || !('claims' in value)) return false;
  return Array.isArray(value.claims) && value.claims.every(validClaim)
    && new Set(value.claims.map(claim => claim.resource)).size === value.claims.length;
}
export const reservationSchema: StateSchema<Reservations> = {
  owner: 'reservations', version: 1, initial: () => ({ claims: [] }), valid, migrations: {},
};
