import type { Position } from '../../../capabilities/movement/step';
import type { BodyPart } from '../../../capabilities/spawning/body';
export interface StartupFactsRequest { home: string; room: string; source: string; station: Position; endpoint: string; username: string; tick: number }
export type StartupStationFacts =
  | { status: 'missing'; remainingProgress: number }
  | { status: 'building'; id: string; remainingProgress: number; progress: number; total: number }
  | { status: 'ready'; id: string; remainingProgress: 0; energy: number; claimedEnergy: number; availableEnergy: number; capacity: number; hits: number; hitsMax: number; ticksToDecay: number };
export interface StartupWorkerFacts {
  name: string; owner: string; position: Position; spawning: boolean; ticksToLive: number | null; energy: number;
  fatigue: number;
  body: { type: BodyPart; hits: number; boost: string | null }[];
}
export interface NativeStartupFacts {
  observedAt: number; home: string; room: string; source: { id: string; position: Position; energy: number; capacity: number; regenerationIn: number | null };
  station: Position & { facts: StartupStationFacts };
  endpoint: { id: string; position: Position; type: string; energy: number; capacity: number; freeCapacity: number; claimedCapacity: number; availableCapacity: number };
  stock: { totalEnergy: number; claimedEnergy: number; availableEnergy: number; spawnEnergy: number; claimedSpawnEnergy: number; availableSpawnEnergy: number; spawnCapacity: number };
  spawns: { id: string; position: Position; remainingTime: number }[];
  workers: StartupWorkerFacts[];
  authority: { assignment: string; generation: number; expiresAt: number } | null;
  reservation: { username: string; ticksToEnd: number } | null;
}
export type StartupFactsResult = { status: 'observed'; facts: NativeStartupFacts } | { status: 'deferred'; reason: string };
