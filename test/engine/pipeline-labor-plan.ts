import { createNativeLaborWorkforce } from '../../src/app/remotes/startup/household/labor-workforce';
import { observeNativeStartupEnergy } from '../../src/app/remotes/startup/energy';
import { peekSpawnIdentity } from '../../src/features/population/spawn-identity';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { defaultWorkPolicy } from '../../src/features/work/policy';
import type { StatePort } from '../../src/persistence/versioned-state';
/** Reuse the paid-body proposal owner; this controlled experiment supplies publication approval explicitly. */
export function pipelineLaborPlan(state: StatePort) {
  const spawn = Game.spawns.Spawn1!, home = spawn.room, storage = home.storage!, horizon = 1000;
  const physical = observeNativeStartupEnergy(state,home.name,[spawn.id]); if (physical.status !== 'observed') throw new Error('Missing pipeline energy');
  const base = startupDeliveryInput(); base.project.remainingProgress = 0; base.project.workers = []; base.couriers = [];
  base.project.spawning = { room: home.name,requests: [],spawns: [{ id: spawn.id,room: home.name,availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
    cash: { homeEnergy: physical.initialEnergy+storage.store.energy,protectedEnergy: 0,horizon,readyAt: 0,selfHarvestedConstruction: 0,flows: [] },
    funding: { capacity: physical.capacity,initialEnergy: physical.initialEnergy,refills: [],energyLayout: { ...physical.layout,regeneration: { eligibleSpawns: [spawn.id],otherRoomEnergy: 0 } } } };
  base.household = { endpointEnergy: storage.store.energy,redistribution: { horizon,trips: [] } };
  base.homeSink = { capacity: storage.store.getCapacity(RESOURCE_ENERGY),freeCapacity: storage.store.getFreeCapacity(RESOURCE_ENERGY),changes: [] };
  const result = createNativeLaborWorkforce(state,4000)({ base,endpoint: storage.id,demand: { home: home.name,mode: 'builder',enabled: true,budget: 200,recipe: 'balanced',maximumParts: 3,maximumUnits: 1,id: peekSpawnIdentity(state,home.name),placement: { spawn: spawn.id,exit: { room: home.name,x: 46,y: 25 } },replacementTravel: 0,replacementMargin: 0 },workPolicy: { ...defaultWorkPolicy,allowUpgrade: false },laborPolicy: { horizon,maximumLoad: 3,maximumWorkTicks: 1,reserve: 20 } },1);
  if (result.status !== 'ready') throw new Error('Pipeline labor proposal: '+result.reason);
  return result;
}
