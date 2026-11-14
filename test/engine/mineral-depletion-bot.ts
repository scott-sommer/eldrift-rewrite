import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeMiner } from '../../src/adapters/screeps/mining';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
export function loop() {
  botLoop();
  const memory = Memory as Memory & { depletionEvidence?: number[][] };
  const evidence = memory.depletionEvidence ??= [];
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const station = observeMiningStations('W0N1', 'safe')!.find(item => item.position.x === 30 && item.position.y === 20)!;
  const creep = Game.creeps['mineral-miner']!;
  const container = Game.getObjectById(station.container as Id<StructureContainer>)!;
  evidence.push([creep.store.H ?? 0, container.store.H ?? 0]);
  createNativeMiner(arbiter, movement)(creep, { owner: 'depletion', station,
    tile: { room: 'W0N1', x: 30, y: 21 }, assigned: true, unsafe: false,
    retreat: { room: 'W0N1', x: 15, y: 16 }, policy: { version: 'test', blockedRooms: [], costs: {}, maximumRooms: 4 } });
  movement.flush();
}
