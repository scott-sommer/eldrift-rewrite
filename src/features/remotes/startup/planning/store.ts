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
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,job: null }),
    valid(value: unknown): value is StartupPlanningRecord {
      if (!object(value) || Object.keys(value).length !== 4 || value.home !== home || !natural(value.revision) || !natural(value.clock)) return false;
      if (JSON.stringify(value).length > 262144) return false;
      return value.job === null || validPlanningJob(value.job,home,value.clock);
    } };
}
