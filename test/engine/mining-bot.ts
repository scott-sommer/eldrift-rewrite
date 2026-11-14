import { loop as botLoop } from '../../src/main';
import { createMiningTaskBehavior } from '../../src/app/mining-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStationStore } from '../../src/features/mining/station-store';
import { assignMiningTask } from '../../src/app/assign-mining-task';

import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeMiner } from '../../src/adapters/screeps/mining';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
const policy = { version: 'mining-engine', blockedRooms: [], costs: {}, maximumRooms: 4 };
export function loop() {
  botLoop();
  const memory = Memory as Memory & { miningEvidence?: { positions: number[][]; stores: number[][]; outcomes: string[] } };
  const evidence = memory.miningEvidence ??= { positions: [], stores: [], outcomes: [] };
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const mine = createNativeMiner(arbiter, movement);
  const creep = Game.creeps['miner']!;
  const station = observeMiningStations('W0N1', 'safe')!.find(item => item.position.x === 20 && item.position.y === 20)!;
  const container = Game.getObjectById(station.container as Id<StructureContainer>)!;
  evidence.positions.push([creep.pos.x, creep.pos.y]);
  evidence.stores.push([creep.store.energy, container.store.energy]);
  const state = createMemoryPort(() => Memory);
  createStationStore(state, 'W0N1').observe(Game.time, [station]);
  const behaviors = { mine: createMiningTaskBehavior<Creep>(state, {
    clock: () => Game.time, unit: worker => worker.name,
    run: (worker, observed, tile, assigned, owner) => mine(worker, { owner, station: observed, tile, assigned,
      unsafe: observed.risk === 'hostile', retreat: { room: 'W0N1', x: 15, y: 16 }, policy }),
  }) };
  assignMiningTask(state, behaviors, creep.name, station, Game.time, 100);
  evidence.outcomes.push(createTaskRunner(state, behaviors, () => Game.time)(creep.name, creep)!.status);
  movement.flush();
}


