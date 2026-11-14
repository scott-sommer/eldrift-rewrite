import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { upgradeSupplyTarget } from '../features/work/upgrade-supply-identity';
import type { RuntimeConfig } from '../config/model';
/** Keep retired/disabled routes discoverable until their queue and live units have drained. */
export function upgradeSupplyRoutes(state: StatePort, home: string, config: (room: string) => Readonly<RuntimeConfig>): string[] {
  const targets = new Set<string>();
  for (const room of Object.values(Game.rooms)) {
    const settings = config(room.name);
    if (room.name !== home && settings.upgradeSupplyEnabled && settings.upgradeRoomSponsor === home) targets.add(room.name);
  }
  const owners = Object.values(Game.creeps).filter(creep => creep.memory.population?.home === home)
    .map(creep => creep.memory.population!.owner);
  if (state.read(stateKey('spawning', home)) !== undefined) owners.push(...createSpawnQueue(state, home).list().map(request => request.owner));
  for (const owner of owners) {
    const target = upgradeSupplyTarget(owner, home);
    if (target) targets.add(target);
  }
  return [...targets].sort();
}
