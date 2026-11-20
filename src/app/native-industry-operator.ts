import { createMemoryPort } from '../adapters/screeps/memory';
import { createBoostOperator } from '../features/operator/boosts';
import { nativeBoostBudget } from './native-boost-budget';
import { configurationFor } from '../config/provider';
import { resolveConfig } from '../config/resolve';
import { operatorSchema } from '../features/operator/state';
import { peekState } from '../persistence/versioned-state';
import type { BoostStep } from '../capabilities/industry/boosts/model';
function supported(step: BoostStep): boolean {
  if (!step || typeof step.part !== 'string' || typeof step.resource !== 'string') return false;
  const catalog = BOOSTS as Record<string,Record<string,unknown>>;
  return Object.hasOwn(catalog,step.part) && Object.hasOwn(catalog[step.part]!,step.resource);
}
export function createNativeIndustryOperator() {
  const state = createMemoryPort(() => Memory);
  const boosts = createBoostOperator(state,{
    clock: () => Game.time,
    unit(name) {
      const creep = Game.creeps[name];
      if (!creep?.my) return null;
      return { id: creep.id,name: creep.name,owner: creep.memory.population?.owner ?? '',home: creep.memory.population?.home ?? '',spawning: creep.spawning,
        body: creep.body.map(part => ({ type: part.type,hits: part.hits,boost: part.boost === undefined || part.boost === null ? null : String(part.boost) })) };
    },
    budget(home,preferredLab) {
      const room = Game.rooms[home];
      if (!room?.controller?.my || !room.find(FIND_MY_STRUCTURES).some(item => item.structureType === STRUCTURE_LAB && item.isActive() && (preferredLab === undefined || item.id === preferredLab))) return null;
      const saved = peekState(state,'operator/config',operatorSchema) ?? {};
      return nativeBoostBudget(state,room,resolveConfig(configurationFor(saved,home),Game.time).values,preferredLab);
    },
    supported,
    get price() { return { mineral: LAB_BOOST_MINERAL,energy: LAB_BOOST_ENERGY }; },
  });
  return { boosts };
}
