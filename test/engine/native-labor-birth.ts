import { populationMemory } from '../../src/adapters/screeps/population';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { reserveExpectedSpawnIdentity } from '../../src/features/population/spawn-identity';
import { materializeQuotedBirth } from '../../src/features/population/quoted-birth';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import type { StartupScheduledBirth } from '../../src/capabilities/economy/startup/spawn-model';
import type { NativeLaborProof } from './native-labor-model';
/** Controlled fixture publication, not production economic/workforce admission. */
export function spawnNativeLabor(proof: NativeLaborProof, request: SpawnRequest, birth: StartupScheduledBirth, spawn: StructureSpawn): number {
  if (!proof.complete) return createNativeSpawn(() => ({}),() => [spawn])({ request,spawn: spawn.id,cost: birth.cost });
  const proposal = proof.proposal!, state = createMemoryPort(() => Memory);
  const materialized = materializeQuotedBirth(request,birth,proposal.input.observedAt,Game.time);
  if (materialized.status !== 'ready') throw new Error('Native quoted birth missed its frame');
  const id = reserveExpectedSpawnIdentity(state,request.room,request.id);
  if (!id) throw new Error('Native quoted identity lost its reservation race');
  const queue = createSpawnQueue(state,request.room); queue.submit(materialized.request);
  const pending = queue.list().find(item => item.id === id)!;
  const code = createNativeSpawn(populationMemory,() => [spawn])({ request: pending,spawn: spawn.id,cost: birth.cost });
  proof.birthQueue = { id,readyAt: pending.readyAt,expiresAt: pending.expiresAt,activeAt: materialized.activeAt,reserved: true,removed: code === OK && queue.cancel(id,request.owner) };
  return code;
}
