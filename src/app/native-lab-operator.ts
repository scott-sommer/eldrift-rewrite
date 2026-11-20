import { createLabAllocationOperator } from '../features/operator/lab-allocation';
import type { StatePort } from '../persistence/versioned-state';
import { createLabOperator } from '../features/operator/labs';
import { reactionReagents } from '../capabilities/industry/labs/model';
export function createNativeLabOperator(state: StatePort) {
  const commands = createLabOperator(state,{
    clock: () => Game.time,owns: home => Game.rooms[home]?.controller?.my === true,
    boostSupported: resource => Object.values(BOOSTS).some(part => Object.hasOwn(part,resource)),
    productSupported: product => reactionReagents(REACTIONS,product) !== null,
    labs(home) {
      const room = Game.rooms[home]; if (!room) return [];
      return room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB)
        .map(lab => ({ id: lab.id,active: lab.isActive(),mineral: lab.mineralType ?? null,amount: lab.mineralAmount ?? 0,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,cooldown: lab.cooldown ?? 0 }));
    },
  });
  const previewBoostRoles = createLabAllocationOperator({
    settings: home => commands.inspect(home).values,
    supported: resource => Object.values(BOOSTS).some(part => Object.hasOwn(part,resource)),
    room(home) {
      const room = Game.rooms[home]; if (!room?.controller?.my) return null;
      const spawns = room.find(FIND_MY_SPAWNS).sort((a,b) => a.name.localeCompare(b.name));
      const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.isActive());
      return { labs: labs.map(lab => ({ id: lab.id,x: lab.pos.x,y: lab.pos.y })),anchor: spawns[0] ? { x: spawns[0].pos.x,y: spawns[0].pos.y } : null };
    },
  });
  return { ...commands,previewBoostRoles,assignBoostRoles(home: string,requests: Parameters<typeof previewBoostRoles>[1],options?: Parameters<typeof previewBoostRoles>[2]) {
    const result = previewBoostRoles(home,requests,options);
    return result.ok ? { ...result,configuration: commands.configure(home,{ labBoostRoles: result.plan.roles }) } : result;
  } };
}
