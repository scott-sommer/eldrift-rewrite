import type { ScoutHeartbeat } from '../features/intel/scout-model';
/** Capture actual identity/position/remaining lifetime; no role policy or persistent writes. */
export function nativeScoutHeartbeat(creep: Creep, home: string, target: string | null = null): ScoutHeartbeat {
  const ttl = creep.ticksToLive;
  return { id: creep.id, name: creep.name, home, target, seenAt: Game.time,
    expiresAt: creep.spawning || ttl === undefined ? null : Game.time + ttl,
    position: { room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y } };
}
