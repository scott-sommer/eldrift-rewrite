import { roomCoordinates } from '../../core/geometry/room-grid';
import { natural, object, text } from './validation';
import type { ScoutHeartbeat, ScoutLoss } from './scout-model';
export function validScoutRoom(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { roomCoordinates(value); return true; } catch { return false; }
}
export function validScoutHeartbeat(value: unknown): value is ScoutHeartbeat {
  if (!object(value) || !object(value.position)) return false;
  return validId(value.id) && text(value.name) && validScoutRoom(value.home) && validScoutRoom(value.position.room)
    && validPosition(value.position) && validTiming(value) && (value.target === null || validScoutRoom(value.target));
}
function validPosition(value: Record<string, unknown>): boolean {
  return natural(value.x) && value.x < 50 && natural(value.y) && value.y < 50;
}
function validTiming(value: Record<string, unknown>): boolean {
  return natural(value.seenAt) && (value.expiresAt === null || natural(value.expiresAt));
}
export function scoutLossKind(seen: Pick<ScoutHeartbeat, 'expiresAt'>, tick: number): ScoutLoss['kind'] {
  if (seen.expiresAt === null) return 'unknown';
  return tick < seen.expiresAt ? 'early-disappearance' : 'expired';
}
export function validScoutLoss(value: unknown): value is ScoutLoss {
  if (!validScoutHeartbeat(value)) return false;
  const loss = value as ScoutLoss;
  return natural(loss.detectedAt) && loss.detectedAt >= loss.seenAt && loss.kind === scoutLossKind(loss, loss.detectedAt)
    && typeof loss.failurePending === 'boolean' && (!loss.failurePending || loss.kind === 'early-disappearance');
}

function validId(value: unknown): boolean { return text(value) && value.length <= 240; }
