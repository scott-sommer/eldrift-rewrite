import { roomCoordinates } from '../../../core/geometry/room-grid';
import type { ObservationRequest, ObservationFlight, ObservationReceipt } from './model';
export function natural(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
export function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 200; }
export function room(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { roomCoordinates(value); return true; } catch { return false; }
}
export function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function validRequest(value: unknown): value is ObservationRequest {
  if (!object(value) || !text(value.id) || !text(value.owner) || !room(value.home) || !room(value.room)) return false;
  return Number.isSafeInteger(value.priority) && Math.abs(Number(value.priority)) <= 1000000
    && natural(value.requestedAt) && natural(value.expiresAt) && value.expiresAt > value.requestedAt;
}
export function validFlight(value: unknown): value is ObservationFlight {
  return object(value) && validRequest(value.request) && text(value.observer) && natural(value.issuedAt)
    && value.issuedAt >= value.request.requestedAt && value.issuedAt < value.request.expiresAt
    && (value.code === null || value.code === 0);
}
export function validReceipt(value: unknown): value is ObservationReceipt {
  if (!object(value) || !validRequest(value.request) || !natural(value.completedAt)) return false;
  if (value.completedAt < value.request.requestedAt || !['observed','missed','expired','rejected','exception'].includes(String(value.outcome))) return false;
  return validReceiptAction(value, value.request, value.completedAt) && (value.code === null || Number.isSafeInteger(value.code));
}

function validReceiptAction(value: Record<string, unknown>, request: ObservationRequest, completedAt: number): boolean {
  if (value.issuedAt === null) return value.observer === null && value.outcome === 'expired';
  if (!text(value.observer) || !natural(value.issuedAt)) return false;
  if (value.issuedAt < request.requestedAt || value.issuedAt > completedAt) return false;
  return value.outcome !== 'observed' || completedAt === value.issuedAt + 1;
}
