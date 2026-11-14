import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeMiner } from '../../src/adapters/screeps/mining';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
export function loop() {
  botLoop();
  const memory = Memory as Memory & { miningWork?: { hits: number[]; progress: number[]; retreat: number[][]; outcomes: string[] } };
  const evidence = memory.miningWork ??= { hits: [], progress: [], retreat: [], outcomes: [] };
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const mine = createNativeMiner(arbiter, movement);
  const stations = observeMiningStations('W0N1', 'safe')!;
  for (const [name, x] of [['maintain', 20], ['establish', 30], ['retreat', 40]] as const) {
    const creep = Game.creeps[name]!;
    const station = stations.find(item => item.position.x === x && item.position.y === 20)!;
    const outcome = mine(creep, { owner: name, station, tile: { room: 'W0N1', x, y: 21 },
      assigned: true, unsafe: name === 'retreat', retreat: { room: 'W0N1', x: 39, y: 21 },
      policy: { version: 'mining-work', blockedRooms: [], costs: {}, maximumRooms: 4 } });
    evidence.outcomes.push(outcome.status);
    if (name === 'maintain') evidence.hits.push(Game.getObjectById(station.container as Id<StructureContainer>)!.hits);
    if (name === 'establish') evidence.progress.push(creep.room.find(FIND_MY_CONSTRUCTION_SITES)[0]!.progress);
    if (name === 'retreat') evidence.retreat.push([creep.pos.x, creep.pos.y, creep.store.energy]);
  }
  movement.flush();
}
