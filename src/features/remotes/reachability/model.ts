export type ReachabilityPhase = 'spawning' | 'approach' | 'success' | 'failure' | 'interrupted';
export interface ReachabilityIdentity { name: string; id: string; room: string; source: string }
export interface ReachabilityObservation extends ReachabilityIdentity {
  spawning: boolean; ttl: number; lifetime: number; reached: boolean; eligible: boolean; healthy: boolean;
}
export interface ReachabilityAttempt extends ReachabilityIdentity {
  phase: ReachabilityPhase; startedAt: number; lastSeen: number; expiresAt: number | null;
}
export interface ReachabilitySource {
  source: string; room: string; consecutiveFailures: number; lastResult: 'success' | 'failure'; reportedAt: number; blockedAt: number | null;
}
export interface ReachabilityBlock { room: string; source: string; tick: number }
export interface ReachabilityRecord {
  home: string; revision: number; clock: number; attempts: ReachabilityAttempt[]; sources: ReachabilitySource[]; blocked: ReachabilityBlock[];
}
export const reachabilityLimits = { attempts: 200,sources: 128,rooms: 128 } as const;
