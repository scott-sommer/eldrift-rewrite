import { StartupCheckpointCapacityError } from '../checkpoints/capacity';
import { snapshotStartupSpawns } from '../snapshot';
import { validateStartupSpawns } from '../spawn-validation';
import { validateHouseholdStructures } from './structures';
import { validateRedistribution } from '../redistribution/validation';
import type { StartupHouseholdInput } from './model';
export function householdIdentity(input: StartupHouseholdInput): string {
  const spawning = snapshotStartupSpawns(input.spawning);
  const identity = JSON.stringify({ ...input,spawning: { ...spawning,liveNames: [...spawning.liveNames].sort() } },(_key,value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b))) : value);
  if (identity.length > 262144) throw new StartupCheckpointCapacityError('Household input identity capacity');
  return identity;
}
export function validateHousehold(input: StartupHouseholdInput): void {
  validateStartupSpawns(input.spawning); validateRedistribution(input.redistribution);
  validateHouseholdStructures(input);
  if (input.spawning.funding.refills.length || input.spawning.cash.horizon !== input.redistribution.horizon) throw new Error('Conflicting household refill strategy/horizon');
  if (!Number.isSafeInteger(input.endpointEnergy) || input.endpointEnergy < 0 || input.endpointEnergy > input.spawning.cash.homeEnergy-input.spawning.funding.initialEnergy) throw new Error('Invalid household endpoint stock');
  if (input.spawning.cash.flows.some(flow => flow.id.startsWith('household-loss:'))) throw new Error('Reserved household loss identity');
  input.redistribution.trips.forEach(trip => {
    const request = input.spawning.requests.find(request => request.id === trip.request);
    if (!request || !request.body.includes('carry') || !request.body.includes('move') || request.body.some(part => !['carry','move'].includes(part))) throw new Error('Household worker requires paid courier request');
  });
}

export function householdCheckpointFormat(input: StartupHouseholdInput): 1 | 2 {
  return input.spawning.funding.energyLayout ? 2 : 1;
}
