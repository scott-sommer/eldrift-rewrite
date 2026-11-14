import type { StatePort } from '../../persistence/versioned-state';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
import type { BodyPart } from '../../capabilities/spawning/body';
import { validateRequest } from '../../capabilities/spawning/allocate';
import { createSpawnQueue } from '../population/spawn-queue';
import { reserveSpawnIdentity } from '../population/spawn-identity';
import { upgradeOwner } from './upgrade-identity';
export interface UpgradeFleetPlan { home: string; target: string; desired: number; enabled: boolean; body?: readonly BodyPart[] }
/** Renewable units count until actual death; low TTL must not overfill the seven stations. */
export function maintainUpgradeFleet(state: StatePort, plan: UpgradeFleetPlan, units: readonly PopulationUnit[],
  otherQueues: readonly SpawnRequest[], tick: number): void {
  if (!Number.isSafeInteger(plan.desired) || plan.desired < 0 || plan.desired > 7) throw new Error('Invalid upgrade fleet size');
  const owner = upgradeOwner(plan.target);
  const queue = createSpawnQueue(state, plan.home);
  const own = queue.list().filter(request => request.owner === owner);
  if (!plan.enabled || !plan.body || plan.desired === 0) {
    cancelRequests(queue, own, owner);
    return;
  }
  const template = { owner, room: plan.home, home: plan.target, body: [...plan.body], priority: 127, readyAt: tick, expiresAt: tick + 1500 };
  validateRequest({ ...template, id: 'validation', name: 'validation' });
  const names = new Set(units.map(unit => unit.name));
  const alive = units.filter(unit => unit.owner === owner && unit.room === plan.target).length;
  const active = (request: SpawnRequest) => request.expiresAt > tick && !names.has(request.name);
  const foreign = otherQueues.filter(request => request.owner === owner && active(request)).length;
  const needed = Math.max(0, plan.desired - alive - foreign);
  const keep = own.filter(request => active(request) && request.home === plan.target && JSON.stringify(request.body) === JSON.stringify(plan.body))
    .sort((a, b) => a.id.localeCompare(b.id)).slice(0, needed);
  const keepIds = new Set(keep.map(request => request.id));
  if (queue.list().length - own.length + needed > 200) throw new Error('Upgrade demand exceeds queue capacity');
  cancelRequests(queue, own.filter(request => !keepIds.has(request.id)), owner);
  for (let index = keep.length; index < needed; index++) {
    const id = reserveSpawnIdentity(state, plan.home);
    queue.submit({ ...template, id, name: id, priority: 127 + (alive + foreign + index) * 5 });
  }
}

function cancelRequests(queue: ReturnType<typeof createSpawnQueue>, requests: readonly SpawnRequest[], owner: string): void {
  for (const request of requests) queue.cancel(request.id, owner);
}
