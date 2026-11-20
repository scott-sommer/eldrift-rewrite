import type { BodyPart } from '../../../capabilities/spawning/body';
import type { SpawnBoost } from '../../../capabilities/spawning/boost';
import type { WorkerBoostConfig } from '../../../config/worker-boosts';
import type { BoostBudget, BoostPrice } from './selection-policy';
import { selectLegacyBoostPlan } from './legacy-preferences';
import { copyBoostBudget, spendBoostBudget } from './funding';
/** Per-recruitment-pass ledger: one selected kit can fund only one new birth. */
export function createWorkerBoostPolicy(config: Readonly<WorkerBoostConfig>,available: BoostBudget,price: BoostPrice) {
  const budget = copyBoostBudget(available);
  return (mode: 'builder' | 'fortifier' | 'upgrader',body: readonly BodyPart[]): SpawnBoost | null | 'wait' => {
    if (config.workerBoostPolicy === 'off' || mode === 'fortifier') return null;
    const aliases = mode === 'upgrader' ? ['upgrade'] : ['move','carry','build'];
    const result = selectLegacyBoostPlan(aliases,{ role: mode,remoteUpgrader: false,body: body.map(type => ({ type,hits: 100,boost: null })) },budget,price);
    if (result.status !== 'selected') return config.workerBoostPolicy === 'required' ? 'wait' : null;
    spendBoostBudget(budget,result.steps,price);
    return { steps: result.steps,required: config.workerBoostPolicy === 'required',timeout: config.workerBoostTimeout };
  };
}
