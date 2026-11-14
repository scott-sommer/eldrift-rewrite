import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeMiner } from '../../src/adapters/screeps/mining';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
const policy = { version: 'mining-engine', blockedRooms: [], costs: {}, maximumRooms: 4 };
export function loop() {
  botLoop();
  const memory = Memory as Memory & { miningEvidence?: { positions: number[][]; stores: number[][]; outcomes: string[] } };
  const evidence = memory.miningEvidence ??= { positions: [], stores: [], outcomes: [] };
  // Reconstruct services each tick to exercise reset-safe travel and native work.
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const mine = createNativeMiner(arbiter, movement);
  const creep = Game.creeps['miner']!;
  const station = observeMiningStations('W0N1', 'safe')!.find(item => item.position.x === 20 && item.position.y === 20)!;
  const container = Game.getObjectById(station.container as Id<StructureContainer>)!;
  evidence.positions.push([creep.pos.x, creep.pos.y]);
  evidence.stores.push([creep.store.energy, container.store.energy]);
  evidence.outcomes.push(mine(creep, { owner: 'mining-test', station, tile: { room: 'W0N1', x: 20, y: 21 },
    assigned: true, unsafe: false, retreat: { room: 'W0N1', x: 15, y: 16 }, policy }).status);
  movement.flush();
}
