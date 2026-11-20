import { startupDeliveryInput } from './startup-delivery';
import type { StartupInitialCourier } from '../../src/capabilities/economy/startup/initial-model';
export function startupInitialInput() {
  const input = startupDeliveryInput(); input.project.spawning.requests = []; input.project.workers = []; input.couriers = [];
  input.project.remainingProgress = 0; input.project.spawning.cash.selfHarvestedConstruction = 0; input.project.spawning.cash.horizon = 20;
  input.project.source.energy = 0; input.container.repairPolicy = null;
  input.initial = { containerEnergy: 0,miner: null,couriers: [] }; return input;
}
export function initialCourier(change: Partial<StartupInitialCourier> = {}): StartupInitialCourier {
  return { id: 'paid-courier',body: ['carry','move'],availableAt: 0,expiresAt: 20,remainingSpawnTicks: 0,retireTicks: 2,energy: 0,
    mode: 'courier',phase: 'collect',outboundTicks: 0,returnTicks: 0,collectionTicks: 1,deliveryTicks: 1,minimumBatch: 1,...change };
}
