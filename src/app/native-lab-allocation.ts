import { createLabAllocationOperator } from '../features/operator/lab-allocation';
import { createBulkLabAllocation } from '../features/operator/lab-bulk-allocation';
import type { createLabOperator } from '../features/operator/labs';
export function createNativeLabAllocation(commands: ReturnType<typeof createLabOperator>,excluded: (home: string) => readonly string[] = () => []) {
  const previewBoostRoles = createLabAllocationOperator({
    settings: home => commands.inspect(home).values,
    supported: resource => Object.values(BOOSTS).some(part => Object.hasOwn(part,resource)),
    room(home) {
      const room = Game.rooms[home]; if (!room?.controller?.my) return null;
      const spawns = room.find(FIND_MY_SPAWNS).sort((a,b) => a.name.localeCompare(b.name));
      const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.isActive());
      return { excluded: excluded(home),labs: labs.map(lab => ({ id: lab.id,x: lab.pos.x,y: lab.pos.y })),anchor: spawns[0] ? { x: spawns[0].pos.x,y: spawns[0].pos.y } : null };
    },
  });
  const bulk = createBulkLabAllocation(previewBoostRoles,commands.configureMany);
  const eligible = () => Object.values(Game.rooms).filter(room => room.controller?.my && room.controller.level >= 6).map(room => room.name).sort();
  return { previewBoostRoles,...bulk,
    assignBoostRoles(home: string,requests: Parameters<typeof previewBoostRoles>[1],options?: Parameters<typeof previewBoostRoles>[2]) {
      const result = previewBoostRoles(home,requests,options);
      return result.ok ? { ...result,configuration: commands.configure(home,{ labBoostRoles: result.plan.roles }) } : result;
    },
    previewAllBoostRoles(requests: Parameters<typeof previewBoostRoles>[1],options?: Parameters<typeof previewBoostRoles>[2]) { return bulk.previewBoostRolesForRooms(eligible(),requests,options); },
    assignAllBoostRoles(requests: Parameters<typeof previewBoostRoles>[1],options?: Parameters<typeof previewBoostRoles>[2]) { return bulk.assignBoostRolesForRooms(eligible(),requests,options); },
  };
}
