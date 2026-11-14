import { scavengerOwner } from '../features/logistics/identity';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observePopulation } from '../adapters/screeps/population';
import { maintainRecoveryScavengers } from '../features/recovery/scavenger-demand';
export function maintainNativeScavengers(state: StatePort, room: Room, config: Readonly<RuntimeConfig>, active: boolean): void {
  const enabled = active && config.recoveryScavengerEnabled;
  const units = enabled ? observePopulation().filter(unit => unit.room === room.name && unit.owner === scavengerOwner(room.name))
    .map(unit => ({ ...unit, body: Game.creeps[unit.name]!.body.map(part => part.type) })) : [];
  maintainRecoveryScavengers(state, { room: room.name, active: enabled,
    availableEnergy: room.energyAvailable, capacityEnergy: room.energyCapacityAvailable,
    maximumBudget: config.recoveryScavengerBodyBudget }, units, Game.time);
}
