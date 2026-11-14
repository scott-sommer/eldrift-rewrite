import type { StatePort } from '../../persistence/versioned-state';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
import type { BodyPart } from '../../capabilities/spawning/body';
import { reconcileRenewableFleet } from '../population/renewable-fleet';
import { upgradeOwner } from './upgrade-identity';
export interface UpgradeFleetPlan { home: string; target: string; desired: number; enabled: boolean; body?: readonly BodyPart[] }
export function maintainUpgradeFleet(state: StatePort, plan: UpgradeFleetPlan, units: readonly PopulationUnit[],
  otherQueues: readonly SpawnRequest[], tick: number): void {
  reconcileRenewableFleet(state, { ...plan, owner: upgradeOwner(plan.target), maximum: 7, priority: 127, priorityStep: 5 }, units, otherQueues, tick);
}
