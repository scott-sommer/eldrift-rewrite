import { copyPlain, parsePlain } from '../../persistence/plain-data';
import type { DefenseCoordinatorCheckpoint } from './defense-coordinator-progress';
interface LegacyDefense { version: 1; request: string; coordinator: DefenseCoordinatorCheckpoint }
interface EncodedDefense { version: 2; request: string; payload: string }
export type SavedDefense = LegacyDefense | EncodedDefense;
/** Geometry crosses generic checkpoint layers as JSON, decoded only by its owning coordinator. */
export function restoreCoordinatedDefense(request: string, checkpoint: unknown): SavedDefense | undefined {
  if (checkpoint === null || checkpoint === undefined) return undefined;
  const saved = copyPlain(checkpoint) as SavedDefense;
  if (!saved || saved.request !== request) throw new Error('Stale coordinated defense');
  if (saved.version === 1 && saved.coordinator) return saved;
  if (saved.version === 2 && validPayload(saved.payload)) return saved;
  throw new Error('Invalid coordinated defense checkpoint');
}
export function decodeCoordinatedDefense(saved: SavedDefense): DefenseCoordinatorCheckpoint {
  if (saved.version === 1) return copyPlain(saved.coordinator);
  const value = parsePlain(saved.payload);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid coordinated defense payload');
  return value as DefenseCoordinatorCheckpoint;
}
export function saveCoordinatedDefense(request: string, coordinator: DefenseCoordinatorCheckpoint): EncodedDefense {
  const payload = JSON.stringify(coordinator);
  if (!validPayload(payload)) throw new Error('Invalid coordinated defense payload');
  return { version: 2, request, payload };
}
function validPayload(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 2000000;
}
