export interface ConstructionAuthority {
  room: string; visible: boolean; owned: boolean; owner?: string; reservation?: string;
}
export interface RemoteConstructionPolicy { rooms: readonly string[]; username: string }
/** Explicit remote approval never grants construction in another player's owned/reserved room. */
export function constructionAuthority(room: ConstructionAuthority, remote?: RemoteConstructionPolicy, type?: string) {
  if (!room.visible) return { allowed: false, reason: 'hidden' };
  if (room.owned) return { allowed: true, reason: 'owned' };
  if (room.owner) return { allowed: false, reason: 'foreign-owner' };
  if (!remote?.username || !remote.rooms.includes(room.room)) return { allowed: false, reason: 'remote-not-approved' };
  if (room.reservation && room.reservation !== remote.username) return { allowed: false, reason: 'foreign-reservation' };
  if (type && !['road', 'container'].includes(type)) return { allowed: false, reason: 'remote-structure-type' };
  return { allowed: true, reason: 'approved-remote-infrastructure' };
}
