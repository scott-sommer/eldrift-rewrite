import type { StartupDeliveryInput } from '../../src/capabilities/economy/startup/delivery-model';
export function startupDeliveryInput(): StartupDeliveryInput {
  return { containerCapacity: 2000,homeSink: { capacity: 1000000,freeCapacity: 1000000,changes: [] },couriers: [{ request: 'courier',outboundTicks: 1,returnTicks: 2,retireTicks: 10,minimumBatch: 4 }],
    project: { remainingProgress: 4,source: { energy: 100,capacity: 100,regenerationTicks: 300,regenerationIn: null },
      workers: [{ request: 'miner',travelTicks: 0,retireTicks: 10 }],
      spawning: { room: 'home',requests: [
        { id: 'miner',name: 'miner',owner: 'remote',room: 'home',body: ['work','carry','move'],priority: 0,readyAt: 0,expiresAt: 100 },
        { id: 'courier',name: 'courier',owner: 'remote',room: 'home',body: ['carry','move'],priority: 1,readyAt: 0,expiresAt: 100 },
      ],spawns: [{ id: 'spawn',room: 'home',availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
      funding: { capacity: 300,initialEnergy: 300,refills: [] },cash: { homeEnergy: 300,protectedEnergy: 0,horizon: 100,readyAt: 0,selfHarvestedConstruction: 4,flows: [] } } } };
}
