import { loop as botLoop } from '../../src/main';
import { createMiningTaskBehavior } from '../../src/app/mining-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { assignMiningTask } from '../../src/app/assign-mining-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStationStore } from '../../src/features/mining/station-store';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeMiner } from '../../src/adapters/screeps/mining';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
export function loop() {
  botLoop();
  const memory = Memory as Memory & { extractorFault?: { reasons: string[]; amounts: number[]; statuses: string[] } };
  const evidence = memory.extractorFault ??= { reasons: [], amounts: [], statuses: [] };
  const state = createMemoryPort(() => Memory);
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const mine = createNativeMiner(arbiter, movement);
  const creep = Game.creeps['mineral-miner']!;
  const station = observeMiningStations('W0N1', 'safe')!.find(item => item.position.x === 30 && item.position.y === 20)!;
  station.access = [{ room: 'W0N1', x: 30, y: 21 }];
  createStationStore(state, 'W0N1').observe(Game.time, [station]);
  const behaviors = { mine: createMiningTaskBehavior<Creep>(state, {
    clock: () => Game.time, unit: worker => worker.name,
    run: (worker, observed, tile, assigned, owner) => {
      const outcome = mine(worker, { station: observed, tile, assigned, owner, unsafe: false,
        retreat: tile, policy: { version: 'extractor-fault', blockedRooms: [], costs: {}, maximumRooms: 4 } });
      evidence.reasons.push(outcome.status === 'blocked' ? outcome.reason : outcome.status);
      return outcome;
    },
  }) };
  assignMiningTask(state, behaviors, creep.name, station, Game.time, 100);
  evidence.statuses.push(createTaskRunner(state, behaviors, () => Game.time)(creep.name, creep)!.status);
  evidence.amounts.push(creep.store.H ?? 0);
  movement.flush();
}
