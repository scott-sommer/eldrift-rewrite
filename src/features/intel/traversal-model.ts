import type { IntelRecord, IntelRoomStatus } from './model';
export interface IntelTraversalPolicy {
  mode: 'exploration' | 'known-safe';
  username: string;
  allies: readonly string[];
  blockedRooms: readonly string[];
  avoidUntil: Readonly<Record<string, number>>;
  allowKeeper: boolean;
  maximumAge: number;
  maximumRooms: number;
  unknownCost: number;
  staleCost: number;
  keeperCost: number;
}
export interface IntelTraversalPorts {
  intel(room: string): IntelRecord;
  /** Current map status, independently of old observed room details. */
  status(room: string): IntelRoomStatus;
}
export type TraversalBlock = 'excluded' | 'temporary' | 'status' | 'hostile' | 'unclassified-threat'
  | 'keeper' | 'unknown' | 'stale' | 'room-budget' | 'admission';
export type IntelTraversalDecision =
  | { status: 'allowed'; confidence: 'known' | 'uncertain'; cost: number; refresh: boolean }
  | { status: 'blocked'; reason: TraversalBlock; refresh: boolean };
