import { specialistBoostLabIds, specialistLabRoleAllowed } from './native-specialist-labs';
import { peekState } from '../persistence/versioned-state';
import { operatorSchema } from '../features/operator/state';
import { configurationFor } from '../config/provider';
import { resolveConfig } from '../config/resolve';
import { createReactionControl } from '../features/industry/reaction-control';
import { createEmpireLabOperator } from '../features/operator/lab-empire';
import { createLabMaintenanceOperator } from '../features/operator/lab-maintenance';
import { createNativeLabAllocation } from './native-lab-allocation';
import type { StatePort } from '../persistence/versioned-state';
import { createLabOperator } from '../features/operator/labs';
import { reactionReagents } from '../capabilities/industry/labs/model';
export function createNativeLabOperator(state: StatePort) {
  const protectedLabs = (home: string) => specialistBoostLabIds(home,resolveConfig(configurationFor(peekState(state,'operator/config',operatorSchema) ?? {},home),Game.time).values);
  const commands = createLabOperator(state,{
    roleAllowed: (home,role) => specialistLabRoleAllowed(protectedLabs(home),role),
    clock: () => Game.time,owns: home => Game.rooms[home]?.controller?.my === true,
    boostSupported: resource => Object.values(BOOSTS).some(part => Object.hasOwn(part,resource)),
    productSupported: product => reactionReagents(REACTIONS,product) !== null,
    labs(home) {
      const room = Game.rooms[home]; if (!room) return [];
      return room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB)
        .map(lab => ({ id: lab.id,active: lab.isActive(),mineral: lab.mineralType ?? null,amount: lab.mineralAmount ?? 0,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,cooldown: lab.cooldown ?? 0 }));
    },
  });
  return { ...commands,...createReactionControl(state),...createNativeLabAllocation(commands,protectedLabs),...createEmpireLabOperator(state,{ clock: () => Game.time,homes: () => Object.values(Game.rooms).filter(room => room.controller?.my).map(room => room.name),productSupported: product => reactionReagents(REACTIONS,product) !== null }),...createLabMaintenanceOperator(state,home => Game.rooms[home]?.controller?.my === true) };
}
