import { snapshotLabBoostValue } from './lab-boost-roles';
import { workerBoostValidators } from './worker-boosts';
import { snapshotLabProductionValue } from './lab-production';
import { labValidators } from './labs';
import { remoteValidators } from './remotes';
import { observerValidators, validateObserverScope } from './observers';
import { scoutValidators } from './scouts';
import { intelValidators, validateIntelScope } from './intel';
import { constructionValidators } from './construction';
import { planningValidators } from './planning';
import type { ConfigKey, RuntimeConfig } from './model';
function bounded(value: unknown, maximum: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum;
}
const validators: { [K in ConfigKey]: (value: unknown) => boolean } = {
  ...workerBoostValidators, ...labValidators, ...remoteValidators, ...planningValidators, ...constructionValidators, ...intelValidators, ...scoutValidators, ...observerValidators,
  recoverySupportEnabled: value => typeof value === 'boolean',
  recoverySupportReserve: value => bounded(value, 1300000) && Number.isInteger(value),
  recoverySupportBodyBudget: value => bounded(value, 2600) && Number.isInteger(value) && Number(value) >= 100,
  recoverySupportTravelTicks: value => bounded(value, 1400) && Number.isInteger(value),
  recoverySupportLifetime: value => bounded(value, 100000) && Number.isInteger(value) && Number(value) >= 1,
  distributorSpawningEnabled: value => typeof value === 'boolean',
  distributorTarget: value => bounded(value, 20) && Number.isInteger(value),
  distributorBodyBudget: value => bounded(value, 2100) && Number.isInteger(value) && Number(value) >= 150,
  recoveryDistributorRestartEnergy: value => bounded(value, 1300000) && Number.isInteger(value),
  upgradeLifecycleEnabled: value => typeof value === 'boolean',
  upgradeCycleAtRcl8: value => typeof value === 'boolean',
  upgradeClaimerMinimumTtl: value => bounded(value, 599) && Number.isInteger(value) && Number(value) >= 5,
  recoveryEnabled: value => typeof value === 'boolean',
  recoveryEconomyEnabled: value => typeof value === 'boolean',
  recoveryScavengerEnabled: value => typeof value === 'boolean',
  recoveryScavengerBodyBudget: value => bounded(value, 1600) && Number.isInteger(value) && Number(value) >= 100,
  recoveryMiningBodyBudget: value => bounded(value, 10000) && Number.isInteger(value) && Number(value) >= 200,
  recoveryCourierBodyBudget: value => bounded(value, 2600) && Number.isInteger(value) && Number(value) >= 100,
  recoveryInterval: value => bounded(value, 100000) && Number.isInteger(value) && Number(value) >= 1,
  recoveryEnterEnergy: value => bounded(value, 1300000) && Number.isInteger(value),
  recoveryExitEnergy: value => bounded(value, 1300000) && Number.isInteger(value),
  recoveryDonorMinimumEnergy: value => bounded(value, 1300000) && Number.isInteger(value),
  recoveryDonorMaximumDistance: value => bounded(value, 100) && Number.isInteger(value),
  recoverySupportBatch: value => bounded(value, 1300000) && Number.isInteger(value) && Number(value) >= 1,
  mineralTransportEnabled: value => typeof value === 'boolean',
  terminalFreeReserve: value => bounded(value, 300000) && Number.isInteger(value),
  storageFreeReserve: value => bounded(value, 1000000) && Number.isInteger(value),
  mineralMiningEnabled: value => typeof value === 'boolean',
  storeBalanceMinimumEnergyFraction: value => bounded(value, 1),
  storeBalancingEnabled: value => typeof value === 'boolean',
  terminalEnergyLow: value => bounded(value, 300000) && Number.isInteger(value),
  terminalEnergyHigh: value => bounded(value, 300000) && Number.isInteger(value),
  storageEnergyReserve: value => bounded(value, 1000000) && Number.isInteger(value),
  energyBankingEnabled: value => typeof value === 'boolean',
  upgradeLabMineralTarget: value => bounded(value, 3000) && Number.isInteger(value) && Number(value) >= 1,
  upgradeSpawnEnergyFloor: value => bounded(value, 300) && Number.isInteger(value),
  upgradeStorageEnergyCeiling: value => bounded(value, 1000000) && Number.isInteger(value),
  upgradeServiceBatch: value => bounded(value, 1000000) && Number.isInteger(value) && Number(value) >= 1,
  upgradeMasterEnabled: value => typeof value === 'boolean',
  upgradeMasterSpawningEnabled: value => typeof value === 'boolean',
  upgradeMasterStorageThreshold: value => bounded(value, 1000000) && Number.isInteger(value),
  upgradeMasterRenewBelow: value => bounded(value, 1400) && Number.isInteger(value),
  upgradeSupplyEnabled: value => typeof value === 'boolean',
  upgradeSupplySpawningEnabled: value => typeof value === 'boolean',
  upgradeSupplyTarget: value => bounded(value, 8) && Number.isInteger(value),
  upgradeSupplyReserve: value => bounded(value, 1300000) && Number.isInteger(value),
  upgradeRoomSpawningEnabled: value => typeof value === 'boolean',
  upgradeRoomSponsor: value => typeof value === 'string' && (value === '' || /^[WE]\d+[NS]\d+$/.test(value)),
  upgradeFleetTarget: value => bounded(value, 7) && Number.isInteger(value),
  upgradeFleetBodyBudget: value => bounded(value, 4600) && Number.isInteger(value),
  upgradeFleetStartEnergy: value => bounded(value, 1000000000) && Number.isInteger(value),
  upgradeFleetStopEnergy: value => bounded(value, 1000000000) && Number.isInteger(value),
  upgradeFleetStorageFloor: value => bounded(value, 1000000) && Number.isInteger(value),
  upgradeBootstrapDismantleEnabled: value => typeof value === 'boolean',
  upgradeRoomEnabled: value => typeof value === 'boolean',
  upgradeRoomEmpireReserve: value => bounded(value, 1000000000) && Number.isInteger(value),
  upgradeRoomOtherReserve: value => bounded(value, 1000000000) && Number.isInteger(value),
  upgradeRoomServiceEnabled: value => typeof value === 'boolean',
  workersEnabled: value => typeof value === 'boolean',
  workerSpawningEnabled: value => typeof value === 'boolean',
  workerBodyBudget: value => bounded(value, 12900) && Number.isInteger(value),
  workerBuilderTarget: value => bounded(value, 50) && Number.isInteger(value),
  workerFortifierTarget: value => bounded(value, 50) && Number.isInteger(value),
  workerUpgraderTarget: value => bounded(value, 50) && Number.isInteger(value),
  workerMode: value => typeof value === 'string' && ['builder', 'fortifier', 'upgrader'].includes(value),
  workerFortificationProfile: value => value === 'fixed' || value === 'legacy',
  workerFortificationCeiling: value => bounded(value, 300000000) && Number.isInteger(value),
  workerWallHits: value => bounded(value, 300000000) && Number.isInteger(value),
  workerRampartHits: value => bounded(value, 300000000) && Number.isInteger(value),
  workerDowngradeThreshold: value => bounded(value, 200000) && Number.isInteger(value),
  workerEnergyProfile: value => typeof value === 'string' && ['balanced', 'builder', 'fortifier', 'upgrader', 'upgrader-v2'].includes(value),
  workerCargoDropFallback: value => typeof value === 'boolean',
  workerHoldStoragePosition: value => typeof value === 'boolean',
  workerEnergyStorageReserve: value => bounded(value, 1000000) && Number.isInteger(value),
  workerUpgradeApproachRange: value => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 3,
  workerUpgradeReserve: value => bounded(value, 1000000) && Number.isInteger(value),
  workerSupplyEnabled: value => typeof value === 'boolean',
  controllerContainerTarget: value => bounded(value, 2000) && Number.isInteger(value),
  energyReclamationEnabled: value => typeof value === 'boolean',
  energyRequestsEnabled: value => typeof value === 'boolean',
  towerRefillFraction: value => bounded(value, 1),
  preservationEnabled: value => typeof value === 'boolean',
  preservationEnergyOnly: value => typeof value === 'boolean',
  courierSpawningEnabled: value => typeof value === 'boolean',
  courierBodyBudget: value => bounded(value, 2600) && Number.isInteger(value) && Number(value) >= 100,
  logisticsEnabled: value => typeof value === 'boolean',
  linksEnabled: value => typeof value === 'boolean',
  linkServiceEnabled: value => typeof value === 'boolean',
  linkStorageTarget: value => bounded(value, 1),
  linkControllerTrigger: value => bounded(value, 1),
  linkStorageAssistTrigger: value => bounded(value, 1),
  linkRelayTrigger: value => bounded(value, 800) && Number.isInteger(value),
  miningEnabled: value => typeof value === 'boolean',
  miningBodyBudget: value => bounded(value, 10000) && Number.isInteger(value) && Number(value) >= 200,
  backgroundEnabled: value => typeof value === 'boolean',
  backgroundCpuFraction: value => bounded(value, 1),
  minimumBucket: value => bounded(value, 10000) && Number.isInteger(value),
  layoutStrategy: value => ['auto', 'standard', 'constrained', 'stamps'].includes(String(value)) && typeof value === 'string',
  allies: value => Array.isArray(value) && value.every(name => typeof name === 'string' && name.trim().length > 0),
};
export function validatePatch(input: unknown, layer: string): Partial<RuntimeConfig> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`${layer}: expected configuration object`);
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(validators, key)) throw new Error(`${layer}.${key}: unknown configuration key`);
    validateIntelScope(key, layer);
    validateObserverScope(key, layer);
    if (!validators[key as ConfigKey](value)) throw new Error(`${layer}.${key}: invalid value`);
    const snapshot = snapshotLabBoostValue(key,snapshotLabProductionValue(key,value));
    patch[key] = Array.isArray(snapshot) ? Object.freeze([...snapshot]) : snapshot;
  }
  return patch;
}





