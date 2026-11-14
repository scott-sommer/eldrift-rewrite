import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const memory = Memory as Memory & { controllerLinks?: number[][] };
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, linksEnabled: true, linkControllerTrigger: memory.controllerLinks ? 0.75 : 0 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const links = Game.rooms['W0N1']!.find(FIND_MY_STRUCTURES).filter((item): item is StructureLink => item.structureType === STRUCTURE_LINK);
  const inputs = links.filter(link => link.pos.x < 11).sort((a, b) => a.id.localeCompare(b.id));
  (memory.controllerLinks ??= []).push([...inputs.map(link => link.store.energy), links.find(link => link.pos.x === 19)!.store.energy, links.find(link => link.pos.x === 29)!.store.energy]);
}
