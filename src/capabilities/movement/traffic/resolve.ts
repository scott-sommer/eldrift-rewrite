import type { Denial, Occupant, TrafficRequest, TrafficResolution } from './model';
import { tileKey, trafficTargets } from './model';
import { trafficOccupancy, validateRequests } from './validation';
function select(requests: readonly TrafficRequest[], legal: (request: TrafficRequest) => boolean, denied: Map<string, Denial>): Map<string, TrafficRequest> {
  const winners = new Map<string, TrafficRequest>();
  const destinations = new Set<string>();
  const ordered = [...requests].sort((a, b) => b.priority - a.priority || (a.unit < b.unit ? -1 : 1));
  for (const request of ordered) {
    const target = tileKey(request.to);
    const targets = trafficTargets(request);
    let reason: Denial | undefined;
    if (!request.mobile) reason = 'immobile';
    else if (target === tileKey(request.from) || !legal(request)) reason = 'invalid-step';
    else if (targets.some(tile => destinations.has(tile))) reason = 'destination-conflict';
    if (reason) denied.set(request.unit, reason);
    else { targets.forEach(tile => destinations.add(tile)); winners.set(request.unit, request); }
  }
  return winners;
}
function prune(requests: readonly TrafficRequest[], winners: Map<string, TrafficRequest>, occupied: ReadonlyMap<string, string>, denied: Map<string, Denial>): boolean {
  const brokenGroups = new Set(requests.filter(request => !winners.has(request.unit)).map(request => request.group).filter(group => group !== undefined));
  let changed = false;
  for (const [unit, request] of winners) {
    const blocked = trafficTargets(request).some(tile => {
      const occupant = occupied.get(tile);
      return occupant !== undefined && occupant !== unit && !winners.has(occupant);
    });
    const reason = request.group && brokenGroups.has(request.group) ? 'group-blocked'
      : blocked ? 'dependency-blocked' : undefined;
    if (reason) { winners.delete(unit); denied.set(unit, reason); changed = true; }
  }
  return changed;
}
/** Conservative batch solver: chains and cycles are allowed, stationary occupants never shoved. */
export function resolveTraffic(requests: readonly TrafficRequest[], occupants: readonly Occupant[], legal: (request: TrafficRequest) => boolean, maximum = 1000): TrafficResolution {
  const occupied = trafficOccupancy(occupants);
  validateRequests(requests, occupied, maximum);
  const denied = new Map<string, Denial>();
  const winners = select(requests, legal, denied);
  // Each successful pass removes at least one request, bounding convergence by batch size.
  while (prune(requests, winners, occupied, denied)) { /* propagate dependencies and atomic groups */ }
  return { accepted: [...winners.values()], denied: [...denied].map(([unit, reason]) => ({ unit, reason })) };
}

