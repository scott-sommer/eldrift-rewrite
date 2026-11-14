import { createNativeWorkFeature } from './app/native-work';
import { createLogisticsRetirement } from './app/logistics-retirement';
import { createNativeLogisticsFeature } from './app/native-logistics';
import { createNativeDispatch } from './app/native-dispatch';
import { createNativeMiner } from './adapters/screeps/mining';
import { createNativeMiningFeature } from './app/native-mining';
import { createCreepMaintenance } from './app/creep-maintenance';
import { ownedCreepRoster } from './adapters/screeps/unit-roster';
import { createTickAdmission } from './app/tick-admission';
import { createMigrationGate } from './app/migration-gate';
import { createGameLoop } from './app/game-loop';
import { createPersistentConfiguration } from './app/persistent-configuration';
import { createGamePorts } from './adapters/screeps/runtime';
import { createMemoryPort } from './adapters/screeps/memory';

const ports = createGamePorts();
const state = createMemoryPort(() => Memory);
const dispatch = createNativeDispatch(state);
const mining = createNativeMiningFeature(state, {
  mine: createNativeMiner(dispatch.arbiter, dispatch.movement), activate: dispatch.activate,
});
const logistics = createNativeLogisticsFeature(state, dispatch);
const workers = createNativeWorkFeature(state, dispatch, { ...mining.definitions, ...logistics.definitions });
const maintainCreeps = createCreepMaintenance(state, ownedCreepRoster, { ...mining.definitions, ...logistics.definitions, ...workers.definitions }, createLogisticsRetirement(state));
// Gameplay registration is separate from configuration-controlled activation.
export const loop = createGameLoop([mining.feature, logistics.feature, workers.feature], {
  ...ports,
  config: createPersistentConfiguration(state, () => ports.clock().tick),
}, createTickAdmission(state, createMigrationGate(state, [], ports), () => ports.clock().tick, maintainCreeps), dispatch.flush);

