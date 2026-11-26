import type { BodyPart } from '../../spawning/body';
interface StartupIncumbent {
  id: string; body: readonly BodyPart[]; availableAt: number; expiresAt: number; remainingSpawnTicks: number; retireTicks: number; energy: number;
}
export type StartupInitialMiner = StartupIncumbent;
export interface StartupInitialCourier extends StartupIncumbent {
  phase: 'collect' | 'deliver'; mode: 'courier' | 'return-only';
  turnaroundTicks?: number; outboundTicks: number; returnTicks: number; collectionTicks: number; deliveryTicks: number; minimumBatch: number;
}
export interface StartupInitialState { containerEnergy: number; miner: StartupInitialMiner | null; couriers: readonly StartupInitialCourier[] }
export interface StartupOpeningState { pendingMinerEnergy: number; minerStarted: boolean; minerOpeningEnergy: number; constructionEnergyFromOpening: number }
