import { loop as botLoop } from '../../src/main';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const state = createMemoryPort(() => Memory);
interface Row { ttl: number; boosted: boolean; spawning: boolean; codes: number[]; energy: number }
declare global { interface Memory { structureActions?: Row[] } }
export function loop() {
  botLoop();
  const rows = Memory.structureActions ??= [];
  const dispatch = createNativeDispatch(state);
  const spawn = Object.values(Game.spawns)[0]!;
  const creep = Game.creeps.renewal!;
  const lab = creep.room.find(FIND_MY_STRUCTURES).find(s => s.structureType === STRUCTURE_LAB) as StructureLab;
  const row: Row = { ttl: creep.ticksToLive!, boosted: !!creep.body[0]!.boost, spawning: !!spawn.spawning, codes: [], energy: spawn.room.energyAvailable };
  if (rows.length === 0) {
    createSpawnQueue(state, spawn.room.name).submit({ id: 'deferred', name: 'deferred', owner: 'fixture', room: spawn.room.name,
      priority: 1, readyAt: Game.time, expiresAt: Game.time + 20, body: ['move'] });
    row.codes.push(dispatch.structures.renew(spawn, creep, 'upgrade'));
    row.codes.push(createNativeDispatch(state).structures.renew(spawn, creep, 'upgrade'));
    row.codes.push(dispatch.structures.boost(lab, creep, 'upgrade'));
  }
  if (rows.length === 1) {
    row.codes.push(dispatch.structures.boost(lab, creep, 'upgrade'));
    row.codes.push(dispatch.structures.renew(spawn, creep, 'upgrade'));
  }
  dispatch.activate();
  dispatch.flush();
  rows.push(row);
}
