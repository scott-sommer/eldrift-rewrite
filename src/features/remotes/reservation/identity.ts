import { natural, room } from '../assignment-validation';
export interface ReservationIdentity { home: string; room: string; generation: number }
export const reservationPrefix = 'remote-reservation:';
export function reservationOwner(identity: ReservationIdentity): string {
  if (!valid([identity.home,identity.room,identity.generation])) throw new Error('Invalid reservation identity');
  return reservationPrefix+JSON.stringify([identity.home,identity.room,identity.generation]);
}
export function reservationIdentity(owner: string): ReservationIdentity | undefined {
  if (!owner.startsWith(reservationPrefix) || owner.length > 1024) return undefined;
  try {
    const value: unknown = JSON.parse(owner.slice(reservationPrefix.length));
    return valid(value) ? { home: value[0],room: value[1],generation: value[2] } : undefined;
  } catch { return undefined; }
}
function valid(value: unknown): value is [string,string,number] {
  return Array.isArray(value) && value.length === 3 && room(value[0]) && room(value[1]) && value[0] !== value[1] && natural(value[2]) && value[2] > 0;
}
