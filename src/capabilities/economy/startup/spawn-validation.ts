import { validateRequest } from '../../spawning/allocate';
import { validateStartupCash } from './cash-validation';
import type { StartupSpawnInput } from './spawn-model';
export function validateStartupSpawns(input: StartupSpawnInput): void {
  validateStartupCash(input.cash);
  if (!input.room || !['wait','skip'].includes(input.unaffordable)) throw new Error('Invalid startup spawn policy');
  if (input.requests.length > 64 || input.spawns.length > 16 || input.cash.flows.length+input.requests.length > 128) throw new Error('Startup spawn capacity');
  if (input.cash.flows.some(flow => flow.kind === 'birth')) throw new Error('Startup births must come from scheduled requests');
  unique(input.spawns.map(spawn => spawn.id)); unique(input.requests.map(request => request.id)); unique(input.requests.map(request => request.name));
  validateSlots(input); validateRequests(input); validateFunding(input);
  const ids = [...input.cash.flows.map(flow => flow.id),...input.requests.map(request => 'birth:'+request.id)];
  unique(ids);
}
function validateSlots(input: StartupSpawnInput): void {
  for (const spawn of input.spawns) {
    if (spawn.room !== input.room || !Number.isSafeInteger(spawn.availableAt) || spawn.availableAt < 0 || spawn.availableAt > 10000) throw new Error('Invalid startup spawn slot');
  }
}
function validateRequests(input: StartupSpawnInput): void {
  for (const request of input.requests) {
    validateRequest(request);
    if (request.room !== input.room || request.id.length > 240) throw new Error('Invalid startup request room/identity');
  }
}

function unique(ids: readonly string[]): void {
  if (ids.some(id => typeof id !== 'string' || !id.length) || new Set(ids).size !== ids.length) throw new Error('Duplicate/invalid startup spawn identity');
}

function validateFunding(input: StartupSpawnInput): void {
  const funding = input.funding;
  if (![funding.capacity,funding.initialEnergy].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000)) throw new Error('Invalid startup spawn energy');
  if (funding.initialEnergy > Math.min(funding.capacity,input.cash.homeEnergy) || funding.refills.length > 64) throw new Error('Invalid startup spawn funding');
  validateStartupCash({ ...input.cash,flows: funding.refills.map(flow => ({ ...flow,kind: 'delivery' })) });
}
