import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observePopulation } from '../adapters/screeps/population';
import { distributor } from '../capabilities/spawning/economy-recipes';
import { distributorOwner } from '../features/logistics/identity';
import { applyPopulationDemand } from '../features/population/apply-demand';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { distributorTarget } from '../features/recovery/distributor-policy';
/** Distributor policy shares hauling execution while retaining independent population ownership. */
export function maintainNativeDistributors(state: StatePort, room: Room, config: Readonly<RuntimeConfig>, active: boolean): void {
  const owner = distributorOwner(room.name);
  const energy = (room.storage?.store.energy ?? 0) + (room.terminal?.store.energy ?? 0);
  const target = config.distributorSpawningEnabled ? distributorTarget(config.distributorTarget, active, energy, config.recoveryDistributorRestartEnergy) : 0;
  const units = target ? observePopulation().filter(unit => unit.room === room.name && unit.owner === owner) : [];
  const budget = Math.min(config.distributorBodyBudget, units.length ? room.energyCapacityAvailable : room.energyAvailable);
  const body = target ? distributor(budget, room.controller!.level)?.parts : undefined;
  if (!body) {
    cancelDistributors(state, room.name, owner);
    return;
  }
  applyPopulationDemand(state, { owner, room: room.name, body, desired: target,
    replacementParts: body.length, travelTicks: 0, marginTicks: 10,
    priority: 4, requestLifetime: 100 }, units, Game.time);
}

function cancelDistributors(state: StatePort, room: string, owner: string): void {
  if (state.read('spawning/' + room) === undefined) return;
  const queue = createSpawnQueue(state, room);
  for (const request of queue.list().filter(item => item.owner === owner)) queue.cancel(request.id, owner);
}
