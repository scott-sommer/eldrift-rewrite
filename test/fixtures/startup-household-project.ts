import { startupDeliveryInput } from './startup-delivery';
export function startupHouseholdProject() {
  const input = startupDeliveryInput(), spawning = input.project.spawning;
  input.project.remainingProgress = 0; spawning.cash.selfHarvestedConstruction = 0;
  input.project.source.energy = 1000; input.project.source.capacity = 1000;
  spawning.cash.homeEnergy = 1000; input.homeSink = { capacity: 730,freeCapacity: 30,changes: [] };
  spawning.requests = [{ id: 'household',name: 'household',owner: 'home',room: spawning.room,body: ['carry','move'],priority: -1,readyAt: 0,expiresAt: 101 },...spawning.requests];
  input.household = { endpointEnergy: 700,redistribution: { horizon: 100,trips: [6,10,14,18,22,26].map((pickupAt,index) => ({ id: 'trip'+index,request: 'household',pickupAt,loadedTicks: 1,returnTicks: 1,energy: 50 })) } };
  return input;
}
