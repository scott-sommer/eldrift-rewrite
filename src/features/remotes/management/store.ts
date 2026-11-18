import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { natural, object, room } from '../assignment-validation';
import { validateRemoteOffers } from '../portfolio-validation';
import type { RemoteManagementRecord } from './model';
export function createRemoteManagementStore(state: StatePort, home: string) {
  const key = stateKey('remoteManagement',home), schema = managementSchema(home);
  const read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, record: RemoteManagementRecord): boolean {
    const current = read();
    if (current.revision !== expected || record.clock < current.clock) return false;
    const next = { ...record,revision: expected+1 };
    if (!schema.valid(next)) throw new Error('Invalid remote management transition');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
function managementSchema(home: string): StateSchema<RemoteManagementRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,identity: '',startedAt: 0,
    roomIndex: 0,sourceIndex: 0,offers: [],reports: [],scannedAt: null,committedAt: null,managed: [] }),
    valid(value: unknown): value is RemoteManagementRecord {
      if (!object(value) || value.home !== home || !validClock(value) || !validCursor(value)) return false;
      if (typeof value.identity !== 'string' || value.identity.length > 100000) return false;
      return validOffers(value.offers,home,Number(value.clock)) && validReports(value.reports) && validManaged(value.managed);
    } };
}
function validClock(record: Record<string,unknown>): boolean {
  if (![record.revision,record.clock,record.startedAt].every(natural) || Number(record.startedAt) > Number(record.clock)) return false;
  return [record.scannedAt,record.committedAt].every(value => value === null || natural(value) && value <= Number(record.clock));
}
function validCursor(record: Record<string,unknown>): boolean {
  return natural(record.roomIndex) && record.roomIndex <= 64 && natural(record.sourceIndex) && record.sourceIndex <= 128;
}
function validOffers(value: unknown, home: string, tick: number): boolean {
  if (!Array.isArray(value) || value.length > 64) return false;
  try {
    validateRemoteOffers(value,{ home,tick,maximumAge: 1000000,maximumSlots: 0,maximumHaulers: 0,maximumSpawnLoad: 0,
      minimumNetYield: 0,completionBonus: 0,order: 'nearest' });
    return value.reduce((sum,offer) => sum+offer.sourceIds.length,0) <= 128;
  } catch { return false; }
}
function validReports(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 192 && value.every(report => object(report) && room(report.room)
    && typeof report.source === 'string' && report.source.length <= 256 && ['assessed','rejected','deferred'].includes(String(report.status))
    && typeof report.reason === 'string' && report.reason.length <= 256);
}

function validManaged(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 64 && value.every(item => object(item) && room(item.room) && natural(item.generation) && item.generation > 0)
    && new Set(value.map(item => item.room)).size === value.length;
}
