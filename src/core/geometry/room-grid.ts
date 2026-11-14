export interface RoomCoordinates { x: number; y: number }
/** World-room coordinates, not local RoomPosition equality or a traversability claim. */
export function roomCoordinates(name: string): RoomCoordinates {
  const match = /^([WE])(0|[1-9][0-9]*)([NS])(0|[1-9][0-9]*)$/.exec(name);
  if (!match) throw new Error(`Invalid world room: ${name}`);
  const horizontal = Number(match[2]);
  const vertical = Number(match[4]);
  if (!Number.isSafeInteger(horizontal + 1) || !Number.isSafeInteger(vertical + 1)) throw new Error('Room coordinate overflow');
  return { x: match[1] === 'W' ? -horizontal - 1 : horizontal, y: match[3] === 'N' ? -vertical - 1 : vertical };
}
export function roomName({ x, y }: RoomCoordinates): string {
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) throw new Error('Invalid room coordinates');
  return `${x < 0 ? `W${-x - 1}` : `E${x}`}${y < 0 ? `N${-y - 1}` : `S${y}`}`;
}
export function adjacentRoom(name: string, direction: 1 | 3 | 5 | 7): string {
  const offsets = { 1: [0, -1], 3: [1, 0], 5: [0, 1], 7: [-1, 0] } as const;
  const [dx, dy] = offsets[direction];
  const point = roomCoordinates(name);
  return roomName({ x: point.x + dx, y: point.y + dy });
}
