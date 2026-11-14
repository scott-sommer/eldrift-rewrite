export interface RuntimeConfig {
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
  workersEnabled: boolean;
  workerSpawningEnabled: boolean;
  workerBodyBudget: number;
  workerBuilderTarget: number;
  workerFortifierTarget: number;
  workerUpgraderTarget: number;
  workerMode: 'builder' | 'fortifier' | 'upgrader';
  workerWallHits: number;
  workerRampartHits: number;
  workerDowngradeThreshold: number;
  workerUpgradeReserve: number;
  workerEnergyStorageReserve: number;
  workerEnergyProfile: 'balanced' | 'builder' | 'fortifier' | 'upgrader' | 'upgrader-v2';
  workerHoldStoragePosition: boolean;
  controllerContainerTarget: number;
  energyBankingEnabled: boolean;
  storeBalancingEnabled: boolean;
  storeBalanceMinimumEnergyFraction: number;
  terminalEnergyLow: number;
  terminalEnergyHigh: number;
  storageEnergyReserve: number;
  towerRefillFraction: number;
  preservationEnabled: boolean;
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
  workersEnabled: false,
  workerSpawningEnabled: false,
  workerBodyBudget: 1000,
  workerBuilderTarget: 0,
  workerFortifierTarget: 0,
  workerUpgraderTarget: 0,
  workerMode: 'builder',
  workerWallHits: 50000,
  workerRampartHits: 50000,
  workerDowngradeThreshold: 5000,
  workerUpgradeReserve: 50000,
  workerEnergyStorageReserve: 50000,
  workerEnergyProfile: 'balanced',
  workerHoldStoragePosition: false,
  controllerContainerTarget: 1900,
  energyBankingEnabled: false,
  storeBalancingEnabled: false,
  storeBalanceMinimumEnergyFraction: 0.75,
  terminalEnergyLow: 20000,
  terminalEnergyHigh: 30000,
  storageEnergyReserve: 70000,
  towerRefillFraction: 0.4,
  preservationEnabled: false,
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





