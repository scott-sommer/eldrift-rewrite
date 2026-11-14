import { populationMemory, observePopulation, observeSpawning } from '../../src/adapters/screeps/population';
import { loop as botLoop } from '../../src/main';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { sourceMiner } from '../../src/capabilities/spawning/economy-recipes';
import { createSpawnCoordinator } from '../../src/features/population/spawn-coordinator';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const state = createMemoryPort(() => Memory);
function coordinator() { return createSpawnCoordinator(state, { clock: () => Game.time, invoke: createNativeSpawn(populationMemory) }, observeSpawning, 'skip'); }
declare global { interface Memory { spawnEvidence?: { accepted: number; observed: boolean[]; spawning: boolean[] } } }
export function loop() {
  botLoop();
  const evidence = Memory.spawnEvidence ??= { accepted: 0, observed: [], spawning: [] };
  const queue = createSpawnQueue(state, 'W0N1');
  if (evidence.observed.length === 0) {
    queue.submit({ id: 'miner-1', name: 'new-miner', owner: 'economy', room: 'W0N1',
      priority: 1, readyAt: Game.time, expiresAt: Game.time + 20, body: sourceMiner(200)!.parts });
  }
  const creep = Game.creeps['new-miner'];
  if (creep && !observePopulation().some(unit => unit.name === creep.name && unit.owner === 'economy' && unit.room === 'W0N1')) throw new Error('Population identity lost');
  evidence.observed.push(creep !== undefined);
  evidence.spawning.push(creep?.spawning ?? false);
  const receipts = coordinator()();
  if (coordinator()().length !== 0) throw new Error('Reconstructed coordinator dispatched twice');
  evidence.accepted += receipts.filter(receipt => receipt.status === 'accepted').length;
  if (creep && queue.list().length !== 0) throw new Error('Observed birth did not reconcile queue');
}

