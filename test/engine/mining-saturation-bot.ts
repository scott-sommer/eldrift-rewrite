import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
import { miningOwner } from '../../src/features/mining/demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
interface Sample { tick: number; workers: number; queued: number; energy: number; tiles: string[] }
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { miningEnabled: true, miningBodyBudget: 200 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const memory = Memory as Memory & { saturation?: Sample[] };
  const station = observeMiningStations('W0N1', 'safe')!.find(item => item.kind === 'energy')!;
  const owner = miningOwner(station);
  for (const creep of Object.values(Game.creeps)) creep.memory.population = { owner, home: 'W0N1' };
  const queue = createSpawnQueue(state, 'W0N1');
  if (!memory.saturation) queue.submit({ id: 'excess-miner', name: 'excess-miner', owner, room: 'W0N1',
    priority: 0, readyAt: Game.time, expiresAt: Game.time + 100, body: ['work', 'carry', 'move'] });
  botLoop();
  const record = state.read('reservations/empire') as { data: { claims: { resource: string }[] } };
  const creeps = Object.values(Game.creeps);
  const container = Game.getObjectById(station.container as Id<StructureContainer>)!;
  (memory.saturation ??= []).push({ tick: Game.time, workers: creeps.length, queued: queue.list().length,
    energy: creeps.reduce((total, creep) => total + creep.store.energy, container.store.energy),
    tiles: record.data.claims.map(claim => claim.resource) });
}

