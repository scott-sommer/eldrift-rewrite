import { nativeHarvestRate } from '../../src/adapters/screeps/mining-rates';
import { loop as botLoop } from '../../src/main';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeMiner } from '../../src/adapters/screeps/mining';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
export function loop() {
  botLoop();
  const memory = Memory as Memory & { specialistMining?: { linkEnergy: number[]; mineralAmount: number[]; mineralOutcomes: string[] } };
  const evidence = memory.specialistMining ??= { linkEnergy: [], mineralAmount: [], mineralOutcomes: [] };
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const mine = createNativeMiner(arbiter, movement);
  const stations = observeMiningStations('W0N1', 'safe')!;
  for (const [name, x] of [['link-miner', 20], ['mineral-miner', 30]] as const) {
    const creep = Game.creeps[name]!;
    const station = stations.find(item => item.position.x === x && item.position.y === 20)!;
    const expectedRate = name === 'link-miner' ? 2 : 1 / 6;
    if (nativeHarvestRate(creep.body, station.kind) !== expectedRate) throw new Error('Unexpected mining production rate');
    const outcome = mine(creep, { owner: name, station, tile: { room: 'W0N1', x, y: 21 },
      assigned: true, unsafe: false, retreat: { room: 'W0N1', x: 15, y: 16 },
      policy: { version: 'specialist', blockedRooms: [], costs: {}, maximumRooms: 4 } });
    if (name === 'link-miner') evidence.linkEnergy.push(Game.getObjectById(station.link as Id<StructureLink>)!.store.energy);
    else {
      evidence.mineralAmount.push(creep.store.H ?? 0);
      evidence.mineralOutcomes.push(outcome.status === 'blocked' ? outcome.reason : outcome.status);
    }
  }
  movement.flush();
}

