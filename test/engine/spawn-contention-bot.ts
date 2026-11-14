import { loop as botLoop } from '../../src/main';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnCoordinator } from '../../src/features/population/spawn-coordinator';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const state = createMemoryPort(() => Memory);
const rooms = ['W0N1', 'E0N1'];
const run = createSpawnCoordinator(state, { clock: () => Game.time, invoke: createNativeSpawn(() => ({})) }, () => ({
  rooms, energy: Object.fromEntries(rooms.map(room => [room, Game.rooms[room]!.energyAvailable])),
  names: new Set(Object.keys(Game.creeps)),
  slots: Object.values(Game.spawns).map(spawn => ({ id: spawn.id, room: spawn.room.name, busy: spawn.spawning !== null })),
}), 'skip');
declare global { interface Memory { spawnContention?: { accepted: string[]; pending: string[]; observed: string[] } } }
function initialize() {
  for (const [id, room, priority] of [['first', 'W0N1', 0], ['second', 'W0N1', 1], ['cancelled', 'W0N1', -1], ['remote', 'E0N1', 0]] as const) {
    createSpawnQueue(state, room).submit({ id, name: id, room, priority, owner: 'economy', readyAt: Game.time,
      expiresAt: Game.time + 20, body: ['work', 'carry', 'move'] });
  }
  createSpawnQueue(state, 'W0N1').cancel('cancelled', 'economy');
}
export function loop() {
  botLoop();
  if (!Memory.spawnContention) initialize();
  const evidence = Memory.spawnContention ??= { accepted: [], pending: [], observed: [] };
  const receipts = run();
  for (const receipt of receipts) {
    if (receipt.status !== 'accepted') throw new Error(JSON.stringify(receipt));
    evidence.accepted.push(receipt.request);
  }
  evidence.pending = rooms.flatMap(room => createSpawnQueue(state, room).list().map(request => request.id));
  evidence.observed = Object.keys(Game.creeps);
}
