import type { BodyPart } from './body';
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
}
export interface SpawnSlot { id: string; room: string; busy: boolean }
export interface SpawnAssignment { spawn: string; request: SpawnRequest; cost: number }
export type UnaffordablePolicy = 'wait' | 'skip';
/** Replacement begins early enough for spawning, travel and a caller-selected margin. */
export function replacementDue(ttl: number, parts: number, travel: number, margin: number): boolean {
  if ([ttl, parts, travel, margin].some(value => !Number.isSafeInteger(value) || value < 0) || parts > 50) throw new Error('Invalid replacement timing');
  return ttl <= parts * 3 + travel + margin;
}
