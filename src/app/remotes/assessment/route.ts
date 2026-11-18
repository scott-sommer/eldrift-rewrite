import type { RemoteEstimateContext } from '../../../features/remotes/assessment-model';
export function remoteAssessmentRoute(context: RemoteEstimateContext, maximumRooms: number, guard: () => boolean) {
  const { home,room } = context.request;
  if (!guard()) return { status: 'deferred' as const, reason: 'admission' };
  const route = Game.map.findRoute(home,room,{ routeCallback: name => context.traversal.cost(name) });
  const incomplete = context.traversal.diagnostics().incomplete;
  if (incomplete) return { status: 'deferred' as const, reason: incomplete };
  if (route === ERR_NO_PATH) return { status: 'deferred' as const, reason: 'room-route' };
  const rooms = [home,...route.map(step => step.room)];
  if (rooms.length > maximumRooms) return { status: 'deferred' as const, reason: 'room-limit' };
  if (!rooms.every(context.traversal.allows)) return { status: 'deferred' as const, reason: 'room-policy' };
  return { status: 'complete' as const, rooms };
}
