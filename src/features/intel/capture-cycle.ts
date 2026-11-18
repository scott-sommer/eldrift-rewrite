import { roomCoordinates } from '../../core/geometry/room-grid';
import type { CaptureProgress } from './capture-store';
export interface CapturePolicy { enabled: boolean; interval: number }
export interface CaptureLatest { seen: number | null; stale: boolean; failedAt: number | null }
export interface CaptureCyclePorts {
  progress: { read(): CaptureProgress; save(revision: number, cursor: string): boolean };
  policy(room: string): CapturePolicy;
  latest(room: string): CaptureLatest;
  capture(room: string): boolean;
  failure(room: string, error: unknown): void;
}
export interface CaptureBudget { scans: number; attempts: number }
export interface CaptureResult {
  scanned: number; attempted: number; captured: number; saved: boolean;
  failures: { room: string; error: unknown }[];
}
/** Cooperative guards bound admission; one room snapshot/write is atomic work. */
export function captureIntelCycle(names: readonly string[], tick: number, budget: CaptureBudget,
  ports: CaptureCyclePorts, guard: () => boolean): CaptureResult {
  validateRequest(tick, budget);
  const result: CaptureResult = { scanned: 0, attempted: 0, captured: 0, saved: true, failures: [] };
  if (!budget.scans || !budget.attempts || !names.length || !guard()) return result;
  const progress = ports.progress.read(), rooms = orderedRooms(names, progress.cursor);
  let cursor: string | undefined;
  for (const room of rooms) {
    if (result.scanned >= budget.scans || result.attempted >= budget.attempts || !guard()) break;
    result.scanned++;
    try {
      const policy = ports.policy(room);
      if (policy.enabled && due(ports.latest(room), policy.interval, tick)) {
        if (!guard()) break;
        result.attempted++;
        if (ports.capture(room)) result.captured++;
      }
    } catch (error) {
      result.failures.push({ room, error });
      try { ports.failure(room, error); } catch { /* Preserve the original failure and advance other rooms. */ }
    }
    cursor = room;
  }
  if (cursor !== undefined) result.saved = ports.progress.save(progress.revision, cursor);
  return result;
}
function due(latest: CaptureLatest, interval: number, tick: number): boolean {
  if (!Number.isSafeInteger(interval) || interval < 1) throw new Error('Invalid capture interval');
  for (const value of [latest.seen, latest.failedAt]) {
    validateFactClock(value, tick);
  }
  if (latest.failedAt !== null && tick - latest.failedAt < interval) return false;
  return latest.seen === null || latest.stale || tick - latest.seen >= interval;
}
function orderedRooms(names: readonly string[], cursor: string | null): string[] {
  const rooms = [...new Set(names)].sort();
  for (const room of rooms) roomCoordinates(room);
  const index = cursor === null ? 0 : rooms.findIndex(room => room > cursor);
  const start = index < 0 ? 0 : index;
  return [...rooms.slice(start), ...rooms.slice(0, start)];
}
function validateRequest(tick: number, budget: CaptureBudget): void {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid capture clock');
  for (const value of [budget.scans, budget.attempts]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid capture budget');
  }
}

function validateFactClock(value: number | null, tick: number): void {
  if (value === null) return;
  if (!Number.isSafeInteger(value) || value < 0 || value > tick) throw new Error('Invalid capture fact clock');
}
