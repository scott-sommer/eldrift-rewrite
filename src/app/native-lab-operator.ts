import type { StatePort } from '../persistence/versioned-state';
import { createLabOperator } from '../features/operator/labs';
import { reactionReagents } from '../capabilities/industry/labs/model';
export function createNativeLabOperator(state: StatePort) {
  return createLabOperator(state,{
    clock: () => Game.time,owns: home => Game.rooms[home]?.controller?.my === true,
    productSupported: product => reactionReagents(REACTIONS,product) !== null,
    labs(home) {
      const room = Game.rooms[home]; if (!room) return [];
      return room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB)
        .map(lab => ({ id: lab.id,active: lab.isActive(),mineral: lab.mineralType,amount: lab.mineralAmount,energy: lab.store.energy,cooldown: lab.cooldown }));
    },
  });
}
