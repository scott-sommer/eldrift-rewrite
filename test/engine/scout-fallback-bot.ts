import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createScoutControlStore } from '../../src/features/intel/scout-control-store';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createIntelStore } from '../../src/features/intel/store';
const state = createMemoryPort(() => Memory);
export function loop() {
  const memory = Memory as Memory & { scoutFallbackRows?: unknown[]; scoutFallbackOperations?: unknown[]; scoutFallbackWitness?: string };
  if (Game.time === 1) {
    const settings = openState(state,'operator/config',operatorSchema);
    settings.empire = { scoutsEnabled: true, scoutSpawningEnabled: true, scoutFallbackFlag: 'Fallback:',
      scoutDepth: 0, scoutExtendedDepth: 0, scoutCount: 1 };
    saveState(state,'operator/config',operatorSchema,settings);
    memory.scoutFallbackOperations = [Game.rooms.W0N1!.createFlag(40,25,'Fallback:A'),
      Game.rooms.W0N1!.createFlag(45,45,'Other-Fallback:Z')];
    state.write('sentinel/fallback', { owner: 'fixture', version: 1, data: { kept: ['unrelated', 17] } });
    memory.scoutFallbackWitness = JSON.stringify(state.read('sentinel/fallback'));
  }
  if (Game.time === 40) memory.scoutFallbackOperations!.push(Game.flags['Fallback:A']!.setPosition(new RoomPosition(10,25,'W0N1')));
  if (Game.time === 85) memory.scoutFallbackOperations!.push(Game.flags['Fallback:A']!.remove());
  if (Game.time === 135) memory.scoutFallbackOperations!.push(Game.flags['Other-Fallback:Z']!.remove());
  botLoop();
  const units = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === 'scout:W0N1');
  (memory.scoutFallbackRows ??= []).push({ tick: Game.time,
    units: units.map(creep => ({ id: creep.id, name: creep.name, spawning: creep.spawning, x: creep.pos.x, y: creep.pos.y, room: creep.pos.roomName })),
    flags: Object.values(Game.flags).map(flag => ({ name: flag.name, x: flag.pos.x, y: flag.pos.y, room: flag.pos.roomName })),
    controls: createScoutControlStore(state).read().units,
    pending: createSpawnQueue(state,'W0N1').list().filter(request => request.owner === 'scout:W0N1').length,
    visit: createIntelStore(state).peek('W0N1',Game.time).record.lastVisit,
    witness: JSON.stringify(state.read('sentinel/fallback')) });
}
