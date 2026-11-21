import type { LabBoostRole } from '../config/lab-boost-roles';
import { legacyBoostPreferences } from '../features/industry/boosts/legacy-preferences';
import type { LabConfig } from '../config/labs';
/** Keep the legacy fixed Upgrade Room lab identity consistent across every industry consumer. */
export function nativeUpgradeLab(room: Room): StructureLab | undefined {
  return room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.isActive()).sort((a,b) => a.id.localeCompare(b.id))[0];
}
export function specialistBoostLabIds(home: string,policy: Readonly<LabConfig & { upgradeRoomEnabled?: boolean }>): readonly string[] {
  if (!policy.upgradeRoomEnabled) return [];
  const room = Game.rooms[home], lab = room && nativeUpgradeLab(room);
  return lab ? [lab.id] : [];
}

export function specialistLabRoleAllowed(protectedLabs: readonly string[],role: LabBoostRole): boolean {
  return !protectedLabs.includes(role.lab) || legacyBoostPreferences.upgrade!.compounds.includes(role.resource);
}
