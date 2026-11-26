import { startupConstructionWaves } from './construction-workers';
import { startupDeliveryCouriers } from './delivery-couriers';
import { validateStartupInitial } from './initial-validation';
import type { StartupDeliveryInput, StartupCourierState } from './delivery-model';
import type { StartupBuildWave } from './construction-model';
import type { StartupScheduledBirth } from './spawn-model';
/** Existing lives are service intervals, never synthetic zero-price scheduled births. */
export function startupProjectWaves(input: StartupDeliveryInput, births: readonly StartupScheduledBirth[]): StartupBuildWave[] {
  const waves = startupConstructionWaves(input.project,births), miner = input.initial?.miner;
  if (miner) {
    const endAt = Math.min(input.project.spawning.cash.horizon+1,miner.expiresAt-miner.retireTicks);
    if (miner.availableAt < endAt) waves.push({ request: miner.id,startAt: miner.availableAt,endAt,carryCapacity: miner.body.filter(part => part === 'carry').length*50,
      harvestPower: miner.body.filter(part => part === 'work').length*2,buildPower: miner.body.filter(part => part === 'work').length*5 });
  }
  waves.sort((a,b) => a.startAt-b.startAt || a.request.localeCompare(b.request));
  if (waves.some((wave,index) => index > 0 && wave.startAt < waves[index-1]!.endAt)) throw new Error('Overlapping incumbent/future miners require a handoff');
  return waves;
}
export function startupInitialCouriers(input: StartupDeliveryInput): StartupCourierState[] {
  return (input.initial?.couriers ?? []).map(worker => ({ request: worker.id,outboundTicks: worker.outboundTicks,returnTicks: worker.returnTicks,initialOutboundTicks: 0,
    ...(worker.turnaroundTicks === undefined ? {} : { turnaroundTicks: worker.turnaroundTicks }),retireTicks: worker.retireTicks,minimumBatch: worker.minimumBatch,collectionTicks: worker.collectionTicks,deliveryTicks: worker.deliveryTicks,
    capacity: worker.body.filter(part => part === 'carry').length*50,expiresAt: worker.expiresAt,stopAt: worker.mode === 'return-only' ? 0 : worker.expiresAt-worker.retireTicks,
    nextAt: worker.availableAt,phase: worker.phase,cargo: worker.energy }));
}
export function startupProjectCouriers(input: StartupDeliveryInput, births: readonly StartupScheduledBirth[]): StartupCourierState[] {
  return [...startupInitialCouriers(input),...startupDeliveryCouriers(input,births)].sort((a,b) => a.request.localeCompare(b.request));
}
export function startupOpeningEnergy(input: StartupDeliveryInput): number {
  const initial = input.initial;
  return initial ? initial.containerEnergy+(initial.miner?.energy ?? 0)+initial.couriers.reduce((sum,worker) => sum+worker.energy,0) : 0;
}
export function normalizeStartupOpening(input: StartupDeliveryInput): StartupDeliveryInput {
  validateStartupInitial(input);
  if (input.initial === undefined && input.project.spawning.cash.openingAssets === undefined) return input;
  const energy = startupOpeningEnergy(input), declared = input.project.spawning.cash.openingAssets;
  if (declared !== undefined && declared !== energy) throw new Error('Startup opening asset benchmark must match observed inventory');
  return { ...input,project: { ...input.project,spawning: { ...input.project.spawning,cash: { ...input.project.spawning.cash,openingAssets: energy } } } };
}
