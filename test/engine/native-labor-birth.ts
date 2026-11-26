import { populationMemory } from '../../src/adapters/screeps/population';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createNativeLaborPublication } from '../../src/app/native-labor/publication';
import { createNativeLaborObservation } from '../../src/app/remotes/startup/household/labor-observation';
import { materializeLaborBirth } from '../../src/features/work/labor-birth';
import { createNativeLaborBirthAdmission } from '../../src/app/native-labor/birth-admission';
import { createNativeStructureActions } from '../../src/adapters/screeps/structure-actions';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import type { StartupScheduledBirth } from '../../src/capabilities/economy/startup/spawn-model';
import type { NativeLaborProof } from './native-labor-model';
/** Controlled fixture publication, not production economic/workforce admission. */
export function spawnNativeLabor(proof: NativeLaborProof, request: SpawnRequest, birth: StartupScheduledBirth, spawn: StructureSpawn): number {
  if (!proof.complete) return createNativeSpawn(() => ({}),() => [spawn])({ request,spawn: spawn.id,cost: birth.cost });
  const proposal = proof.proposal!, state = createMemoryPort(() => Memory);
  const materialized = materializeLaborBirth(proposal,Game.time,true);
  if (materialized.status !== 'ready') throw new Error('Native quoted birth missed its frame');
  const publisher = createNativeLaborPublication(state,request.room), observe = createNativeLaborObservation(state);
  const published = publisher.publish(proposal,() => { const now = observe(proposal.input); return now.status === 'observed' && JSON.stringify(now.facts) === JSON.stringify(proposal.facts); },() => true);
  if (published !== 'published') throw new Error('Expected durable native publication: '+published);
  proof.publication = { publishedAt: Game.time };
  const id = request.id, queue = createSpawnQueue(state,request.room);
  const pending = queue.list().find(item => item.id === id)!;
  const admit = createNativeLaborBirthAdmission(state,() => true);
  if (!admit(pending)) throw new Error('Native labor birth final admission refused');
  const code = createNativeStructureActions(state,populationMemory).spawn({ request: pending,spawn: spawn.id,cost: birth.cost });
  proof.birthQueue = { id,readyAt: pending.readyAt,expiresAt: pending.expiresAt,activeAt: materialized.activeAt,reserved: true,removed: code === OK && queue.cancel(id,request.owner) };
  return code;
}
