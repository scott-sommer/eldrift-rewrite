export function haulingOwner(room: string): string { return `logistics:${JSON.stringify(room)}`; }
export function scavengerOwner(room: string): string { return haulingOwner(room) + ':scavenger'; }
export function distributorOwner(room: string): string { return haulingOwner(room) + ':distributor'; }
export function isHaulingOwner(owner: string, room: string): boolean {
  return owner === haulingOwner(room) || owner === scavengerOwner(room) || owner === distributorOwner(room);
}
