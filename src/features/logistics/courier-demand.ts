import type { PopulationUnit } from '../../capabilities/spawning/demand';
import type { BodyPart } from '../../capabilities/spawning/body';
import { replacementDue } from '../../capabilities/spawning/request';
import { validateRequest } from '../../capabilities/spawning/allocate';
import { haulingDemand } from '../../capabilities/logistics/demand';
import type { HaulingRoute } from '../../capabilities/logistics/demand';
import type { StatePort } from '../../persistence/versioned-state';
import { createSpawnQueue } from '../population/spawn-queue';
import { reserveSpawnIdentity } from '../population/spawn-identity';
export interface CourierUnit extends PopulationUnit { capacity: number }
export interface CourierDemand {
  owner: string; room: string; body: readonly BodyPart[]; routes: readonly HaulingRoute[];
  utilization: number; minimumCapacity: number; travelTicks: number; marginTicks: number;
  priority: number; requestLifetime: number;
}
export function courierCapacity(body: readonly BodyPart[]): number { return body.filter(part => part === 'carry').length * 50; }
/** Live and pending carry capacity are reconciled separately; spawning names never count twice. */
export function applyCourierDemand(state: StatePort, plan: CourierDemand, units: readonly CourierUnit[], tick: number) {
  const workerCapacity = courierCapacity(plan.body);
  const required = Math.max(plan.minimumCapacity, haulingDemand(plan.routes,
    { utilization: plan.utilization, workerCapacity, committedCapacity: 0 }).requiredCapacity);
  const template = { id: 'validate', name: 'validate', owner: plan.owner, room: plan.room, body: plan.body,
    priority: plan.priority, readyAt: tick, expiresAt: tick + plan.requestLifetime };
  validateRequest(template);
  validateCapacity(plan.minimumCapacity, units);
  replacementDue(0, plan.body.length, plan.travelTicks, plan.marginTicks);
  const live = units.filter(unit => unit.owner === plan.owner && unit.room === plan.room)
    .filter(unit => unit.spawning || !replacementDue(unit.ticksToLive, plan.body.length, plan.travelTicks, plan.marginTicks));
  const queue = createSpawnQueue(state, plan.room);
  const all = queue.list();
  const names = new Set(units.map(unit => unit.name));
  let committed = live.reduce((sum, unit) => sum + unit.capacity, 0);
  const cancelled: string[] = [];
  for (const request of all.filter(item => item.owner === plan.owner).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))) {
    if (request.expiresAt <= tick || names.has(request.name) || committed >= required || courierCapacity(request.body) === 0) cancelled.push(request.id);
    else committed += courierCapacity(request.body);
  }
  const missing = Math.ceil(Math.max(0, required - committed) / workerCapacity);
  if (all.length - cancelled.length + missing > 200) throw new Error('Courier demand exceeds queue capacity');
  for (const id of cancelled) queue.cancel(id, plan.owner);
  const created: string[] = [];
  for (let index = 0; index < missing; index++) {
    const id = reserveSpawnIdentity(state, plan.room);
    queue.submit({ ...template, id, name: id });
    created.push(id);
  }
  return { required, committed, created, cancelled };
}

function validateCapacity(minimum: number, units: readonly CourierUnit[]): void {
  if (!Number.isFinite(minimum) || minimum < 0 || units.some(unit => !Number.isFinite(unit.capacity) || unit.capacity < 0)) throw new Error('Invalid courier capacity');
}

