import type { StatePort } from '../persistence/versioned-state';
import type { LabBoostRole } from '../config/lab-boost-roles';
import { boostLabRoles, boostRoleAllows } from '../features/industry/boost-labs/store';
export function nativeBoostRoleAccess(state: StatePort,home: string,desired: readonly LabBoostRole[]) {
  const current = boostLabRoles(state,home);
  const allows = (lab: string,resource: string) => boostRoleAllows(current,desired,lab,resource);
  return { allows,resources(labs: readonly string[]): readonly string[] | undefined {
    const bound = new Set([...current,...desired].map(role => role.lab));
    if (labs.some(lab => !bound.has(lab))) return undefined;
    return [...new Set(desired.filter(role => labs.includes(role.lab) && allows(role.lab,role.resource)).map(role => role.resource))];
  } };
}
