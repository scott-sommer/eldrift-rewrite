import type { SpawnAdmission } from './admission';
import type { SpawnBoost } from './boost';
import type { Position } from '../movement/step';
import type { BodyPart } from './body';
export interface SpawnPlacement { spawn: string; exit: Position }
export interface SpawnRequest {
  id: string;
  owner: string;
  room: string;
  /** Optional population home when production occurs in a sponsoring room. */
  home?: string;
  name: string;
  priority: number;
  readyAt: number;
  expiresAt: number;
  body: readonly BodyPart[];
  /** A quoted origin is a constraint, not a preference for any idle room spawn. */
  placement?: SpawnPlacement;
  /** Exact boost policy chosen by the owning producer; industry confirms after birth. */
  boost?: SpawnBoost;
  /** Required final authority; missing task must never downgrade to ordinary recruitment. */
  admission?: SpawnAdmission;
}
export interface SpawnSlot { id: string; room: string; busy: boolean }
export interface SpawnAssignment { spawn: string; request: SpawnRequest; cost: number }
export type UnaffordablePolicy = 'wait' | 'skip';
/** Replacement begins early enough for spawning, travel and a caller-selected margin. */
export function replacementDue(ttl: number, parts: number, travel: number, margin: number): boolean {
  if ([ttl, parts, travel, margin].some(value => !Number.isSafeInteger(value) || value < 0) || parts > 50) throw new Error('Invalid replacement timing');
  return ttl <= parts * 3 + travel + margin;
}
