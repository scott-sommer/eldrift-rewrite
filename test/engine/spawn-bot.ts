import { loop as botLoop } from '../../src/main';
import { createSpawnExecutor } from '../../src/capabilities/spawning/execute';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { sourceMiner } from '../../src/capabilities/spawning/economy-recipes';
const executor = createSpawnExecutor({ clock: () => Game.time, invoke: createNativeSpawn(() => ({})) });
declare global { interface Memory { spawnEvidence?: { accepted: number; observed: boolean[]; spawning: boolean[] } } }
export function loop() {
  botLoop();
  const evidence = Memory.spawnEvidence ??= { accepted: 0, observed: [], spawning: [] };
  const creep = Game.creeps['new-miner'];
  evidence.observed.push(creep !== undefined);
  evidence.spawning.push(creep?.spawning ?? false);
  const spawn = Game.spawns['Spawn1']!;
  const plan = sourceMiner(200)!;
  const assignments = evidence.accepted === 0 ? [{
    spawn: spawn.id, cost: plan.cost, request: { id: 'miner-1', name: 'new-miner', owner: 'economy', room: spawn.room.name,
      priority: 1, readyAt: Game.time, expiresAt: Game.time + 20, body: plan.parts },
  }] : [];
  const receipts = executor.execute(assignments);
  if (executor.execute(assignments) !== receipts) throw new Error('Duplicate spawn dispatch');
  evidence.accepted += receipts.filter(receipt => receipt.status === 'accepted').length;
}
