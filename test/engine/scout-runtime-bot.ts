import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createScoutControlStore } from '../../src/features/intel/scout-control-store';
import { createScoutHistoryStore } from '../../src/features/intel/scout-store';
import { createIntelStore } from '../../src/features/intel/store';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const state = createMemoryPort(() => Memory);
export function loop() {
  const flags = globalThis as typeof globalThis & { scoutSpawnFixture?: boolean; scoutDefaultFixture?: boolean; scoutExploreFixture?: boolean; scoutBlockedFixture?: boolean };
  const automatic = !!flags.scoutSpawnFixture;
  const memory = Memory as Memory & { scoutRuntimeRows?: unknown[]; scoutRuntimeDeath?: { id: string; tick: number; result: number }; scoutRuntimeWitness?: string };
  if (Game.time === 1) {
    const settings = openState(state,'operator/config',operatorSchema);
    settings.empire = { scoutsEnabled: true, scoutSpawningEnabled: automatic, scoutCount: 1,
      scoutAssignedRooms: flags.scoutExploreFixture ? [] : flags.scoutBlockedFixture ? ['E0N1','W0N2'] : ['E0N1'],
      ...(!flags.scoutExploreFixture ? { scoutDepth: 0, scoutExtendedDepth: 0 } : {}),
      ...(!flags.scoutDefaultFixture ? { scoutPlanCpuBudget: 100, scoutControlCpuBudget: 100 } : {}) };
    saveState(state,'operator/config',operatorSchema,settings);
    if (!automatic) Game.creeps['rewrite-scout']!.memory.population = { owner: 'scout:W0N1', home: 'W0N1' };
    state.write('sentinel/scout', { owner: 'fixture', version: 1, data: { kept: 23 } });
    memory.scoutRuntimeWitness = JSON.stringify(state.read('sentinel/scout'));
  }
  botLoop();
  const units = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === 'scout:W0N1');
  if (automatic && !flags.scoutExploreFixture && Game.time === 20) {
    const creep = units.find(unit => !unit.spawning)!;
    memory.scoutRuntimeDeath = { id: creep.id, tick: Game.time, result: creep.suicide() };
  }
  const controls = createScoutControlStore(state).read(), history = createScoutHistoryStore(state).read();
  const intel = createIntelStore(state).peek('E0N1',Game.time);
  (memory.scoutRuntimeRows ??= []).push({ tick: Game.time,
    units: units.map(creep => ({ id: creep.id, name: creep.name, room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y, spawning: creep.spawning })),
    controls: controls.units, losses: history.losses, lastSeen: intel.record.lastSeen, lastVisit: intel.record.lastVisit,
    alternateVisit: createIntelStore(state).peek('W0N2',Game.time).record.lastVisit,
    pending: createSpawnQueue(state,'W0N1').list().filter(request => request.owner === 'scout:W0N1').length });
}
