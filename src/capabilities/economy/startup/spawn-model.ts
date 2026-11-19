import type { SpawnRequest, UnaffordablePolicy } from '../../spawning/request';
import type { StartupCashForecast, StartupCashInput, StartupCashFlow } from './cash-model';
export interface StartupSpawnSlot { id: string; room: string; availableAt: number }
export interface StartupSpawnInput {
  room: string; requests: readonly SpawnRequest[]; spawns: readonly StartupSpawnSlot[];
  liveNames: ReadonlySet<string>; unaffordable: UnaffordablePolicy;
  /** All relative dates use the same frame zero; external flows must not include births. */
  /** Caller must establish spawn-accessible funding; storage redistribution and room capacity are not inferred. */
  cash: StartupCashInput;
}
export interface StartupScheduledBirth {
  request: string; spawn: string; startAt: number; activeAt: number; cost: number;
}
export interface StartupSpawnForecast {
  births: StartupScheduledBirth[];
  unscheduled: { request: string; reason: 'live-name' | 'expired' | 'horizon' }[];
  flows: StartupCashFlow[]; cash: StartupCashForecast;
}
