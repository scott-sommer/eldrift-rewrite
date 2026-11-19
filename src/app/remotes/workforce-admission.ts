import type { StatePort } from '../../persistence/versioned-state';
import type { RuntimeConfig } from '../../config/model';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import { observePopulation } from '../../adapters/screeps/population';
import { createIntentAdmission } from '../../persistence/intent-admission';
import { remoteWorkforceIdentity, remoteWorkforceOwner } from '../../features/remotes/workforce';
import { remoteConstructionIdentity } from '../../features/remotes/infrastructure/worker-identity';
/** Shared physical workforce ceilings include same-tick admissions before native Game.creeps updates. */
export function admitRemoteWorkforceSpawn(state: StatePort, request: SpawnRequest, config: (home: string) => Readonly<RuntimeConfig>): boolean {
  const builder = remoteConstructionIdentity(request.owner), identity = remoteWorkforceIdentity(request.owner);
  if (!identity) return !remoteWorkforceOwner(request.owner);
  const settings = config(identity.home), roster = observePopulation().filter(unit => unit.room === identity.home);
  const remote = roster.filter(unit => remoteWorkforceOwner(unit.owner)).length, construction = roster.filter(unit => remoteConstructionIdentity(unit.owner)).length;
  const admission = createIntentAdmission(state,() => Game.time), pool = 'remote-workforce:'+identity.home, workerPool = 'remote-construction:'+identity.home;
  const available = Math.max(0,settings.remoteWorkerMaximumUnits-remote), builders = Math.max(0,settings.remoteConstructionMaximumWorkers-construction);
  if (admission.remaining(pool,available) < 1 || builder && admission.remaining(workerPool,builders) < 1) return false;
  if (!admission.admit(request.owner,['remote-workforce-request:'+request.id],{ pool,amount: 1,available })) return false;
  return !builder || admission.admit(request.owner,['remote-construction-request:'+request.id],{ pool: workerPool,amount: 1,available: builders });
}
