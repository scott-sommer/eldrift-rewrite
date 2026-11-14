import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/app/native-logistics';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const memory = Memory as Memory & { linkReversal?: number[][] };
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, linksEnabled: true, linkServiceEnabled: true,
    linkControllerTrigger: 0, linkStorageAssistTrigger: memory.linkReversal ? 1 : 0.5, linkStorageTarget: memory.linkReversal ? 1 : 0.75 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const creep = Game.creeps['courier']!;
  creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  botLoop();
  const room = Game.rooms['W0N1']!;
  const links = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLink => item.structureType === STRUCTURE_LINK);
  (memory.linkReversal ??= []).push([room.storage!.store.energy, creep.store.energy,
    links.find(link => link.pos.x === 19)!.store.energy, links.find(link => link.pos.x === 29)!.store.energy]);
}
