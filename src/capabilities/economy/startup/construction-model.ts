import type { SelfBuildInput, SelfBuildForecast } from './build-model';
import type { StartupSpawnInput } from './spawn-model';
export interface StartupConstructionWorker { request: string; travelTicks: number; retireTicks: number }
export interface StartupConstructionInput {
  spawning: StartupSpawnInput; workers: readonly StartupConstructionWorker[];
  remainingProgress: number; source: SelfBuildInput['source'];
}
export interface StartupBuildWave {
  request: string; startAt: number; endAt: number; carryCapacity: number; harvestPower: number; buildPower: number;
}
export interface StartupConstructionForecast {
  status: 'complete' | 'incomplete'; completeAt: number | null; remainingProgress: number;
  harvestedEnergy: number; overflowEnergy: number; constructionEnergy: number; regeneratedEnergy: number; unusedCargoEnergy: number;
  /** Source/cargo projection stops here, rather than advancing silently to the cash horizon. */
  projectedThrough: number; source: SelfBuildInput['source'];
  waves: { request: string; startAt: number; endAt: number; work: SelfBuildForecast }[];
}
