import type { StateSchema } from '../versioned-state';
export interface IntelRecord {
  lastSeen: number | null;
  owned: boolean;
  sourceIds: string[];
  structureIds: string[];
  hostileIds: string[];
}
function ids(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id => typeof id === 'string' && id.length > 0);
}
function validTick(tick: unknown): boolean {
  return tick === null || (typeof tick === 'number' && Number.isSafeInteger(tick) && tick >= 0);
}
function valid(value: unknown): value is IntelRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<IntelRecord>;
  if (!validTick(record.lastSeen)) return false;
  return typeof record.owned === 'boolean' && ids(record.sourceIds) && ids(record.structureIds) && ids(record.hostileIds);
}
export const intelSchema: StateSchema<IntelRecord> = {
  owner: 'intel', version: 1, valid, migrations: {},
  initial: () => ({ lastSeen: null, owned: false, sourceIds: [], structureIds: [], hostileIds: [] }),
};

