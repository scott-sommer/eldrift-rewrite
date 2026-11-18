import type { RemoteEconomicsInput, RemoteEconomics } from './remote-model';
export function validateRemoteEconomics(input: RemoteEconomicsInput): void {
  nonnegative([input.capacity, input.infrastructurePerTick, input.riskPerTick,
    input.reservation.energyPerTick, input.reservation.spawnLoad,
    input.limits.maximumSpawnLoad, input.limits.minimumNetYield,
    input.hauler.outboundTicks, input.hauler.returnTicks]);
  positive([input.regenerationTicks, input.harvestPower, input.hauler.serviceTicks]);
  if (!Number.isSafeInteger(input.reservation.shares) || input.reservation.shares < 1) throw new Error('Invalid reservation allocation');
  if (!Number.isSafeInteger(input.limits.maximumHaulers) || input.limits.maximumHaulers < 0 || input.limits.maximumHaulers > 1000) {
    throw new Error('Invalid remote hauler budget');
  }
}
export function validateEconomicResult(result: RemoteEconomics): void {
  const values = [result.sourceRate, result.harvestRate, result.deliveredRate, result.netRate, result.tripTicks,
    result.requiredHaulers, result.haulers, ...Object.values(result.energy), ...Object.values(result.spawn)];
  if (!values.every(Number.isFinite)) throw new Error('Non-finite remote economics');
}
function nonnegative(values: readonly number[]): void {
  if (!values.every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid remote economic rate');
}
function positive(values: readonly number[]): void {
  if (!values.every(value => Number.isFinite(value) && value > 0)) throw new Error('Invalid remote economic duration or power');
}
