import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, linksEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const links = Game.rooms['W0N1']!.find(FIND_MY_STRUCTURES).filter((item): item is StructureLink => item.structureType === STRUCTURE_LINK).sort((a, b) => Number(a.pos.x === 19) - Number(b.pos.x === 19) || a.id.localeCompare(b.id));
  const memory = Memory as Memory & { linkSupply?: number[][] };
  (memory.linkSupply ??= []).push(links.map(link => link.store.energy));
}
