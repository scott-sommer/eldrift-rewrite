export const trafficOrderPolicy = 'planned-name-then-native-id-v1';
import type { Position } from '../step';
export interface TrafficRequest {
  unit: string;
  owner: string;
  /** Stable planned identity for equal-priority ordering; unit remains the observed native ID. */
  order?: string;
  from: Position;
  to: Position;
  /** Local exit tile when to is the remote landing. */
  via?: Position;
  priority: number;
  mobile: boolean;
  group?: string;
}
export interface Occupant { unit: string; position: Position }
export type Denial = 'immobile' | 'invalid-step' | 'destination-conflict' | 'dependency-blocked' | 'group-blocked';
export interface TrafficResolution { accepted: TrafficRequest[]; denied: { unit: string; reason: Denial }[] }
export function tileKey(position: Position): string {
  if (!position.room || !Number.isInteger(position.x) || !Number.isInteger(position.y)
    || position.x < 0 || position.x > 49 || position.y < 0 || position.y > 49) throw new Error('Invalid traffic position');
  return JSON.stringify([position.room, position.x, position.y]);
}

export function trafficTargets(request: TrafficRequest): string[] {
  return [...new Set([tileKey(request.to), ...(request.via ? [tileKey(request.via)] : [])])];
}
