import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { planSchema } from '../../src/features/planning/plan-state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps.build!;
  creep.memory.population ??= { owner: 'work:W0N1', home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  if (Game.time === 1) {
    const schema = planSchema('W0N1', ['road', 'extension']);
    const plan = openState(state, 'planning/W0N1', schema);
    plan.entries = [
      { type: 'road', x: 22, y: 21, rcl: 1, priority: 1, source: 'strategy' },
      { type: 'extension', x: 21, y: 22, rcl: 2, priority: 0, source: 'strategy', dependencies: ['road:22:21'] },
    ];
    saveState(state, 'planning/W0N1', schema, plan);
  }
  botLoop();
  const sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  const structures = creep.room.find(FIND_STRUCTURES);
  const row = { road: sites.find(site => site.structureType === STRUCTURE_ROAD)?.progress ?? null,
    extension: sites.find(site => site.structureType === STRUCTURE_EXTENSION)?.progress ?? null,
    builtRoad: structures.some(item => item.structureType === STRUCTURE_ROAD && item.pos.x === 22),
    builtExtension: structures.some(item => item.structureType === STRUCTURE_EXTENSION) };
  const memory = Memory as Memory & { dependencies?: (typeof row)[] };
  (memory.dependencies ??= []).push(row);
}
