import type { Position } from '../../../../capabilities/movement/step';
import type { BodyPart } from '../../../../capabilities/spawning/body';
import type { IntelTraversalPolicy } from '../../../../features/intel/traversal-model';
import type { StartupFactsRequest } from '../facts-model';
export interface NativeStartupTravelRequest {
  target: StartupFactsRequest; spawn: string; exit: Position; collection: Position; deposit: Position;
  miner: readonly BodyPart[]; courier: readonly BodyPart[]; traversal: IntelTraversalPolicy;
}
export interface StartupTravelOptions { maximumRooms: number; maximumOps: number }
