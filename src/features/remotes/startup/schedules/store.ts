import { createStartupProject } from '../../../../capabilities/economy/startup/project';
import { decodeStartupPlanningInput, encodeStartupPlanningInput } from '../planning/input';
import { validPlanningContext } from '../planning/validation';
import type { StartupPlanningContext, StartupPlanningInput } from '../planning/model';
import { natural, object, room } from '../../assignment-validation';
import { openState, peekState, saveState } from '../../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
export interface StartupSchedule extends StartupPlanningContext { seedIdentity: string; input: StartupPlanningInput; complete: boolean }
export interface StartupScheduleRecord { home: string; revision: number; clock: number; job: StartupSchedule | null }
export function createStartupScheduleStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid startup schedule home');
  const key = stateKey('remoteStartupSchedules',home);
  const schema: StateSchema<StartupScheduleRecord> = { owner: 'remotes',version: 2,migrations: { 1: value => upgradeSchedule(value,home) },initial: () => ({ home,revision: 0,clock: 0,job: null }),
    valid: (value): value is StartupScheduleRecord => validRecord(value,home) };
  const read = () => peekState(state,key,schema) ?? schema.initial();
  function save(expected: number, tick: number, job: StartupSchedule | null) {
    if (!natural(expected) || !natural(tick)) throw new Error('Invalid startup schedule write');
    const current = read();
    if (current.revision !== expected || tick < current.clock) return 'conflict' as const;
    const next = { home,revision: expected+1,clock: tick,job };
    if ((job?.seedIdentity.length ?? 0) > 262144 || JSON.stringify(next).length > 524288) return 'capacity' as const;
    if (!schema.valid(next)) throw new Error('Invalid startup schedule');
    openState(state,key,schema); saveState(state,key,schema,next); return 'saved' as const;
  }
  function withdraw(expected: number, tick: number, target: { room: string; source: string; generation: number }) {
    const job = read().job;
    if (!job || job.room !== target.room || job.source !== target.source || job.generation !== target.generation) return false;
    return save(expected,tick,null) === 'saved';
  }
  return { read,save,withdraw };
}
function validRecord(value: unknown, home: string): value is StartupScheduleRecord {
  if (!object(value) || Object.keys(value).length !== 4 || value.home !== home) return false;
  if (![value.revision,value.clock].every(natural) || JSON.stringify(value).length > 524288) return false;
  return value.job === null || validJob(value.job,home,Number(value.clock));
}
function validJob(value: unknown, home: string, clock: number): boolean {
  if (!validPlanningContext(value,home,clock) || Object.keys(value).length !== 9) return false;
  const job = value as unknown as StartupSchedule;
  return validJobIdentity(job) && validJobInput(job,home);
}
function validJobIdentity(job: StartupSchedule): boolean {
  return typeof job.seedIdentity === 'string' && job.seedIdentity.length > 0 && job.seedIdentity.length <= 262144 && typeof job.complete === 'boolean';
}
function validJobInput(job: StartupSchedule, home: string): boolean {
  try {
    const input = decodeStartupPlanningInput(job.input);
    if (input.project.spawning.room !== home || JSON.stringify(encodeStartupPlanningInput(input)) !== JSON.stringify(job.input)) return false;
    createStartupProject(input); return true;
  } catch { return false; }
}

function upgradeSchedule(value: unknown, home: string): StartupScheduleRecord {
  if (!validRecord(value,home)) throw new Error('Invalid legacy startup schedule');
  const next = value as StartupScheduleRecord;
  if (next.job && decodeStartupPlanningInput(next.job.input).project.spawning.funding.energyLayout?.regeneration !== undefined) throw new Error('Unsupported legacy passive schedule');
  return next;
}
