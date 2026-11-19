import { admitRemoteWorkforceSpawn } from './app/remotes/workforce-admission';
import { admitRemoteConstructionSpawn } from './app/remotes/infrastructure/population/admission';
import { createNativeRemoteConstructionWorkers } from './app/remotes/infrastructure/population/native';
import { createNativeRemoteInfrastructureFeature } from './app/remotes/infrastructure/feature';
import { createConstructionReservationLedger } from './app/native-construction';
import { createNativeRemoteWorkers } from './app/remotes/fleet/native';
import { admitRemoteFleetSpawn } from './app/remotes/fleet/admission';
import { createNativeRemoteManagementFeature } from './app/remotes/management/feature';
import { createNativeObservers } from './app/native-observers';
import { createNativeScouts } from './app/native-scouts';
import { withScoutRetirement } from './app/scout-retirement';
import { createNativeIntelFeature } from './app/native-intel';
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

const constructionLedger = createConstructionReservationLedger();
const ports = createGamePorts();
const state = createMemoryPort(() => Memory);
const dispatch = createNativeDispatch(state,request => admitRemoteFleetSpawn(state,request,runtimeConfig) && admitRemoteConstructionSpawn(state,request,runtimeConfig) && admitRemoteWorkforceSpawn(state,request,runtimeConfig));
const recovery = createNativeRecovery(state);
const configuration = createPersistentConfiguration(state, () => ports.clock().tick);
const runtimeConfig = (room: string) => resolveConfig(configuration(room), Game.time).values;
const scouts = createNativeScouts(state,dispatch,runtimeConfig,ports);
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
const remoteWorkers = createNativeRemoteWorkers(state,dispatch,runtimeConfig,{ ...mining.definitions,...logistics.definitions,...workers.definitions });
const constructionWorkers = createNativeRemoteConstructionWorkers(state,dispatch,runtimeConfig,{ ...mining.definitions,...logistics.definitions,...workers.definitions,...remoteWorkers.definitions });
const maintainCreeps = createCreepMaintenance(state, ownedCreepRoster, { ...mining.definitions, ...logistics.definitions, ...workers.definitions, ...remoteWorkers.definitions,...constructionWorkers.definitions }, withScoutRetirement(state, createLogisticsRetirement(state), () => Game.time));
// Gameplay registration is separate from configuration-controlled activation.
export const loop = createGameLoop([scouts.feature, scouts.demand, createNativeObservers(state, dispatch.structures, ports), createNativeIntelFeature(state, ports), mining.feature, logistics.feature, workers.feature, support.feature, upgradeMaster.feature, createNativeUpgradeLifecycle(state, dispatch, runtimeConfig), createNativeUpgradeParking(state, dispatch, upgradeMaster.definitions), upgradeFleet, createNativeSupplyRecovery(state, dispatch, runtimeConfig), createNativeUpgradeSupply(state, dispatch, runtimeConfig), createNativeUpgradeRoom(state, dispatch), createNativePlanningFeature(state, runtimeConfig), createNativeConstructionFeature(state,constructionLedger), createNativeRemoteInfrastructureFeature(state,constructionLedger), createNativeRemoteManagementFeature(state,remoteWorkers.publish), remoteWorkers.recruitment, remoteWorkers.actors, constructionWorkers.recruitment, constructionWorkers.actors], {
  ...ports,
  config: configuration,
}, createTickAdmission(state, createMigrationGate(state, [], ports), () => ports.clock().tick, maintainCreeps), dispatch.flush);

