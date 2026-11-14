export interface RuntimeConfig {
  logisticsEnabled: boolean;
  courierSpawningEnabled: boolean;
  courierBodyBudget: number;
  energyRequestsEnabled: boolean;
  preservationEnabled: boolean;
  miningEnabled: boolean;
  mineralMiningEnabled: boolean;
  miningBodyBudget: number;
  backgroundEnabled: boolean;
  backgroundCpuFraction: number;
  minimumBucket: number;
  layoutStrategy: 'auto' | 'standard' | 'constrained' | 'stamps';
  allies: readonly string[];
}
export const defaults: Readonly<RuntimeConfig> = Object.freeze({
  logisticsEnabled: false,
  courierSpawningEnabled: false,
  courierBodyBudget: 300,
  energyRequestsEnabled: false,
  preservationEnabled: false,
  miningEnabled: false,
  mineralMiningEnabled: false,
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





