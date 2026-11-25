import { readLaborCheckpoint } from './labor/checkpoint';
import { laborConstruction, laborTotals, validateFullLabor } from './labor/funding';
import { validateHouseholdStructureLinks, validatePassiveHouseholdStock } from './structures';
import { StartupCheckpointCapacityError } from '../checkpoints/capacity';
import { spawnedActiveTicks } from '../../../spawning/lifetime';
import { copyPlain } from '../../../../core/plain-data';
import { householdIdentity, householdCheckpointFormat } from './validation';
import { startupFlowCount } from '../flow';
import type { StartupHouseholdInput, StartupHouseholdCheckpoint } from './model';
export function readHouseholdCheckpoint(input: StartupHouseholdInput, value: StartupHouseholdCheckpoint): StartupHouseholdCheckpoint {
  const saved = copyPlain(value);
  if (saved.format !== householdCheckpointFormat(input) || saved.binding !== householdIdentity(input)) throw new Error('Invalid household checkpoint binding');
  if (!Number.isSafeInteger(saved.through) || saved.through < -1 || saved.through > input.spawning.cash.horizon) throw new Error('Invalid household checkpoint clock');
  if (![saved.endpointEnergy,saved.endpointSpentEnergy,saved.endpointReceivedEnergy].every(natural)) throw new Error('Invalid household checkpoint stock');
  if (saved.spawning.tick !== saved.through+1 || saved.redistribution.through !== saved.through) throw new Error('Household checkpoint frame mismatch');
  if (JSON.stringify(saved).length > 1048576) throw new StartupCheckpointCapacityError('Household checkpoint capacity');
  validateLaborPart(input,saved);
  validateLosses(input,saved); return saved;
}
export function validateHouseholdLinks(input: StartupHouseholdInput, saved: StartupHouseholdCheckpoint, physical: { picked: number; delivered: number; lost: number; cargo: number }): void {
  const labor = laborTotals(saved.labor), construction = laborConstruction(input.labor,saved.labor);
  const funding = saved.spawning.funding, cash = saved.spawning.accounting.state;
  if (saved.endpointEnergy !== input.endpointEnergy+saved.endpointReceivedEnergy-saved.endpointSpentEnergy-physical.picked-labor.picked+labor.returned) throw new Error('Household endpoint conservation');
  if (funding.refilledEnergy !== physical.delivered || funding.bank < saved.endpointEnergy+funding.accessible+physical.cargo+labor.cargo) throw new Error('Household funding conservation');
  if (cash.upkeepEnergy !== scheduled(input,'upkeep',saved.through)+physical.lost+labor.lost+labor.spent-construction) throw new Error('Household loss accounting');
  if (cash.homeConstructionEnergy !== scheduled(input,'home-construction',saved.through)+construction) throw new Error('Household construction spending');
  if (cash.deliveredEnergy !== scheduled(input,'delivery',saved.through)+saved.endpointReceivedEnergy) throw new Error('Household receipt accounting');
  if (saved.losses.reduce((sum,flow) => sum+flow.energy,0) !== physical.lost+labor.lost) throw new Error('Household loss conservation');
  validatePassiveHouseholdStock(input,saved,physical.cargo+labor.cargo);
  validateLaborBirths(input,saved); validateWorkers(input,saved); validateLossBindings(saved); validateHouseholdStructureLinks(input,saved);
}
function validateLosses(input: StartupHouseholdInput, saved: StartupHouseholdCheckpoint): void {
  if (!Array.isArray(saved.losses) || saved.losses.length > input.redistribution.trips.length+(input.labor?.jobs.length ?? 0)) throw new Error('Household loss event capacity');
  saved.losses.forEach((flow,index) => {
    if (flow.id !== 'household-loss:'+index || flow.kind !== 'upkeep' || !natural(flow.energy) || flow.energy < 1) throw new Error('Invalid household loss event');
    if (!natural(flow.firstTick) || flow.firstTick > saved.through || flow.interval !== null || flow.occurrences !== 1) throw new Error('Invalid household loss clock');
  });
}
function scheduled(input: StartupHouseholdInput, kind: string, through: number): number {
  return input.spawning.cash.flows.filter(flow => flow.kind === kind).reduce((sum,flow) => sum+startupFlowCount(flow,0,through)*flow.energy,0);
}
function natural(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }

function validateWorkers(input: StartupHouseholdInput, saved: StartupHouseholdCheckpoint): void {
  saved.redistribution.trips.forEach((state,index) => {
    if (!state.picked) return;
    const trip = input.redistribution.trips[index]!, birth = saved.spawning.births.find(birth => birth.request === trip.request);
    const request = input.spawning.requests.find(request => request.id === trip.request)!;
    if (!birth || trip.pickupAt < birth.activeAt || state.expiresAt !== birth.activeAt+spawnedActiveTicks(request.body)) throw new Error('Household paid-worker lifetime mismatch');
    if (state.picked > request.body.filter(part => part === 'carry').length*50) throw new Error('Household worker capacity mismatch');
  });
}
function validateLossBindings(saved: StartupHouseholdCheckpoint): void {
  const states = [...saved.redistribution.trips,...(saved.labor?.jobs ?? [])];
  const losses = states.map((state,index) => ({ state,index })).filter(item => item.state.lost > 0)
    .sort((a,b) => a.state.doneAt!-b.state.doneAt! || a.index-b.index);
  if (losses.length !== saved.losses.length) throw new Error('Household loss event mismatch');
  if (!losses.every((item,index) => item.state.doneAt === saved.losses[index]!.firstTick && item.state.lost === saved.losses[index]!.energy)) throw new Error('Household loss date mismatch');
}

function validateLaborBirths(input: StartupHouseholdInput, saved: StartupHouseholdCheckpoint): void {
  saved.labor?.jobs.forEach((state,index) => {
    if (!state.picked) return;
    const job = input.labor!.jobs[index]!, birth = saved.spawning.births.find(item => item.request === job.request), worker = state.worker!;
    const request = input.spawning.requests.find(item => item.id === job.request)!;
    if (!birth || JSON.stringify(request.body) !== JSON.stringify(worker.body)) throw new Error('Labor paid-body mismatch');
    if (['request','spawn','startAt','activeAt','cost'].some(key => birth[key as keyof typeof birth] !== worker.birth[key as keyof typeof birth])) throw new Error('Labor paid-birth mismatch');
  });
}

function validateLaborPart(input: StartupHouseholdInput, saved: StartupHouseholdCheckpoint): void {
  if (input.labor) {
    if (!saved.labor || saved.labor.through !== saved.through || saved.endpointEnergy > input.endpointCapacity!) throw new Error('Household labor checkpoint mismatch');
    saved.labor = readLaborCheckpoint(input.labor,saved.labor); validateFullLabor(saved.labor);
  } else if (saved.labor !== undefined) throw new Error('Unexpected household labor checkpoint');
}
