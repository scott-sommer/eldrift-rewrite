import { roomCoordinates } from './room-grid';
export interface WorldPosition { room: string; x: number; y: number }
export function validWorldPosition(value: unknown): value is WorldPosition {
  if (!value || typeof value !== 'object') return false;
  const point = value as WorldPosition;
  if (!Number.isSafeInteger(point.x) || point.x < 0 || point.x > 49 || !Number.isSafeInteger(point.y) || point.y < 0 || point.y > 49) return false;
  try { roomCoordinates(point.room); return true; } catch { return false; }
}
