import type { SelfBuildInput } from './build-model';
export function validateSelfBuild(input: SelfBuildInput): void {
  if (![input.remainingProgress,input.carriedEnergy,input.carryCapacity,input.harvestPower,input.buildPower].every(bounded)) throw new Error('Invalid self-build worker/work bounds');
  if (input.carryCapacity === 0 || input.carriedEnergy > input.carryCapacity) throw new Error('Self-build requires carried-energy capacity');
  if (!bounded(input.maximumTicks) || input.maximumTicks > 1500) throw new Error('Self-build exceeds one bounded worker interval');
  validateSource(input.source);
}
function validateSource(source: SelfBuildInput['source']): void {
  if (![source.energy,source.capacity,source.regenerationTicks].every(bounded) || source.capacity === 0 || source.regenerationTicks === 0 || source.energy > source.capacity) throw new Error('Invalid self-build source');
  if (source.regenerationIn !== null && (!bounded(source.regenerationIn) || source.regenerationIn > source.regenerationTicks)) throw new Error('Invalid self-build regeneration phase');
}
function bounded(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000; }
