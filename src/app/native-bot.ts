import { createNativeStartupEnergyAdmission } from './remotes/startup/energy-admission';
import type { explicitSpawnEnergyPolicy } from '../adapters/screeps/spawn-energy';
import { createNativeEmpireProduction } from './native-empire-production';
import { createNativeBoostLabRoles } from './native-boost-lab-roles';
import { createNativeBoosts } from './native-boosts';
import { createNativeLabs } from './native-labs';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { settleHaulingTask } from './settle-hauling-task';
import type { RemoteFleetBirthPolicy } from './remotes/startup/model';
import { createNativeRemoteStartup } from './remotes/startup/native';
import { createNativeRemoteReachabilityFeature } from './remotes/reachability/feature';
import { admitReachableRemoteSpawn } from './remotes/reachability/policy';
import { createNativeRemoteCapacityFeature } from './remotes/capacity/feature';
import { createNativeSpawnLoadObserver } from './remotes/capacity/observer';
import { admitReservationSpawn } from './remotes/reservation/population/admission';
import { createNativeReservationWorkers, reservationDefinitions } from './remotes/reservation/population/native';
import { admitRemoteWorkforceSpawn } from './remotes/workforce-admission';
import { admitRemoteConstructionSpawn } from './remotes/infrastructure/population/admission';
import { createNativeRemoteConstructionWorkers, remoteConstructionDefinitions } from './remotes/infrastructure/population/native';
import { createNativeRemoteInfrastructureFeature } from './remotes/infrastructure/feature';
import { createConstructionReservationLedger } from './native-construction';
import { createNativeRemoteWorkers, remoteFleetDefinitions } from './remotes/fleet/native';
import { createNativeRemoteManagementFeature } from './remotes/management/feature';
import { createNativeObservers } from './native-observers';
import { createNativeScouts } from './native-scouts';
import { withScoutRetirement } from './scout-retirement';
import { createNativeIntelFeature } from './native-intel';
import { createNativeConstructionFeature } from './native-construction';
import { createNativePlanningFeature } from './native-planning';
import { createNativeSupplyRecovery } from './native-supply-recovery';
import { createNativeUpgradeSupply } from './native-upgrade-supply';
import { createNativeUpgradeLifecycle } from './native-upgrade-lifecycle';
import { createNativeUpgradeParking } from './native-upgrade-parking';
import { createNativeUpgradeMaster } from './native-upgrade-master';
import { createNativeUpgradeFleet } from './native-upgrade-fleet';
import { createNativeUpgradeRoom } from './native-upgrade-room';
import { createNativeSupportFeature } from './native-support';
import { resolveConfig } from '../config/resolve';
import { createNativeRecovery } from './native-recovery';
import { createNativeWorkFeature } from './native-work';
import { createLogisticsRetirement } from './logistics-retirement';
import { createNativeLogisticsFeature } from './native-logistics';
import { createNativeDispatch } from './native-dispatch';
import { createNativeMiner } from '../adapters/screeps/mining';
import { createNativeMiningFeature } from './native-mining';
import { createCreepMaintenance } from './creep-maintenance';
import { ownedCreepRoster } from '../adapters/screeps/unit-roster';
import { createTickAdmission } from './tick-admission';
import { createMigrationGate } from './migration-gate';
import { createGameLoop } from './game-loop';
import { createPersistentConfiguration } from './persistent-configuration';
import { createGamePorts } from '../adapters/screeps/runtime';
import { createMemoryPort } from '../adapters/screeps/memory';

export interface NativeBotOptions { remoteBirths?: RemoteFleetBirthPolicy; spawnEnergyPolicy?: typeof explicitSpawnEnergyPolicy }
/** One composition root; injected planning policy shares ordinary recruitment and final dispatch. */
export function createNativeBot(options: NativeBotOptions = {}) {
  const constructionLedger = createConstructionReservationLedger();
  const ports = createGamePorts();
  const state = createMemoryPort(() => Memory);
  const dispatch = createNativeDispatch(state,request => startup.admit(request) && admitReachableRemoteSpawn(state,request) && remoteWorkers.admit(request) && admitRemoteConstructionSpawn(state,request,runtimeConfig) && admitReservationSpawn(state,request,runtimeConfig) && admitRemoteWorkforceSpawn(state,request,runtimeConfig),options.spawnEnergyPolicy ? createNativeStartupEnergyAdmission(state) : undefined);
  const recovery = createNativeRecovery(state);
  const configuration = createPersistentConfiguration(state, () => ports.clock().tick);
  const runtimeConfig = (room?: string) => resolveConfig(configuration(room), Game.time).values;
  const boosts = createNativeBoosts(state,dispatch,runtimeConfig,ports);
  const startup = createNativeRemoteStartup(state,dispatch.structures,runtimeConfig);
  const observeSpawnLoad = createNativeSpawnLoadObserver(state,dispatch.structures,runtimeConfig,ports.reportFailure);
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
  const taskDefinitions = { ...mining.definitions,...logistics.definitions,...workers.definitions,...remoteFleetDefinitions,...remoteConstructionDefinitions,...reservationDefinitions };
  const remoteWorkers = createNativeRemoteWorkers(state,dispatch,runtimeConfig,taskDefinitions,startup.permit,options.remoteBirths);
  const constructionWorkers = createNativeRemoteConstructionWorkers(state,dispatch,runtimeConfig,taskDefinitions,startup.permit);
  const reservationWorkers = createNativeReservationWorkers(state,dispatch,runtimeConfig,taskDefinitions,startup.permit);
  const maintainCreeps = createCreepMaintenance(state, ownedCreepRoster, taskDefinitions, withScoutRetirement(state, createLogisticsRetirement(state), () => Game.time), unit => settleHaulingTask(state,taskDefinitions,unit,observeTransfer));
  // Gameplay registration is separate from configuration-controlled activation.
  return createGameLoop([createNativeBoostLabRoles(state), createNativeLabs(state,dispatch.structures,createNativeEmpireProduction(state,runtimeConfig)), createNativeRemoteReachabilityFeature(state,dispatch), createNativeRemoteCapacityFeature(state), scouts.feature, scouts.demand, createNativeObservers(state, dispatch.structures, ports), createNativeIntelFeature(state, ports), mining.feature, logistics.feature, workers.feature, support.feature, upgradeMaster.feature, createNativeUpgradeLifecycle(state, dispatch, runtimeConfig), createNativeUpgradeParking(state, dispatch, upgradeMaster.definitions), upgradeFleet, createNativeSupplyRecovery(state, dispatch, runtimeConfig), createNativeUpgradeSupply(state, dispatch, runtimeConfig), createNativeUpgradeRoom(state, dispatch), createNativePlanningFeature(state, runtimeConfig), createNativeConstructionFeature(state,constructionLedger), createNativeRemoteInfrastructureFeature(state,constructionLedger), createNativeRemoteManagementFeature(state,remoteWorkers.publish), remoteWorkers.recruitment, remoteWorkers.actors, constructionWorkers.recruitment, constructionWorkers.actors, reservationWorkers.recruitment, reservationWorkers.actors], {
    ...ports,
    config: configuration,
  }, boosts.before(createTickAdmission(state, createMigrationGate(state, [], ports), () => ports.clock().tick, maintainCreeps)), () => { dispatch.flush(); observeSpawnLoad(); });

}
