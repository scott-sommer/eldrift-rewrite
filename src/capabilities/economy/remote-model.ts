import type { BodyPart } from '../spawning/body';
export interface RemoteBody { body: readonly BodyPart[]; lifetime: number; travelTicks: number; replacementMargin?: number }
export interface RemoteHauler extends Omit<RemoteBody, 'travelTicks'> {
  outboundTicks: number; returnTicks: number; serviceTicks: number;
}
export interface RemoteEconomicsInput {
  capacity: number; regenerationTicks: number; harvestPower: number;
  miner: RemoteBody; hauler: RemoteHauler;
  reservation: { energyPerTick: number; spawnLoad: number; shares: number };
  infrastructurePerTick: number; riskPerTick: number;
  limits: { maximumHaulers: number; maximumSpawnLoad: number; minimumNetYield: number };
}
export type RemoteBudgetRejection = 'net-yield' | 'spawn-load';
export interface RemoteEconomics {
  status: 'evaluated'; sourceRate: number; harvestRate: number; deliveredRate: number; netRate: number;
  tripTicks: number; requiredHaulers: number; haulers: number;
  energy: { mining: number; hauling: number; reservation: number; infrastructure: number; risk: number; total: number };
  spawn: { mining: number; hauling: number; reservation: number; total: number };
  reservationShares: number; accepted: boolean; rejected: RemoteBudgetRejection[];
}
export type RemoteEconomicsResult = RemoteEconomics | { status: 'infeasible';
  reason: 'miner-service' | 'hauler-service' | 'no-harvest' | 'no-carry' };
