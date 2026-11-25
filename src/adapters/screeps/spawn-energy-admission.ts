import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { NativeSpawnEnergyStructure } from './spawn-energy';
export interface NativeSpawnEnergyPlan { structures: readonly NativeSpawnEnergyStructure[]; commit(): void }
/** Preparation has no intent effect; commit follows SDK acceptance only. Undefined retains legacy behavior. */
export type NativeSpawnEnergyAdmission = (spawn: StructureSpawn, request: SpawnRequest, pendingEnergy: number) => NativeSpawnEnergyPlan | null;
