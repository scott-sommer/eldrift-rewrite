import { replacementDue } from './request';
import type { SpawnRequest } from './request';
export interface PopulationDemand {
  owner: string;
  room: string;
  desired: number;
  replacementParts: number;
  travelTicks: number;
  marginTicks: number;
}
export interface PopulationUnit {
  name: string;
  owner: string;
  room: string;
  spawning: boolean;
  ticksToLive: number;
}
export interface DemandDecision { missing: number; cancel: string[]; effective: number }
/** Owner identifies one demand scope (for example mining:source-id), not a whole role. */
export function reconcileDemand(demand: PopulationDemand, units: readonly PopulationUnit[], pending: readonly SpawnRequest[], tick: number): DemandDecision {
  validateDemand(demand, tick);
  const scoped = units.filter(unit => unit.owner === demand.owner && unit.room === demand.room);
  const effective = scoped.filter(unit => unit.spawning || !replacementDue(unit.ticksToLive, demand.replacementParts, demand.travelTicks, demand.marginTicks)).length;
  const observed = new Set(units.map(unit => unit.name));
  const requests = pending.filter(request => request.owner === demand.owner && request.room === demand.room);
  const active = requests.filter(request => request.expiresAt > tick && !observed.has(request.name))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const needed = Math.max(0, demand.desired - effective);
  const keep = new Set(active.slice(0, needed).map(request => request.id));
  return { effective, missing: Math.max(0, needed - keep.size), cancel: requests.filter(request => !keep.has(request.id)).map(request => request.id) };
}
function validateDemand(demand: PopulationDemand, tick: number): void {
  if (!demand.owner || !demand.room) throw new Error('Missing demand identity');
  if (![demand.desired, tick].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid population target');
  replacementDue(0, demand.replacementParts, demand.travelTicks, demand.marginTicks);
  if (demand.replacementParts === 0) throw new Error('Empty replacement body');
}
