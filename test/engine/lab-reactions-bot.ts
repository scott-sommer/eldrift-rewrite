import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
interface Row { tick: number; hydrogen: number; oxygen: number; product: number; reserved: number; cooldowns: number[] }
declare global { interface Memory { labReactions?: Row[] } }
export function loop() {
  const room = Game.rooms['W0N1']!;
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  const reserved = labs.find(lab => lab.pos.x === 20 && lab.pos.y === 21)!;
  const state = createMemoryPort(() => Memory), settings = openState(state,'operator/config',operatorSchema);
  settings.empire = { labReactionsEnabled: true,labReactionProduct: 'OH',labReactionTarget: 15,labReagentReserve: 5,labReservedIds: [reserved.id] };
  saveState(state,'operator/config',operatorSchema,settings);
  botLoop();
  const amount = (resource: ResourceConstant) => labs.reduce((sum,lab) => sum+(lab.store.getUsedCapacity(resource) ?? 0),0);
  (Memory.labReactions ??= []).push({ tick: Game.time,hydrogen: amount(RESOURCE_HYDROGEN),oxygen: amount(RESOURCE_OXYGEN),product: amount(RESOURCE_HYDROXIDE),
    reserved: reserved.store.getUsedCapacity(RESOURCE_HYDROXIDE),cooldowns: labs.map(lab => lab.cooldown) });
}
