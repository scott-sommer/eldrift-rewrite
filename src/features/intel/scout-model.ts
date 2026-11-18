export interface ScoutPosition { room: string; x: number; y: number }
export interface ScoutHeartbeat {
  id: string; name: string; home: string; position: ScoutPosition;
  seenAt: number; expiresAt: number | null; target: string | null;
}
export interface ScoutLoss extends ScoutHeartbeat {
  detectedAt: number;
  kind: 'early-disappearance' | 'expired' | 'unknown';
  failurePending: boolean;
}
export interface ScoutHistory {
  revision: number;
  active: ScoutHeartbeat[];
  losses: ScoutLoss[];
}
