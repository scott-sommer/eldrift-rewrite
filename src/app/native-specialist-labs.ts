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
