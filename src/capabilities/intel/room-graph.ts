import { roomCoordinates } from '../../core/geometry/room-grid';
export interface RoomGraphPorts {
  exits(room: string): readonly string[] | undefined;
  allows(room: string): boolean;
}
export interface RoomGraphEdge { room: string; via?: string }
export type GraphIncompleteReason = 'room-budget' | 'unknown-exits' | 'admission';
/** Request-owned snapshot cache, including unknown reads; no reverse/symmetric route assumption. */
export function createRoomGraph(ports: RoomGraphPorts, maximumReads: number, canContinue: () => boolean) {
  if (!Number.isSafeInteger(maximumReads) || maximumReads < 0 || maximumReads > 10000) throw new Error('Invalid room graph budget');
  const cache = new Map<string, readonly string[] | undefined>();
  const failures = new Set<GraphIncompleteReason>();
  function read(room: string): readonly string[] | undefined {
    if (cache.has(room)) return cache.get(room);
    if (!canContinue()) { failures.add('admission'); return undefined; }
    if (cache.size >= maximumReads) { failures.add('room-budget'); return undefined; }
    const raw = ports.exits(room);
    const exits = raw === undefined ? undefined : [...new Set(raw)].sort();
    for (const next of exits ?? []) validateCardinal(room, next);
    if (exits === undefined) failures.add('unknown-exits');
    cache.set(room, exits);
    return exits;
  }
  function edges(room: string): RoomGraphEdge[] {
    if (!canContinue()) { failures.add('admission'); return []; }
    const direct = (read(room) ?? []).filter(ports.allows);
    const targets = new Map<string, RoomGraphEdge>(direct.map(next => [next, { room: next }]));
    for (const via of direct) addCorners(room, via, read(via) ?? [], targets, ports.allows);
    return [...targets.values()].sort((a, b) => a.room.localeCompare(b.room));
  }
  return { edges, diagnostics: () => ({ reads: cache.size,
    incomplete: failures.has('admission') ? 'admission' as const : failures.has('room-budget') ? 'room-budget' as const
      : failures.has('unknown-exits') ? 'unknown-exits' as const : undefined }) };
}
function validateCardinal(origin: string, destination: string): void {
  const a = roomCoordinates(origin), b = roomCoordinates(destination);
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) throw new Error('Room graph requires cardinal exits');
}
function addCorners(origin: string, via: string, exits: readonly string[], targets: Map<string, RoomGraphEdge>, allows: RoomGraphPorts['allows']): void {
  const a = roomCoordinates(origin);
  for (const room of exits) {
    const b = roomCoordinates(room);
    if (Math.abs(a.x - b.x) === 1 && Math.abs(a.y - b.y) === 1 && allows(room) && !targets.has(room)) {
      targets.set(room, { room, via });
    }
  }
}
