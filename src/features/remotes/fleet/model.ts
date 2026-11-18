import type { BodyPart } from '../../../capabilities/spawning/body';
export interface RemoteFleetIdentity { home: string; room: string; source: string; kind: 'miner' | 'courier' }
export interface RemoteFleetProfile extends RemoteFleetIdentity {
  owner: string; generation: number; body: BodyPart[]; desired: number; travelTicks: number; marginTicks: number; retireTicks: number; priority: number;
}
export interface RemoteFleetRecord { home: string; revision: number; clock: number; next: number; actors: RemoteFleetProfile[] }
