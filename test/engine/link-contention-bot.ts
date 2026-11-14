import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/app/native-logistics';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { assignHaulingTask } from '../../src/app/assign-hauling-task';
import { validHaulingPayload } from '../../src/app/hauling-task';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const memory = Memory as Memory & { linkContention?: number[][] };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, linksEnabled: !!memory.linkContention };
  saveState(state, 'operator/config', operatorSchema, settings);
  const structures = Game.rooms['W0N1']!.find(FIND_STRUCTURES);
  const source = structures.find(item => item.structureType === STRUCTURE_LINK && item.pos.x === 9) as StructureLink;
  const sink = structures.find(item => item.structureType === STRUCTURE_LINK && item.pos.x === 19) as StructureLink;
  const origin = structures.find(item => item.structureType === STRUCTURE_CONTAINER && item.pos.x === 18) as StructureContainer;
  const destination = structures.find(item => item.structureType === STRUCTURE_CONTAINER && item.pos.x === 8) as StructureContainer;
  for (const [name, from, to] of [['collector', source.id, destination.id], ['supplier', origin.id, sink.id]] as const) {
    const creep = Game.creeps[name]!;
    creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
    if (!memory.linkContention) {
      const request = { id: name, owner: 'test', source: from, sink: to, resource: 'energy', quantity: 50, priority: 0, expiresAt: 100 };
      createLogisticsRequests(state, 'W0N1').submit(request, Game.time);
      assignHaulingTask(state, { haul: { phases: ['work'], validPayload: validHaulingPayload } }, name, name,
        { home: 'W0N1', unitId: creep.id, request, sinkRoom: 'W0N1' }, Game.time, 100);
    }
  }
  botLoop();
  (memory.linkContention ??= []).push([source.store.energy, sink.store.energy, Game.creeps['collector']!.store.energy,
    Game.creeps['supplier']!.store.energy, destination.store.energy]);
}
