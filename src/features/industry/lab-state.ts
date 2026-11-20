import type { StateSchema } from '../../persistence/versioned-state';
import type { LabAssignment } from '../../capabilities/industry/labs/assignment';
export interface LabState { assignment: LabAssignment | null }
function ids(value: unknown,maximum: number): value is string[] {
  return Array.isArray(value) && value.length <= maximum && value.every(id => typeof id === 'string' && id.length > 0 && id.length <= 100) && new Set(value).size === value.length;
}
function pair(value: unknown): value is [string,string] { return ids(value,2) && value.length === 2; }
function product(value: unknown): boolean { return typeof value === 'string' && value.length > 0 && value.length <= 20; }
function validLabLists(item: LabAssignment): boolean { return ids(item.outputs,8) && item.outputs.length > 0 && ids(item.roster,10); }
function validAssignment(value: unknown): value is LabAssignment {
  if (!value || typeof value !== 'object') return false;
  const item = value as LabAssignment;
  if (!product(item.product)) return false;
  if (!pair(item.reagents) || !pair(item.inputs)) return false;
  if (!validLabLists(item)) return false;
  const assigned = [...item.inputs,...item.outputs];
  return new Set(assigned).size === assigned.length && assigned.every(id => item.roster.includes(id));
}
export const labStateSchema: StateSchema<LabState> = {
  owner: 'industry',version: 1,initial: () => ({ assignment: null }),migrations: {},
  valid(value: unknown): value is LabState {
    return !!value && typeof value === 'object' && 'assignment' in value && (value.assignment === null || validAssignment(value.assignment));
  },
};
