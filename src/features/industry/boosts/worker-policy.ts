import type { BodyPart } from '../../../capabilities/spawning/body';
import type { SpawnBoost } from '../../../capabilities/spawning/boost';
import type { WorkerBoostConfig } from '../../../config/worker-boosts';
import type { BoostBudget, BoostPrice } from './selection-policy';
import { selectLegacyBoostPlan } from './legacy-preferences';
import { copyBoostBudget, spendBoostBudget } from './funding';
/** Per-recruitment-pass ledger: one selected kit can fund only one new birth. */
export function createWorkerBoostPolicy(config: Readonly<Pick<WorkerBoostConfig,'workerBoostPolicy' | 'workerBoostTimeout'> & Partial<Pick<WorkerBoostConfig,'workerBuilderRecipe'>>>,available: BoostBudget,price: BoostPrice) {
  const budget = copyBoostBudget(available);
  return (mode: 'builder' | 'fortifier' | 'upgrader',body: readonly BodyPart[]): SpawnBoost | null | 'wait' => {
    if (config.workerBoostPolicy === 'off' || mode === 'fortifier') return null;
    const aliases = mode === 'upgrader' ? ['upgrade'] : ['move','carry','build'];
    const result = selectLegacyBoostPlan(aliases,{ role: mode,remoteUpgrader: false,body: body.map(type => ({ type,hits: 100,boost: null })) },recipeBudget(config.workerBuilderRecipe,mode,budget),price);
    if (result.status !== 'selected') return config.workerBoostPolicy === 'required' ? 'wait' : null;
    spendBoostBudget(budget,result.steps,price);
    return { steps: result.steps,required: config.workerBoostPolicy === 'required',timeout: config.workerBoostTimeout };
  };
}

function recipeBudget(recipe: WorkerBoostConfig['workerBuilderRecipe'] | undefined,mode: string,budget: BoostBudget): BoostBudget {
  if (recipe !== 'boosted' || mode !== 'builder') return budget;
  return { ...budget,resources: ['XZHO2','XKH2O','XLH2O'].filter(resource => budget.resources === undefined || budget.resources.includes(resource)) };
}
