import { remoteDefaults } from './remotes';
import type { RemoteConfig } from './remotes';
import { observerDefaults } from './observers';
import type { ObserverConfig } from './observers';
import { scoutDefaults } from './scouts';
import type { ScoutConfig } from './scouts';
import { intelDefaults } from './intel';
import type { IntelConfig } from './intel';
import { constructionDefaults } from './construction';
import type { ConstructionConfig } from './construction';
import { planningDefaults } from './planning';
import type { PlanningConfig } from './planning';
export interface RuntimeConfig extends RemoteConfig, PlanningConfig, ConstructionConfig, IntelConfig, ScoutConfig, ObserverConfig {
  recoverySupportEnabled: boolean;
  recoverySupportReserve: number;
  recoverySupportBodyBudget: number;
  recoverySupportTravelTicks: number;
  recoverySupportLifetime: number;
  distributorSpawningEnabled: boolean;
  distributorTarget: number;
  distributorBodyBudget: number;
  recoveryDistributorRestartEnergy: number;
  upgradeLifecycleEnabled: boolean;
  upgradeCycleAtRcl8: boolean;
  upgradeClaimerMinimumTtl: number;
  recoveryEnabled: boolean;
  recoveryEconomyEnabled: boolean;
  recoveryScavengerEnabled: boolean;
  recoveryScavengerBodyBudget: number;
  recoveryMiningBodyBudget: number;
  recoveryCourierBodyBudget: number;
  recoveryInterval: number;
  recoveryEnterEnergy: number;
  recoveryExitEnergy: number;
  recoveryDonorMinimumEnergy: number;
  recoveryDonorMaximumDistance: number;
  recoverySupportBatch: number;
  logisticsEnabled: boolean;
  linksEnabled: boolean;
  linkServiceEnabled: boolean;
  linkStorageTarget: number;
  linkControllerTrigger: number;
  linkStorageAssistTrigger: number;
  linkRelayTrigger: number;
  courierSpawningEnabled: boolean;
  courierBodyBudget: number;
  energyRequestsEnabled: boolean;
  energyReclamationEnabled: boolean;
  workerSupplyEnabled: boolean;
  upgradeMasterEnabled: boolean;
  upgradeMasterSpawningEnabled: boolean;
  upgradeMasterRenewBelow: number;
  upgradeMasterStorageThreshold: number;
  upgradeSupplyEnabled: boolean;
  upgradeSupplySpawningEnabled: boolean;
  upgradeSupplyTarget: number;
  upgradeSupplyReserve: number;
  upgradeRoomSpawningEnabled: boolean;
  upgradeRoomSponsor: string;
  upgradeFleetTarget: number;
  upgradeFleetBodyBudget: number;
  upgradeFleetStartEnergy: number;
  upgradeFleetStopEnergy: number;
  upgradeFleetStorageFloor: number;
  upgradeBootstrapDismantleEnabled: boolean;
  upgradeRoomEnabled: boolean;
  upgradeRoomEmpireReserve: number;
  upgradeRoomOtherReserve: number;
  upgradeRoomServiceEnabled: boolean;
  upgradeLabMineralTarget: number;
  upgradeSpawnEnergyFloor: number;
  upgradeStorageEnergyCeiling: number;
  upgradeServiceBatch: number;
  workersEnabled: boolean;
  workerSpawningEnabled: boolean;
  workerBodyBudget: number;
  workerBuilderTarget: number;
  workerFortifierTarget: number;
  workerUpgraderTarget: number;
  workerMode: 'builder' | 'fortifier' | 'upgrader';
  workerFortificationProfile: 'fixed' | 'legacy';
  workerFortificationCeiling: number;
  workerWallHits: number;
  workerRampartHits: number;
  workerDowngradeThreshold: number;
  workerUpgradeReserve: number;
  workerUpgradeApproachRange: number;
  workerEnergyStorageReserve: number;
  workerEnergyProfile: 'balanced' | 'builder' | 'fortifier' | 'upgrader' | 'upgrader-v2';
  workerHoldStoragePosition: boolean;
  workerCargoDropFallback: boolean;
  controllerContainerTarget: number;
  energyBankingEnabled: boolean;
  storeBalancingEnabled: boolean;
  storeBalanceMinimumEnergyFraction: number;
  terminalEnergyLow: number;
  terminalEnergyHigh: number;
  storageEnergyReserve: number;
  towerRefillFraction: number;
  preservationEnabled: boolean;
  preservationEnergyOnly: boolean;
  miningEnabled: boolean;
  mineralMiningEnabled: boolean;
  mineralTransportEnabled: boolean;
  terminalFreeReserve: number;
  storageFreeReserve: number;
  miningBodyBudget: number;
  backgroundEnabled: boolean;
  backgroundCpuFraction: number;
  minimumBucket: number;
  layoutStrategy: 'auto' | 'standard' | 'constrained' | 'stamps';
  allies: readonly string[];
}
export const defaults: Readonly<RuntimeConfig> = Object.freeze({
  ...remoteDefaults, ...planningDefaults, ...constructionDefaults, ...intelDefaults, ...scoutDefaults, ...observerDefaults,
  recoverySupportEnabled: true,
  recoverySupportReserve: 0,
  recoverySupportBodyBudget: 2600,
  recoverySupportTravelTicks: 200,
  recoverySupportLifetime: 1500,
  distributorSpawningEnabled: false,
  distributorTarget: 1,
  distributorBodyBudget: 2100,
  recoveryDistributorRestartEnergy: 12500,
  upgradeLifecycleEnabled: false,
  upgradeCycleAtRcl8: false,
  upgradeClaimerMinimumTtl: 50,
  recoveryEnabled: false,
  recoveryEconomyEnabled: true,
  recoveryScavengerEnabled: true,
  recoveryScavengerBodyBudget: 1600,
  recoveryMiningBodyBudget: 200,
  recoveryCourierBodyBudget: 100,
  recoveryInterval: 250,
  recoveryEnterEnergy: 10000,
  recoveryExitEnergy: 50000,
  recoveryDonorMinimumEnergy: 75000,
  recoveryDonorMaximumDistance: 4,
  recoverySupportBatch: 25000,
  logisticsEnabled: false,
  linksEnabled: false,
  linkServiceEnabled: false,
  linkStorageTarget: 0.75,
  linkControllerTrigger: 0.75,
  linkStorageAssistTrigger: 0.5,
  linkRelayTrigger: 500,
  courierSpawningEnabled: false,
  courierBodyBudget: 300,
  energyRequestsEnabled: false,
  energyReclamationEnabled: false,
  workerSupplyEnabled: false,
  upgradeMasterEnabled: false,
  upgradeMasterSpawningEnabled: false,
  upgradeMasterRenewBelow: 500,
  upgradeMasterStorageThreshold: 260000,
  upgradeSupplyEnabled: false,
  upgradeSupplySpawningEnabled: false,
  upgradeSupplyTarget: 8,
  upgradeSupplyReserve: 0,
  upgradeRoomSpawningEnabled: false,
  upgradeRoomSponsor: '',
  upgradeFleetTarget: 7,
  upgradeFleetBodyBudget: 4600,
  upgradeFleetStartEnergy: 10000000,
  upgradeFleetStopEnergy: 5000000,
  upgradeFleetStorageFloor: 200000,
  upgradeBootstrapDismantleEnabled: true,
  upgradeRoomEnabled: false,
  upgradeRoomEmpireReserve: 2600000,
  upgradeRoomOtherReserve: 100000,
  upgradeRoomServiceEnabled: false,
  upgradeLabMineralTarget: 1300,
  upgradeSpawnEnergyFloor: 100,
  upgradeStorageEnergyCeiling: 990000,
  upgradeServiceBatch: 200,
  workersEnabled: false,
  workerSpawningEnabled: false,
  workerBodyBudget: 1000,
  workerBuilderTarget: 0,
  workerFortifierTarget: 0,
  workerUpgraderTarget: 0,
  workerMode: 'builder',
  workerFortificationProfile: 'fixed',
  workerFortificationCeiling: 0,
  workerWallHits: 50000,
  workerRampartHits: 50000,
  workerDowngradeThreshold: 5000,
  workerUpgradeReserve: 50000,
  workerUpgradeApproachRange: 2,
  workerEnergyStorageReserve: 50000,
  workerEnergyProfile: 'balanced',
  workerHoldStoragePosition: false,
  workerCargoDropFallback: true,
  controllerContainerTarget: 1900,
  energyBankingEnabled: false,
  storeBalancingEnabled: false,
  storeBalanceMinimumEnergyFraction: 0.75,
  terminalEnergyLow: 20000,
  terminalEnergyHigh: 30000,
  storageEnergyReserve: 70000,
  towerRefillFraction: 0.4,
  preservationEnabled: false,
  preservationEnergyOnly: false,
  miningEnabled: false,
  mineralMiningEnabled: false,
  mineralTransportEnabled: false,
  terminalFreeReserve: 50000,
  storageFreeReserve: 50000,
  miningBodyBudget: 800,
  backgroundEnabled: true,
  backgroundCpuFraction: 0.5,
  minimumBucket: 1000,
  layoutStrategy: 'auto',
  allies: Object.freeze([]),
});
export type ConfigKey = keyof RuntimeConfig;
export type ConfigLayer = 'defaults' | 'environment' | 'empire' | 'roomProfile' | 'roomOverride' | 'temporary';
export interface ConfigInput {
  environment?: unknown;
  empire?: unknown;
  roomProfile?: unknown;
  roomOverride?: unknown;
  temporary?: { expiresAt: number; values: unknown };
}
export interface EffectiveConfig {
  values: Readonly<RuntimeConfig>;
  sources: Readonly<Record<ConfigKey, ConfigLayer>>;
}





