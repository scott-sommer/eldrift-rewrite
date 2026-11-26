import { openState, peekState, saveState } from '../../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../../persistence/versioned-state';
import { natural, object, room } from '../../assignment-validation';
import { validStartupApproval } from './validation';
import type { StartupApprovalRecord } from './model';
/** Bounded accepted evidence, independent of the replaceable scratch planning namespace. */
export function createStartupApprovalStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid startup approval home');
  const key = 'remoteStartupApprovals/'+home, schema = approvalSchema(home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, tick: number, approvals: StartupApprovalRecord['approvals']) {
    const current = read();
    if (current.revision !== expected || tick < current.clock) return 'conflict' as const;
    const next = { home,revision: expected+1,clock: tick,approvals };
    if (approvals.length > 16 || JSON.stringify(next).length > 262144) return 'capacity' as const;
    if (!schema.valid(next)) throw new Error('Invalid startup approval record');
    openState(state,key,schema); saveState(state,key,schema,next); return 'saved' as const;
  } };
}
function approvalSchema(home: string): StateSchema<StartupApprovalRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,approvals: [] }),
    valid(value: unknown): value is StartupApprovalRecord {
      if (!object(value) || Object.keys(value).length !== 4 || value.home !== home || !natural(value.revision) || !natural(value.clock)) return false;
      if (!Array.isArray(value.approvals) || value.approvals.length > 16 || JSON.stringify(value).length > 262144) return false;
      if (!value.approvals.every(approval => validStartupApproval(approval,home,value.clock as number))) return false;
      return new Set((value.approvals as StartupApprovalRecord['approvals']).map(approval => JSON.stringify([approval.job.room,approval.job.source]))).size === value.approvals.length;
    } };
}
