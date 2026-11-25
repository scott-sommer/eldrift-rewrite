import type { HouseholdLaborJob } from '../../capabilities/economy/startup/household/labor/model';
export interface LaborIntent { kind: 'pickup' | 'work' | 'return'; tick: number; before: number; maximum: number }
export interface LaborProgress { worker: string | null; picked: number; spent: number; returned: number; pending: LaborIntent | null }
export function initialLaborProgress(): LaborProgress { return { worker: null,picked: 0,spent: 0,returned: 0,pending: null }; }
export function validLaborProgress(value: unknown, job: HouseholdLaborJob): value is LaborProgress {
  if (!value || typeof value !== 'object') return false;
  const state = value as LaborProgress;
  if (Object.keys(state).length !== 5 || ![state.picked,state.spent,state.returned].every(natural)) return false;
  return validTotals(state,job) && validWorker(state) && validPending(state.pending,job);
}
function validTotals(state: LaborProgress, job: HouseholdLaborJob): boolean {
  return state.picked <= job.energy && state.spent+state.returned <= state.picked;
}
function validWorker(state: LaborProgress): boolean {
  if (state.worker !== null) return typeof state.worker === 'string' && state.worker.length > 0;
  return !state.picked && !state.spent && !state.returned && state.pending === null;
}
function validPending(pending: LaborIntent | null, job: HouseholdLaborJob): boolean {
  return pending === null || validIntent(pending) && pending.maximum <= job.energy && pending.before <= job.energy;
}

function validIntent(value: LaborIntent): boolean {
  return !!value && Object.keys(value).length === 4 && ['pickup','work','return'].includes(value.kind)
    && [value.tick,value.before,value.maximum].every(natural) && value.maximum > 0;
}
function natural(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
