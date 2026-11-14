import { stateKey } from '../../persistence/state-key';
import type { StatePort } from '../../persistence/versioned-state';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
import type { BodyPart } from '../../capabilities/spawning/body';
import { bodyCost } from '../../capabilities/spawning/body';
import { createSpawnQueue } from '../population/spawn-queue';
import { reserveSpawnIdentity } from '../population/spawn-identity';
import { scavengerOwner } from '../logistics/identity';
import { planRecoveryScavenger } from './scavenger-plan';
export interface ScavengerUnit extends PopulationUnit { body: readonly BodyPart[] }
export interface ScavengerDemand {
  room: string; active: boolean; availableEnergy: number; capacityEnergy: number; maximumBudget: number;
}
/** Recovery owns only its scavenger spawn scope; hauling owns the shared executor. */
export function maintainRecoveryScavengers(state: StatePort, demand: ScavengerDemand, units: readonly ScavengerUnit[], tick: number): void {
  if (!demand.active && state.read(stateKey('spawning', demand.room)) === undefined) return;
  const owner = scavengerOwner(demand.room);
  const queue = createSpawnQueue(state, demand.room);
  const names = new Set(units.map(unit => unit.name));
  for (const request of queue.list().filter(item => item.owner === owner)) {
    if (!demand.active || request.expiresAt <= tick || names.has(request.name) || bodyCost(request.body) > Math.min(demand.maximumBudget, demand.capacityEnergy)) queue.cancel(request.id, owner);
  }
  if (!demand.active) return;
  const scoped = units.filter(unit => unit.owner === owner && unit.room === demand.room);
  const pending = queue.list().filter(item => item.owner === owner).map(item => item.body);
  // A spawning bootstrap counts as committed, but must finish before escalation is queued.
  const spawning = scoped.filter(unit => unit.spawning).map(unit => unit.body);
  const plan = planRecoveryScavenger({ ...demand, live: scoped.filter(unit => !unit.spawning).map(unit => unit.body), pending: [...pending, ...spawning] });
  if (!plan) return;
  const id = reserveSpawnIdentity(state, demand.room);
  queue.submit({ id, name: id, owner, room: demand.room, body: plan.body, priority: plan.priority, readyAt: tick, expiresAt: tick + 100 });
}
