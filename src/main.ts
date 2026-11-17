import { createNativeConstructionFeature } from './app/native-construction';
import { createNativePlanningFeature } from './app/native-planning';
import { createNativeSupplyRecovery } from './app/native-supply-recovery';
import { createNativeUpgradeSupply } from './app/native-upgrade-supply';
import { createNativeUpgradeLifecycle } from './app/native-upgrade-lifecycle';
import { createNativeUpgradeParking } from './app/native-upgrade-parking';
import { createNativeUpgradeMaster } from './app/native-upgrade-master';
import { createNativeUpgradeFleet } from './app/native-upgrade-fleet';
import { createNativeUpgradeRoom } from './app/native-upgrade-room';
import { createNativeSupportFeature } from './app/native-support';
import { resolveConfig } from './config/resolve';
import { createNativeRecovery } from './app/native-recovery';
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
const recovery = createNativeRecovery(state);
const configuration = createPersistentConfiguration(state, () => ports.clock().tick);
const runtimeConfig = (room: string) => resolveConfig(configuration(room), Game.time).values;
const support = createNativeSupportFeature(state, dispatch, runtimeConfig, recovery);
const upgradeFleet = createNativeUpgradeFleet(state, dispatch, runtimeConfig);
const recovering = (room: Room, config: Parameters<typeof recovery>[1]) => recovery(room, config).active;
const mining = createNativeMiningFeature(state, {
  mine: createNativeMiner(dispatch.arbiter, dispatch.movement), activate: dispatch.activate, recovering,
});
const logistics = createNativeLogisticsFeature(state, dispatch, recovering);
const upgradeMaster = createNativeUpgradeMaster(state, dispatch, recovering);
const workers = createNativeWorkFeature(state, dispatch, { ...mining.definitions, ...logistics.definitions },
  recovering);
const maintainCreeps = createCreepMaintenance(state, ownedCreepRoster, { ...mining.definitions, ...logistics.definitions, ...workers.definitions }, createLogisticsRetirement(state));
// Gameplay registration is separate from configuration-controlled activation.
export const loop = createGameLoop([mining.feature, logistics.feature, workers.feature, support.feature, upgradeMaster.feature, createNativeUpgradeLifecycle(state, dispatch, runtimeConfig), createNativeUpgradeParking(state, dispatch, upgradeMaster.definitions), upgradeFleet, createNativeSupplyRecovery(state, dispatch, runtimeConfig), createNativeUpgradeSupply(state, dispatch, runtimeConfig), createNativeUpgradeRoom(state, dispatch), createNativePlanningFeature(state, runtimeConfig), createNativeConstructionFeature(state)], {
  ...ports,
  config: configuration,
}, createTickAdmission(state, createMigrationGate(state, [], ports), () => ports.clock().tick, maintainCreeps), dispatch.flush);

