import type { StartupCashInput, StartupCashFlow } from './cash-model';
export function validateStartupCash(input: StartupCashInput): void {
  if (![input.homeEnergy,input.protectedEnergy,input.selfHarvestedConstruction].every(bounded)) throw new Error('Invalid startup cash capital');
  if (![input.horizon,input.readyAt].every(value => bounded(value) && value <= 10000)) throw new Error('Invalid startup cash horizon');
  if (input.flows.length > 128 || new Set(input.flows.map(flow => flow.id)).size !== input.flows.length) throw new Error('Startup cash flow capacity/identity');
  for (const flow of input.flows) validateFlow(flow);
}
function validateFlow(flow: StartupCashFlow): void {
  if (typeof flow.id !== 'string' || flow.id.length === 0 || flow.id.length > 256) throw new Error('Invalid startup cash flow identity');
  if (!['birth','home-construction','upkeep','delivery'].includes(flow.kind)) throw new Error('Invalid startup cash flow kind');
  if (![flow.energy,flow.firstTick,flow.occurrences].every(bounded) || flow.occurrences === 0) throw new Error('Invalid startup cash flow bounds');
  validateRecurrence(flow);
}
function bounded(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000; }

function validateRecurrence(flow: StartupCashFlow): void {
  if (flow.interval !== null && (!bounded(flow.interval) || flow.interval === 0)) throw new Error('Invalid startup cash recurrence');
  if (flow.interval === null && flow.occurrences !== 1) throw new Error('One-off startup cash flow cannot repeat');
}
