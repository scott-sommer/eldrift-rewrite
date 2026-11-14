import type { RouteFinder } from '../../capabilities/movement/room-route';
export const findRoomRoute: RouteFinder = (origin, destination, cost) => {
  const result = Game.map.findRoute(origin, destination, { routeCallback: room => cost(room) });
  return result === ERR_NO_PATH ? null : result.map(step => step.room);
};
