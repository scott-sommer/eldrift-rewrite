import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../../persistence/versioned-state';
import { natural, object, room } from '../../assignment-validation';
import { validPlanningContext } from '../planning/validation';
import type { StartupPlanningContext } from '../planning/model';
import { validCompleteStartupTravel } from '../selection-validation';
import type { CompleteStartupTravel } from '../selection-model';
interface GeometryEntry { approvedAt: number; job: StartupPlanningContext; quote: CompleteStartupTravel; rooms: string[] }
interface GeometryHeader { home: string; revision: number; clock: number; approvals?: unknown }
interface GeometryRecord extends GeometryHeader { approvals: GeometryEntry[] }
/** Static service projection only: never financial evidence or permission to recruit/pay. No initialization or writes. */
export function readStartupServiceGeometry(state: StatePort, home: string, target: { room: string; source: string; generation: number }, tick: number) {
  if (!room(home) || !room(target.room) || !natural(tick) || !natural(target.generation) || target.generation === 0) throw new Error('Invalid startup geometry query');
  const record = peekState(state,'remoteStartupApprovals/'+home,geometrySchema(home,tick));
  return record?.approvals.find(entry => entry.job.room === target.room && entry.job.source === target.source && entry.job.generation === target.generation)?.quote.plan;
}
function geometrySchema(home: string, tick: number): StateSchema<GeometryRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,approvals: [] }),
    valid(value: unknown): value is GeometryRecord {
      if (!validHeader(value,home,tick)) return false;
      if (!Array.isArray(value.approvals) || value.approvals.length > 16 || JSON.stringify(value).length > 262144) return false;
      if (!value.approvals.every(entry => validEntry(entry,home,value.clock as number))) return false;
      const entries = value.approvals as GeometryEntry[];
      return new Set(entries.map(entry => JSON.stringify([entry.job.room,entry.job.source]))).size === entries.length;
    } };
}
function validHeader(value: unknown, home: string, tick: number): value is GeometryHeader {
  return object(value) && Object.keys(value).length === 4 && value.home === home && natural(value.revision) && natural(value.clock) && value.clock <= tick;
}
function validEntry(value: unknown, home: string, clock: number): value is GeometryEntry {
  if (!object(value) || Object.keys(value).length !== 5 || !validPlanningContext(value.job,home,clock) || !validCompleteStartupTravel(value.quote,home)) return false;
  if (!natural(value.approvedAt) || value.approvedAt < value.job.observedAt || value.approvedAt > Math.min(clock,value.job.expiresAt)) return false;
  return value.job.room === value.quote.plan.room && value.job.source === value.quote.plan.source && validCorridor(value.rooms,home,value.job.room);
}
function validCorridor(value: unknown, home: string, remote: string): value is string[] {
  return Array.isArray(value) && value.length <= 64 && value.every(room) && new Set(value).size === value.length && value.includes(home) && value.includes(remote);
}
