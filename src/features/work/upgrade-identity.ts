/** Specialist ownership is separate from ordinary work policies. */
export const upgradeOwner = (room: string) => 'upgrade-room:' + room;

export function upgradeTarget(owner: string): string | undefined {
  const prefix = ['upgrade-room:', 'upgrade-master:'].find(prefix => owner.startsWith(prefix));
  const target = prefix ? owner.slice(prefix.length) : '';
  return /^[WE]\d+[NS]\d+$/.test(target) ? target : undefined;
}

export const upgradeMasterOwner = (room: string) => 'upgrade-master:' + room;
