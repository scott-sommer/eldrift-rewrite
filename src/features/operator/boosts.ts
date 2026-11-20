import type { StatePort } from '../../persistence/versioned-state';
import type { BoostRequest, BoostUnit, BoostStep, BoostJob } from '../../capabilities/industry/boosts/model';
import { boostReadiness, holdsBoostUnit } from '../../capabilities/industry/boosts/model';
import { createBoostRequests } from '../industry/boosts/store';
import { selectBoostPlan } from '../industry/boosts/selection-policy';
import { legacyBoostPreferences } from '../industry/boosts/legacy-preferences';
import type { BoostBudget, BoostPrice } from '../industry/boosts/funding';
export interface OperatorBoostOptions { id: string; expiresAt: number; required: boolean; preferredLab?: string }
export interface BoostOperatorPorts {
  clock(): number;
  unit(name: string): BoostUnit | null;
  budget(home: string,preferredLab?: string): BoostBudget | null;
  supported(step: BoostStep): boolean;
  price: BoostPrice;
}
/** Commands express intent through industry ownership; none can assign observed success or discard tasks. */
export function createBoostOperator(state: StatePort,ports: BoostOperatorPorts) {
  const store = createBoostRequests(state);
  function actor(name: string): BoostUnit {
    const unit = ports.unit(name);
    if (!unit || !unit.owner || !unit.home) throw new Error('Owned creep with population identity is required');
    if (unit.spawning) throw new Error('Use a spawn boost contract for a spawning creep');
    return unit;
  }
  function inspect(owner: string,id: string) {
    const job = store.get(owner,id);
    return job ? present(job) : null;
  }
  function present(job: BoostJob) { return { ...job,readiness: boostReadiness(job),holdsUnit: holdsBoostUnit(job) }; }
  function submit(unit: BoostUnit,steps: readonly BoostStep[],options: OperatorBoostOptions) {
    if (!Array.isArray(steps) || !steps.every(step => ports.supported(step))) throw new Error('Unsupported boost steps');
    const request: BoostRequest = { ...options,unit: unit.id,name: unit.name,owner: unit.owner,home: unit.home,steps };
    const accepted = store.submit(request,ports.clock());
    return { accepted,job: accepted ? inspect(request.owner,request.id) : null };
  }
  return {
    list(home?: string) { return store.read().filter(job => home === undefined || job.request.home === home).map(present); },
    get: inspect,
    request(name: string,steps: readonly BoostStep[],options: OperatorBoostOptions) { return submit(actor(name),steps,options); },
    aliases(name: string,aliases: readonly string[],options: OperatorBoostOptions) {
      const unit = actor(name), budget = ports.budget(unit.home,options.preferredLab);
      if (!budget) return { accepted: false as const,reason: 'home-labs-unavailable' as const };
      const selection = selectBoostPlan(aliases,unit.body,budget,ports.price,legacyBoostPreferences);
      if (selection.status !== 'selected') return { accepted: false as const,reason: 'kit-unavailable' as const,selection };
      return { ...submit(unit,selection.steps,options),selection };
    },
    cancel(owner: string,id: string) { if (!inspect(owner,id)) throw new Error('Boost request is absent'); store.cancel(owner,id); return inspect(owner,id)!; },
    acknowledge(owner: string,id: string) { if (!inspect(owner,id)) throw new Error('Boost request is absent'); store.acknowledge(owner,id); return inspect(owner,id)!; },
  };
}
