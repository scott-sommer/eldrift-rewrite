import type { NativeStartupFacts } from '../facts-model';
import type { CompleteStartupTravel } from '../../../../features/remotes/startup/selection-model';
import type { SpawnRequest, UnaffordablePolicy } from '../../../../capabilities/spawning/request';
import type { StartupDeliveryInput } from '../../../../capabilities/economy/startup/delivery-model';
import type { StartupCashFlow } from '../../../../capabilities/economy/startup/cash-model';
import type { StartupSpawnFunding } from '../../../../capabilities/economy/startup/spawn-model';
import type { StartupSinkInput } from '../../../../capabilities/economy/startup/sink';
import type { MiningRepairPolicy } from '../../../../capabilities/mining/repair-policy';
export interface NativeStartupQuote extends CompleteStartupTravel { observedAt: number; facts: NativeStartupFacts }
/** Request ready/expiry clocks are offsets from this observation, never absolute game ticks. */
export type StartupBirthProposal = { request: SpawnRequest; retireTicks: number } & ({ kind: 'miner' } | { kind: 'courier'; minimumBatch: number });
export interface NativeStartupProjectionOptions {
  horizon: number; protectedEnergy: number; births: readonly StartupBirthProposal[]; unaffordable: UnaffordablePolicy;
  repairPolicy: Readonly<MiningRepairPolicy> | null;
  refills: StartupSpawnFunding['refills']; householdFlows: readonly StartupCashFlow[]; sinkChanges: StartupSinkInput['changes'];
}
export type NativeStartupProjection =
  | { status: 'ready'; observedAt: number; quoteIdentity: string; costScope: 'prospective'; input: StartupDeliveryInput }
  | { status: 'deferred'; reason: string };
