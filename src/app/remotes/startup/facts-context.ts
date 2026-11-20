import type { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import type { StartupFactsRequest } from './facts-model';
/** Current native safety and assignment context; detached forecast authority is never implied. */
export function startupFactContext(request: StartupFactsRequest, assignments: ReturnType<typeof createRemoteAssignmentStore>) {
  const home = Game.rooms[request.home], room = Game.rooms[request.room];
  if (!ownedHome(home,request.username)) return { status: 'deferred' as const,reason: 'home-unavailable' };
  if (!room) return { status: 'deferred' as const,reason: 'vision' };
  if (unsafeRoom(room,request.username)) return { status: 'deferred' as const,reason: 'unsafe-room' };
  const authority = assignments.owner(request.room,Game.time);
  if (authority && (authority.home !== request.home || !authority.plan.sources.includes(request.source))) return { status: 'deferred' as const,reason: 'assignment' };
  const source = room.find(FIND_SOURCES).find(source => source.id === request.source);
  if (!source || !nearSource(source,request)) return { status: 'deferred' as const,reason: 'source' };
  return { status: 'ready' as const,home,room,source,authority };
}
function unsafeRoom(room: Room, username: string): boolean {
  return !!room.controller?.owner || !!room.controller?.reservation && room.controller.reservation.username !== username || room.find(FIND_HOSTILE_CREEPS).length > 0;
}
function nearSource(source: Source, request: StartupFactsRequest): boolean {
  const distance = Math.max(Math.abs(source.pos.x-request.station.x),Math.abs(source.pos.y-request.station.y));
  return source.pos.roomName === request.room && distance === 1;
}

function ownedHome(home: Room | undefined, username: string): home is Room { return !!home?.controller?.my && home.controller.owner?.username === username; }
