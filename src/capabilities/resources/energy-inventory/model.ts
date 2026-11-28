import type { BuildProfile } from '../../construction/build-effect';
import type { RepairProfile } from '../../mining/repair-effect';
import type { Position } from '../../movement/step';
export interface EnergyInventory {
  id: string; energy: number; capacity: number; usedCapacity: number; freeEnergyCapacity: number;
}
export interface EnergyTransferIntent { id: string; kind: 'withdraw' | 'transfer'; source: string; target: string; amount: number }
export interface EnergyTransferEffect extends EnergyTransferIntent { issuedAt: number; settledAt: number }

export interface EnergyInventoryCheckpoint<T extends EnergyInventory = EnergyInventory> { nextTick: number; stores: T[]; effects: EnergyEffect[]; ecology?: EnergyEcology }

export interface EnergySource { id: string; position: Position; energy: number; capacity: number; regenerationIn: number | null; regenerationTicks: number }
export interface GroundEnergy { position: Position; energy: number }
export interface EnergyEcology { sources: EnergySource[]; ground: GroundEnergy[]; containers: EnergyContainer[]; decayDivisor: number; structures?: EnergyRepairTarget[]; sites?: EnergyBuildSite[]; bodies?: EnergyBody[]; tombstones?: EnergyTombstone[] }
export interface EnergyHarvestIntent { id: string; kind: 'harvest'; source: string; target: string; amount: number; position: Position; container?: string }
export interface EnergyHarvestEffect extends EnergyHarvestIntent { issuedAt: number; settledAt: number; carriedEnergy: number; containerEnergy: number; droppedEnergy: number }
export type EnergyIntent = EnergyTransferIntent | EnergyHarvestIntent | EnergyRepairIntent | EnergyBuildIntent;
export type EnergyEffect = EnergyTransferEffect | EnergyHarvestEffect | EnergyRepairEffect | EnergyBuildEffect;

export interface EnergyRepairTarget { id: string; position: Position; hits: number; hitsMax: number; repairable: boolean }
export interface EnergyRepairIntent { id: string; kind: 'repair'; source: string; target: string; position: Position; profile: RepairProfile }
export interface EnergyRepairEffect extends EnergyRepairIntent { amount: number; repairedHits: number; issuedAt: number; settledAt: number }

export interface EnergyContainer { id: string; position: Position; decay?: { remaining: number; interval: number; amount: number }; destroyedAt?: number; spilledEnergy?: number }
export interface EnergyPostprocess { key: string; kind: 'source' | 'ground' | 'container' | 'body' | 'tombstone'; id: string }
export type EnergyPostprocessOrder = (operations: readonly EnergyPostprocess[]) => readonly string[];

/** Birth identities are forecast-local aliases, never predicted native SDK object IDs. */
export interface EnergyBornInventory extends EnergyInventory { capacityPool: string; room: string; active: boolean }
export interface EnergyContainerBirth { store: EnergyBornInventory; health: EnergyRepairTarget; container: EnergyContainer }
export interface EnergyBuildSite { id: string; position: Position; structureType: string; progress: number; progressTotal: number; completion: EnergyContainerBirth | null; completedAt?: number }
export interface EnergyBuildIntent { id: string; kind: 'build'; source: string; target: string; position: Position; profile: BuildProfile; allowed: boolean }
export interface EnergyBuildEffect extends EnergyBuildIntent { amount: number; progressAdded: number; completed: boolean; created?: string; issuedAt: number; settledAt: number }

export interface EnergyBody { id: string; position: Position; expiresAt: number; salvageEnergy: number; tombstoneId: string; tombstoneDecay: number; diedAt?: number }
export interface EnergyTombstone { id: string; body: string; position: Position; energy: number; remaining: number; createdAt: number; expiredAt?: number; releasedEnergy?: number }
export interface EnergyBodyPosition { id: string; position: Position }
