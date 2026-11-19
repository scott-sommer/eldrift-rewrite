import type { StatePort } from '../../persistence/versioned-state';
import type { RuntimeConfig } from '../../config/model';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import { observePopulation } from '../../adapters/screeps/population';
import { createIntentAdmission } from '../../persistence/intent-admission';
import { remoteFleetIdentity } from '../../features/remotes/fleet/identity';
import { remoteConstructionIdentity, remoteConstructionPrefix } from '../../features/remotes/infrastructure/worker-identity';
/** Shared physical workforce ceilings include same-tick admissions before native Game.creeps updates. */
export function admitRemoteWorkforceSpawn(state: StatePort, request: SpawnRequest, config: (home: string) => Readonly<RuntimeConfig>): boolean {
  const builder = remoteConstructionIdentity(request.owner), identity = builder ?? remoteFleetIdentity(request.owner);
  if (!identity) return !request.owner.startsWith(remoteConstructionPrefix) && !request.owner.startsWith('remote-fleet:');
  const settings = config(identity.home), roster = observePopulation().filter(unit => unit.room === identity.home);
  const remote = roster.filter(unit => remoteOwner(unit.owner)).length, construction = roster.filter(unit => remoteConstructionIdentity(unit.owner)).length;
  const admission = createIntentAdmission(state,() => Game.time), pool = 'remote-workforce:'+identity.home, workerPool = 'remote-construction:'+identity.home;
  const available = Math.max(0,settings.remoteWorkerMaximumUnits-remote), builders = Math.max(0,settings.remoteConstructionMaximumWorkers-construction);
  if (admission.remaining(pool,available) < 1 || builder && admission.remaining(workerPool,builders) < 1) return false;
  if (!admission.admit(request.owner,['remote-workforce-request:'+request.id],{ pool,amount: 1,available })) return false;
  return !builder || admission.admit(request.owner,['remote-construction-request:'+request.id],{ pool: workerPool,amount: 1,available: builders });
}
function remoteOwner(owner: string): boolean { return !!remoteFleetIdentity(owner) || !!remoteConstructionIdentity(owner); }
