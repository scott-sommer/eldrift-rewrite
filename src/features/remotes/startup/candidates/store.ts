import { openState, peekState, saveState } from '../../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { natural, room, object } from '../../assignment-validation';
import { validCandidateRecord } from './validation';
import type { StartupCandidateEntry, StartupCandidateRecord, StartupCandidateWrite } from './model';
export function createStartupCandidateStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid startup candidate home');
  const key = stateKey('remoteStartupCandidates',home);
  const schema: StateSchema<StartupCandidateRecord> = { owner: 'remotes',version: 5,migrations: { 1: value => upgradeAssessments(value,home),2: value => upgradeSecondAssessments(value,home),3: value => upgradeThirdAssessments(value,home),4: value => upgradeThirdAssessments(value,home) },
    initial: () => ({ home,revision: 0,clock: 0,entries: [] }),valid: (value): value is StartupCandidateRecord => validCandidateRecord(value,home) };
  const read = () => peekState(state,key,schema) ?? schema.initial();
  function save(expected: number, tick: number, entries: StartupCandidateEntry[]): StartupCandidateWrite {
    if (!natural(expected) || !natural(tick)) throw new Error('Invalid startup candidate write');
    const current = read();
    if (current.revision !== expected || tick < current.clock) return 'conflict';
    const next = { home,revision: expected+1,clock: tick,entries };
    if (entries.length > 16 || JSON.stringify(next).length > 1048576 || entries.some(entry => entry.inputIdentity.length > 262144)) return 'capacity';
    if (!schema.valid(next)) throw new Error('Invalid startup candidate entry');
    openState(state,key,schema); saveState(state,key,schema,next); return 'saved';
  }
  return { read,save };
}

/** Old assessments are derived caches; recapture under current cash attribution without touching raw reads. */
function upgradeAssessments(value: unknown, home: string): StartupCandidateRecord {
  if (!validCandidateRecord(value,home)) throw new Error('Invalid legacy startup assessments');
  return { ...value,entries: [] };
}

function upgradeSecondAssessments(value: unknown, home: string): StartupCandidateRecord {
  if (!validCandidateRecord(value,home)) throw new Error('Invalid schema2 startup assessments');
  return { ...value,entries: value.entries.filter(entry => reusableIdentity(entry.inputIdentity)) };
}
function reusableIdentity(identity: string): boolean {
  try {
    const input = JSON.parse(identity) as { project?: { spawning?: { cash?: { flows?: unknown } } } } | null;
    const flows = input?.project?.spawning?.cash?.flows;
    return Array.isArray(flows) && flows.every(flow => object(flow) && flow.spending === undefined);
  } catch { return false; }
}

function upgradeThirdAssessments(value: unknown, home: string): StartupCandidateRecord {
  if (!validCandidateRecord(value,home)) throw new Error('Invalid schema3 startup assessments');
  return { ...value,entries: value.entries.filter(entry => nonLaborIdentity(entry.inputIdentity)) };
}
function nonLaborIdentity(identity: string): boolean {
  try {
    const input = JSON.parse(identity) as { shared?: unknown; project?: { spawning?: { cash?: { flows?: unknown } } }; household?: { labor?: unknown; endpointCapacity?: unknown } } | null;
    return Array.isArray(input?.project?.spawning?.cash?.flows) && input?.shared === undefined && input?.household?.labor === undefined && input?.household?.endpointCapacity === undefined;
  } catch { return false; }
}
