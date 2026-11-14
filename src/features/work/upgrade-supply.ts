import type { StatePort } from '../../persistence/versioned-state';
import { bodyPlan, type BodyPart } from '../../capabilities/spawning/body';
import { reconcileTransportCommitment } from '../logistics/transport-commitment';
export interface UpgradeSupplyStore { id: string; owned: boolean; energy: number; free: number }
export interface UpgradeSupplyPlan {
  home: string; target: string; active: boolean; reserve: number; batch: number; lifetime: number;
}
export function upgradeSupplyOwner(home: string, target: string): string {
  if (!home || !target || home === target) throw new Error('Invalid upgrade supply route');
  return 'upgrade-supply:' + JSON.stringify([home, target]);
}
/** Legacy upgradeHauler: 17 MOVE, 33 CARRY; no silent downsizing of this specialist recipe. */
export function upgradeSupplyBody(budget: number) {
  const parts: BodyPart[] = [...Array<BodyPart>(17).fill('move'), ...Array<BodyPart>(33).fill('carry')];
  return bodyPlan(parts, budget);
}
export function reconcileUpgradeSupply(state: StatePort, plan: UpgradeSupplyPlan,
  source: UpgradeSupplyStore | undefined, sink: UpgradeSupplyStore | undefined, tick: number): number {
  if (!Number.isSafeInteger(plan.reserve) || plan.reserve < 0) throw new Error('Invalid upgrade supply reserve');
  const sources = source?.owned ? [{ id: source.id, resource: 'energy', amount: Math.max(0, source.energy - plan.reserve),
    minimumBatch: 1, priority: 0 }] : [];
  const sinks = sink?.owned ? [{ id: sink.id, free: sink.free, priority: 0 }] : [];
  return reconcileTransportCommitment(state, { ...plan, owner: upgradeSupplyOwner(plan.home, plan.target),
    namespace: 'upgrade-supply', priority: 88 }, sources, sinks, tick);
}
