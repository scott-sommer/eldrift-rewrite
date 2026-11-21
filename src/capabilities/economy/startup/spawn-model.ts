import type { StartupEnergyLayout } from './energy/model';
import type { SpawnRequest, UnaffordablePolicy } from '../../spawning/request';
import type { StartupCashForecast, StartupCashInput, StartupCashFlow } from './cash-model';
export interface StartupSpawnSlot { id: string; room: string; availableAt: number }
export interface StartupSpawnFunding {
  capacity: number; initialEnergy: number;
  energyLayout?: StartupEnergyLayout;
  /** Internal bank-to-spawn transfers settle after admission, before same-frame external receipts. */
  refills: readonly Omit<StartupCashFlow,'kind'>[];
}
export interface StartupSpawnInput {
  room: string; requests: readonly SpawnRequest[]; spawns: readonly StartupSpawnSlot[];
  liveNames: ReadonlySet<string>; unaffordable: UnaffordablePolicy;
  funding: StartupSpawnFunding;
  /** Shared frame zero; total home bank includes spawn energy; external flows exclude births. */
  cash: StartupCashInput;
}
export interface StartupScheduledBirth {
  request: string; spawn: string; startAt: number; activeAt: number; cost: number;
}
export interface StartupSpawnForecast {
  births: StartupScheduledBirth[];
  unscheduled: { request: string; reason: 'live-name' | 'expired' | 'horizon' }[];
  flows: StartupCashFlow[]; cash: StartupCashForecast;
  funding: { endingSpawnEnergy: number; refilledEnergy: number; unfilledEnergy: number };
}
