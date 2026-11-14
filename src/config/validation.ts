import type { ConfigKey, RuntimeConfig } from './model';
function bounded(value: unknown, maximum: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum;
}
const validators: { [K in ConfigKey]: (value: unknown) => boolean } = {
  mineralTransportEnabled: value => typeof value === 'boolean',
  terminalFreeReserve: value => bounded(value, 300000) && Number.isInteger(value),
  storageFreeReserve: value => bounded(value, 1000000) && Number.isInteger(value),
  mineralMiningEnabled: value => typeof value === 'boolean',
  storeBalancingEnabled: value => typeof value === 'boolean',
  terminalEnergyLow: value => bounded(value, 300000) && Number.isInteger(value),
  terminalEnergyHigh: value => bounded(value, 300000) && Number.isInteger(value),
  storageEnergyReserve: value => bounded(value, 1000000) && Number.isInteger(value),
  energyBankingEnabled: value => typeof value === 'boolean',
  energyRequestsEnabled: value => typeof value === 'boolean',
  towerRefillFraction: value => bounded(value, 1),
  preservationEnabled: value => typeof value === 'boolean',
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
    if (!validators[key as ConfigKey](value)) throw new Error(`${layer}.${key}: invalid value`);
    patch[key] = Array.isArray(value) ? Object.freeze([...value]) : value;
  }
  return patch;
}





