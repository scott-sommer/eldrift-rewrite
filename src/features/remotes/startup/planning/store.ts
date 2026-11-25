import { startupHasLocatedExpenses } from '../../../../capabilities/economy/startup/cash-expenses';
import { readStartupProjectCheckpoint } from '../../../../capabilities/economy/startup/checkpoints/project';
import { decodeStartupPlanningInput } from './input';
import { openState, peekState, saveState } from '../../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { natural, object, room } from '../../assignment-validation';
import { validPlanningJob } from './validation';
import type { StartupPlanningJob, StartupPlanningRecord } from './model';
export type StartupPlanningSave = 'saved' | 'conflict' | 'capacity';
/** One resumable scratch candidate per home; selected evidence has its separate owner. */
export function createStartupPlanningStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid startup planning home');
  const key = stateKey('remoteStartupPlanning',home), schema = planningSchema(home);
  const read = () => peekState(state,key,schema) ?? schema.initial();
  function save(expected: number, tick: number, job: StartupPlanningJob | null): StartupPlanningSave {
    if (!natural(expected) || !natural(tick)) throw new Error('Invalid startup planning write');
    const current = read();
    if (current.revision !== expected || tick < current.clock) return 'conflict';
    const next = { home,revision: expected+1,clock: tick,job };
    if (JSON.stringify(next).length > 262144) return 'capacity';
    if (!schema.valid(next)) throw new Error('Invalid startup planning job');
    openState(state,key,schema); saveState(state,key,schema,next); return 'saved';
  }
  return { read,save,
    withdraw(expected: number, tick: number, target: { room: string; source: string; generation: number }): boolean {
      const current = read(), job = current.job;
      if (!job || job.room !== target.room || job.source !== target.source || job.generation !== target.generation) return false;
      return save(expected,tick,null) === 'saved';
    },
  };
}
function planningSchema(home: string): StateSchema<StartupPlanningRecord> {
  return { owner: 'remotes',version: 7,migrations: { 1: value => upgradePlanning(value,home),2: value => upgradeSecondPlanning(value,home),3: value => upgradeThirdPlanning(value,home),4: value => upgradeFourthPlanning(value,home),5: value => upgradeFifthPlanning(value,home),6: value => upgradeSixthPlanning(value,home) },initial: () => ({ home,revision: 0,clock: 0,job: null }),
    valid(value: unknown): value is StartupPlanningRecord {
      if (!object(value) || Object.keys(value).length !== 4 || value.home !== home || !natural(value.revision) || !natural(value.clock)) return false;
      if (JSON.stringify(value).length > 262144) return false;
      return value.job === null || validPlanningJob(value.job,home,value.clock);
    } };
}

function upgradePlanning(value: unknown, home: string): StartupPlanningRecord {
  if (!object(value)) throw new Error('Invalid legacy startup planning record');
  const next = value as unknown as StartupPlanningRecord;
  if (next.job) {
    const input = decodeStartupPlanningInput(next.job.input);
    if (next.job.checkpoint.format !== (1 as number) || input.household !== undefined || input.initial !== undefined || input.project.spawning.cash.openingAssets !== undefined) throw new Error('Unsupported legacy startup planning metadata');
    next.job.checkpoint = readStartupProjectCheckpoint(input,next.job.checkpoint);
  }
  if (!planningSchema(home).valid(next)) throw new Error('Invalid legacy startup planning record');
  return next;
}

function upgradeSecondPlanning(value: unknown, home: string): StartupPlanningRecord {
  if (!object(value)) throw new Error('Invalid schema2 startup planning record');
  const next = value as unknown as StartupPlanningRecord;
  if (next.job) {
    const input = decodeStartupPlanningInput(next.job.input);
    if (input.household !== undefined || ![1,2].includes(next.job.checkpoint.format)) throw new Error('Unsupported schema2 startup planning metadata');
    next.job.checkpoint = readStartupProjectCheckpoint(input,next.job.checkpoint);
  }
  if (!planningSchema(home).valid(next)) throw new Error('Invalid schema2 startup planning record');
  return next;
}

function upgradeThirdPlanning(value: unknown, home: string): StartupPlanningRecord {
  if (!object(value)) throw new Error('Invalid schema3 startup planning record');
  const next = value as unknown as StartupPlanningRecord;
  if (next.job) {
    const input = decodeStartupPlanningInput(next.job.input);
    if (input.project.spawning.funding.energyLayout !== undefined || ![2,3].includes(next.job.checkpoint.format)) throw new Error('Unsupported schema3 physical startup metadata');
    next.job.checkpoint = readStartupProjectCheckpoint(input,next.job.checkpoint);
  }
  if (!planningSchema(home).valid(next)) throw new Error('Invalid schema3 startup planning record');
  return next;
}

function upgradeFourthPlanning(value: unknown, home: string): StartupPlanningRecord {
  if (!object(value)) throw new Error('Invalid schema4 startup planning record');
  const next = value as unknown as StartupPlanningRecord;
  if (next.job) {
    const input = decodeStartupPlanningInput(next.job.input);
    if (input.project.spawning.funding.energyLayout?.regeneration !== undefined || ![2,3,4].includes(next.job.checkpoint.format)) throw new Error('Unsupported schema4 passive startup metadata');
    next.job.checkpoint = readStartupProjectCheckpoint(input,next.job.checkpoint);
  }
  if (!planningSchema(home).valid(next)) throw new Error('Invalid schema4 startup planning record');
  return next;
}

function upgradeFifthPlanning(value: unknown, home: string): StartupPlanningRecord {
  if (!object(value)) throw new Error('Invalid schema5 startup planning record');
  const next = value as unknown as StartupPlanningRecord;
  if (next.job) {
    const input = decodeStartupPlanningInput(next.job.input);
    if (startupHasLocatedExpenses(input.project.spawning.cash.flows) || ![2,3,4,5].includes(next.job.checkpoint.format)) throw new Error('Unsupported schema5 located spending');
    next.job.checkpoint = readStartupProjectCheckpoint(input,next.job.checkpoint);
  }
  if (!planningSchema(home).valid(next)) throw new Error('Invalid schema5 startup planning record');
  return next;
}

function upgradeSixthPlanning(value: unknown, home: string): StartupPlanningRecord {
  if (!object(value)) throw new Error('Invalid schema6 startup planning record');
  const next = value as unknown as StartupPlanningRecord;
  if (next.job) {
    const input = decodeStartupPlanningInput(next.job.input);
    if (input.household?.labor !== undefined || input.household?.endpointCapacity !== undefined || ![2,3,4,5,6].includes(next.job.checkpoint.format)) throw new Error('Unsupported schema6 household labor');
    next.job.checkpoint = readStartupProjectCheckpoint(input,next.job.checkpoint);
  }
  if (!planningSchema(home).valid(next)) throw new Error('Invalid schema6 startup planning record');
  return next;
}
