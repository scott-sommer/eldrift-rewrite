import type { StartupConstructionInput } from './construction-model';
import type { SelfBuildInput } from './build-model';
export interface StartupCourier {
  request: string; outboundTicks: number; returnTicks: number; retireTicks: number; minimumBatch: number;
  collectionTicks?: number; deliveryTicks?: number;
}
export interface StartupDeliveryInput { project: StartupConstructionInput; couriers: readonly StartupCourier[]; containerCapacity: number }
export interface StartupDeliveryForecast {
  firstDeliveryAt: number | null; deliveredEnergy: number; harvestedEnergy: number; regeneratedEnergy: number;
  overflowEnergy: number; uncapturedOverflowEnergy: number;
  containerEnergy: number; minerCargoEnergy: number; courierCargoEnergy: number; unusedMinerCargoEnergy: number;
  projectedThrough: number; source: SelfBuildInput['source']; receipts: { tick: number; energy: number; request: string }[];
}
export interface StartupCourierState extends Omit<StartupCourier,'collectionTicks' | 'deliveryTicks'> {
  collectionTicks: number; deliveryTicks: number;
  capacity: number; expiresAt: number; stopAt: number; nextAt: number; phase: 'collect' | 'deliver'; cargo: number;
}
