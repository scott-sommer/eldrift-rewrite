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
const mining = createNativeMiningFeature(state);
const maintainCreeps = createCreepMaintenance(state, ownedCreepRoster, mining.definitions);
// Gameplay registration is separate from configuration-controlled activation.
export const loop = createGameLoop([mining.feature], {
  ...ports,
  config: createPersistentConfiguration(state, () => ports.clock().tick),
}, createTickAdmission(state, createMigrationGate(state, [], ports), () => ports.clock().tick, maintainCreeps), mining.flush);


