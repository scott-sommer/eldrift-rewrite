import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { peekState, openState, saveState } from '../../../persistence/versioned-state';
import type { LabBoostRole } from '../../../config/lab-boost-roles';
import { validBoostRoles } from '../../../config/lab-boost-roles';
interface BoostLabState { roles: LabBoostRole[] }
export const boostLabSchema: StateSchema<BoostLabState> = {
  owner: 'industry',version: 1,initial: () => ({ roles: [] }),migrations: {},
  valid(value: unknown): value is BoostLabState { return !!value && typeof value === 'object' && 'roles' in value && validBoostRoles(value.roles); },
};
export function boostLabRoles(state: StatePort,home: string): readonly LabBoostRole[] {
  return peekState(state,'industry-boost-labs/'+home,boostLabSchema)?.roles ?? [];
}
/** Keep a retiring role until admitted work/pinned actors settle under their existing owners. */
export function reconcileBoostLabRoles(state: StatePort,home: string,desired: readonly LabBoostRole[],busy: (lab: string) => boolean): readonly LabBoostRole[] {
  if (!validBoostRoles(desired)) throw new Error('Invalid boost lab roles');
  const key = 'industry-boost-labs/'+home;
  if (!desired.length && state.read(key) === undefined) return [];
  const saved = openState(state,key,boostLabSchema), roles: LabBoostRole[] = [];
  for (const old of saved.roles) {
    const next = desired.find(role => role.lab === old.lab);
    if ((!next || next.resource !== old.resource) && busy(old.lab)) roles.push(old);
    else if (next) roles.push({ ...next });
  }
  for (const role of desired) if (roles.length < 10 && !saved.roles.some(old => old.lab === role.lab)) roles.push({ ...role });
  saveState(state,key,boostLabSchema,{ roles }); return roles;
}
export function boostRoleAllows(current: readonly LabBoostRole[],desired: readonly LabBoostRole[],lab: string,resource: string): boolean {
  const old = current.find(role => role.lab === lab), next = desired.find(role => role.lab === lab);
  if (old && !next) return false;
  return (!old || old.resource === resource) && (!next || next.resource === resource);
}
export function boostRoleLabIds(state: StatePort,home: string,desired: readonly LabBoostRole[]): readonly string[] {
  return [...new Set([...desired,...boostLabRoles(state,home)].map(role => role.lab))];
}
