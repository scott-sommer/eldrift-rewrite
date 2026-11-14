import type { UnitIdentity } from '../../persistence/units/schema';
/** Includes spawning creeps and owned creeps in every room on this shard. */
export function ownedCreepRoster(): UnitIdentity[] {
  return Object.values(Game.creeps).map(creep => ({ name: creep.name, id: creep.id }));
}
