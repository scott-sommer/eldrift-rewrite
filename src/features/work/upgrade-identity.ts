/** Specialist ownership is separate from ordinary work policies. */
export const upgradeOwner = (room: string) => 'upgrade-room:' + room;

export function upgradeTarget(owner: string): string | undefined {
  const target = owner.startsWith('upgrade-room:') ? owner.slice('upgrade-room:'.length) : '';
  return /^[WE]\d+[NS]\d+$/.test(target) ? target : undefined;
}
