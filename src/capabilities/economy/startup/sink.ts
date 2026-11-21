import { restoreSinkCheckpoint } from './checkpoints/sink';
import type { StartupSinkCheckpoint } from './checkpoints/sink';
import { startupFlowDue } from './flow';
import { validateStartupCash } from './cash-validation';
import type { StartupCashFlow, StartupCashInput } from './cash-model';
/** One quoted accepting endpoint, not an instantaneous aggregate of geographically separate sinks. */
export interface StartupSinkInput {
  capacity: number; freeCapacity: number;
  changes: readonly (Omit<StartupCashFlow,'kind'> & { kind: 'occupy' | 'release' })[];
}
export interface StartupSink {
  checkpoint(): StartupSinkCheckpoint;
  prepare(tick: number): void; take(energy: number): number; finish(): void; releaseAfterFrame(energy: number): void;
  result(): { remainingCapacity: number; acceptedEnergy: number; projectedThrough: number };
}
/** Physical sink capacity only: internal releases neither create cash nor charge it again. */
export function createStartupSink(input: StartupSinkInput, cash: StartupCashInput, checkpoint?: unknown): StartupSink {
  validateSink(input,cash);
  const capacity = input.capacity, horizon = cash.horizon, changes = input.changes.map(flow => ({ ...flow }));
  let free = input.freeCapacity, acceptedEnergy = 0, through = -1, finished = true;
  if (checkpoint !== undefined) { ({ free,acceptedEnergy,through } = restoreSinkCheckpoint(capacity,horizon,checkpoint)); }
  function apply(tick: number, kind: 'occupy' | 'release'): void {
    const amount = changes.filter(flow => flow.kind === kind && startupFlowDue({ ...flow,kind: 'delivery' },tick)).reduce((sum,flow) => sum+flow.energy,0);
    const next = free+(kind === 'release' ? amount : -amount);
    if (next < 0 || next > capacity) throw new Error('Infeasible startup sink change schedule');
    free = next;
  }
  return {
    checkpoint() { if (!finished) throw new Error('Cannot checkpoint an open startup sink frame'); return { free,acceptedEnergy,through }; },
    prepare(tick) {
      if (!Number.isSafeInteger(tick) || tick < 0 || tick > horizon) throw new Error('Invalid startup sink frame');
      if (!finished || tick <= through) throw new Error('Startup sink frame order');
      for (let frame = through+1; frame <= tick; frame++) { apply(frame,'occupy'); if (frame < tick) apply(frame,'release'); }
      through = tick; finished = false;
    },
    take(energy) {
      if (finished || !Number.isSafeInteger(energy) || energy < 0) throw new Error('Invalid startup sink transfer');
      const accepted = Math.min(free,energy); free -= accepted; acceptedEnergy += accepted; return accepted;
    },
    finish() { if (finished) throw new Error('Startup sink frame already finished'); apply(through,'release'); finished = true; },
    releaseAfterFrame(energy) {
      if (!finished || !Number.isSafeInteger(energy) || energy < 0 || free+energy > capacity) throw new Error('Invalid household sink release');
      free += energy;
    },
    result() { return { remainingCapacity: free,acceptedEnergy,projectedThrough: through+1 }; },
  };
}
function validateSink(input: StartupSinkInput, cash: StartupCashInput): void {
  if (![input.capacity,input.freeCapacity].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000)) throw new Error('Invalid startup sink capacity');
  if (input.freeCapacity > input.capacity || input.changes.length > 64) throw new Error('Invalid startup sink initial state');
  if (input.changes.some(flow => !['occupy','release'].includes(flow.kind))) throw new Error('Invalid startup sink change');
  validateStartupCash({ ...cash,flows: input.changes.map(flow => ({ ...flow,kind: 'delivery' })) });
}
