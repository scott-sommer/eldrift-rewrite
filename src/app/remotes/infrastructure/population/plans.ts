import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../../features/remotes/assignment-demand';
import type { RemoteOutpostDemand } from '../../../../features/remotes/infrastructure/model';
import { allocateRemoteConstruction } from '../../../../features/remotes/infrastructure/worker-budget';
import { constructionWorkAllowed, constructionWorkersEnabled } from './policy';
import { constructionHome, constructionBudget } from './home';
import { createNativeConstructionQuote } from './quote';
import type { NativeConstructionPlan } from './model';
export function createNativeConstructionPlans(state: StatePort) {
  const assignments = createRemoteAssignmentStore(state), quote = createNativeConstructionQuote(state);
  return (home: string, config: Readonly<RuntimeConfig>, guard: () => boolean) => {
    const plans: NativeConstructionPlan[] = [], incomplete = () => ({ complete: false,plans: [],selected: new Set<string>() });
    if (!constructionWorkersEnabled(config)) return { complete: true,plans,selected: new Set<string>() };
    const snapshot = constructionHome(state,home,config);
    if (!snapshot) return { complete: true,plans,selected: new Set<string>() };
    for (const lease of assignments.read().assignments.filter(lease => lease.home === home)) {
      if (!guard()) return incomplete();
      const demand = remoteAssignmentDemands(lease,Game.time).find((item): item is RemoteOutpostDemand => item.kind === 'outpost');
      if (!demand || !constructionWorkAllowed(demand,config)) continue;
      const plan = quote(demand,config,guard,snapshot);
      if (plan) plans.push(plan);
    }
    if (!guard()) return incomplete();
    return { complete: true,plans,selected: new Set(allocateRemoteConstruction(plans,constructionBudget(snapshot,config))) };
  };
}
