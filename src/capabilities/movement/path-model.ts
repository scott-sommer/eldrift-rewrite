import type { Position } from './step';
export interface PathProfile {
  id: string;
  plainCost: number;
  swampCost: number;
  maxOps: number;
  maxRooms: number;
}
export interface PathRequest {
  origin: Position;
  destination: Position;
  range: number;
  profile: PathProfile;
  topologyVersion: string;
  policyVersion: string;
  allowedRooms?: readonly string[];
}
export type PathResult =
  | { status: 'complete' | 'incomplete'; path: Position[]; cost: number; operations: number }
  | { status: 'no-route'; reason: string };
export type PathSearch = (request: Readonly<PathRequest>) => PathResult;
export function withinRange(position: Position, destination: Position, range: number): boolean {
  return position.room === destination.room && Math.max(Math.abs(position.x - destination.x), Math.abs(position.y - destination.y)) <= range;
}
