import type { StatePort } from '../../persistence/versioned-state';
import type { MiningStation } from '../../capabilities/mining/station';
import { planMiningCapacity } from '../../capabilities/mining/capacity';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
import type { BodyPart } from '../../capabilities/spawning/body';
import { replacementDue } from '../../capabilities/spawning/request';
import { validateRequest } from '../../capabilities/spawning/allocate';
import { createSpawnQueue } from '../population/spawn-queue';
import { reserveSpawnIdentity } from '../population/spawn-identity';
export interface MiningUnit extends PopulationUnit { rate: number }
export interface MiningDemand {
  station: MiningStation;
  home: string;
  body: readonly BodyPart[];
  priority: number;
  travelTicks: number;
  marginTicks: number;
  requestLifetime: number;
}
/** Stable demand identity survives body changes and remote-room travel. */
export function miningOwner(station: MiningStation): string {
  return 'mining:' + JSON.stringify([station.position.room, station.id]);
}
export function applyMiningDemand(port: StatePort, plan: MiningDemand, units: readonly MiningUnit[], tick: number,
  productionRate: (body: readonly BodyPart[]) => number) {
  const owner = miningOwner(plan.station);
  const template = { id: 'validate', name: 'validate', owner, room: plan.home, priority: plan.priority,
    readyAt: tick, expiresAt: tick + plan.requestLifetime, body: plan.body };
  validateRequest(template);
  replacementDue(0, plan.body.length, plan.travelTicks, plan.marginTicks);
  const queue = createSpawnQueue(port, plan.home);
  const all = queue.list();
  const names = new Set(units.map(unit => unit.name));
  const scoped = all.filter(request => request.owner === owner);
  const pending = scoped.filter(request => request.expiresAt > tick && !names.has(request.name))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const live = units.filter(unit => unit.owner === owner && unit.room === plan.home)
    .filter(unit => unit.spawning || !replacementDue(unit.ticksToLive, plan.body.length, plan.travelTicks, plan.marginTicks));
  const decision = planMiningCapacity(plan.station, live.map(unit => ({ id: 'unit:' + unit.name, rate: unit.rate })),
    pending.map(request => ({ id: request.id, rate: productionRate(request.body) })), productionRate(plan.body));
  const active = new Set(pending.map(request => request.id));
  const cancel = new Set([...decision.cancel, ...scoped.filter(request => !active.has(request.id)).map(request => request.id)]);
  if (all.length - cancel.size + decision.missing > 200) throw new Error('Mining demand exceeds queue capacity');
  for (const id of cancel) queue.cancel(id, owner);
  const created: string[] = [];
  for (let index = 0; index < decision.missing; index++) {
    const id = reserveSpawnIdentity(port, plan.home);
    queue.submit({ ...template, id, name: id });
    created.push(id);
  }
  return { ...decision, cancel: [...cancel], created };
}
