import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import { remoteConstructionIdentity, remoteConstructionPrefix } from '../../../../features/remotes/infrastructure/worker-identity';
import { createNativeConstructionPlans } from './plans';
import { constructionSpawningEnabled } from './policy';
import { constructionHome, constructionBudget } from './home';
/** Queued work is requalified at dispatch, independently of recruitment scan cadence. */
export function admitRemoteConstructionSpawn(state: StatePort, request: SpawnRequest, config: (home: string) => Readonly<RuntimeConfig>): boolean {
  const identity = remoteConstructionIdentity(request.owner);
  if (!identity) return !request.owner.startsWith(remoteConstructionPrefix);
  if (request.room !== identity.home || (request.home ?? request.room) !== identity.home) return false;
  const settings = config(identity.home);
  if (!constructionSpawningEnabled(settings)) return false;
  const snapshot = constructionHome(state,identity.home,settings);
  if (!snapshot) return false;
  const budget = constructionBudget(snapshot,settings);
  if (budget.liveWorkers >= settings.remoteConstructionMaximumWorkers || budget.additionalSlots === 0) return false;
  const result = createNativeConstructionPlans(state)(identity.home,settings,() => true);
  const plan = result.plans.find(plan => plan.owner === request.owner);
  return result.complete && result.selected.has(request.owner) && !!plan && JSON.stringify(plan.body.parts) === JSON.stringify(request.body);
}
