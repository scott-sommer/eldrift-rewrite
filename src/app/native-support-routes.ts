import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { supportTarget } from '../features/recovery/support-identity';
export function supportRouteTargets(state: StatePort, home: string): string[] {
  const targets = new Set(Object.keys(Game.rooms).filter(name => name !== home));
  const owners = Object.values(Game.creeps).filter(creep => creep.memory.population?.home === home)
    .map(creep => creep.memory.population!.owner);
  if (state.read(stateKey('spawning', home))) owners.push(...createSpawnQueue(state, home).list().map(item => item.owner));
  if (state.read(stateKey('logistics-requests', home))) owners.push(...createLogisticsRequests(state, home).pending(Game.time).map(item => item.owner));
  for (const owner of owners) {
    const target = supportTarget(owner, home);
    if (target) targets.add(target);
  }
  return [...targets].sort();
}
