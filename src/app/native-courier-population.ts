import { stateKey } from '../persistence/state-key';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observePopulation } from '../adapters/screeps/population';
import { courier } from '../capabilities/spawning/economy-recipes';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { haulingOwner } from '../features/logistics/identity';
import { applyCourierDemand, courierCapacity } from '../features/logistics/courier-demand';
export function cancelCourierDemand(state: StatePort, room: string): void {
  if (state.read(stateKey('spawning', room)) === undefined) return;
  const queue = createSpawnQueue(state, room);
  for (const request of queue.list().filter(item => item.owner === haulingOwner(room))) queue.cancel(request.id, request.owner);
}
/** Bootstrap floor only; measured station route demand is a separate integration obligation. */
export function maintainNativeCouriers(state: StatePort, room: Room, config: Readonly<RuntimeConfig>): void {
  if (!config.courierSpawningEnabled) { cancelCourierDemand(state, room.name); return; }
  const owner = haulingOwner(room.name);
  const units = observePopulation().filter(unit => unit.room === room.name && unit.owner === owner)
    .map(unit => ({ ...unit, capacity: Game.creeps[unit.name]!.store.getCapacity() }));
  const budget = Math.min(config.courierBodyBudget, units.length ? room.energyCapacityAvailable : room.energyAvailable);
  const body = courier(budget)?.parts;
  if (!body) { cancelCourierDemand(state, room.name); return; }
  const work = createLogisticsRequests(state, room.name).pending(Game.time).length > 0;
  applyCourierDemand(state, { owner, room: room.name, body, routes: [], utilization: 0.8,
    minimumCapacity: work ? courierCapacity(body) : 0, travelTicks: 25, marginTicks: 10, priority: 1, requestLifetime: 100 }, units, Game.time);
}

