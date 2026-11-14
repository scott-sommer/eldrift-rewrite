export interface HaulingRoute {
  id: string;
  production: number;
  outboundTicks: number;
  loadedReturnTicks: number;
  serviceTicks: number;
  delayTicks: number;
}
export interface HaulingCapacity {
  utilization: number;
  workerCapacity: number;
  committedCapacity: number;
}
/** Routes supply measured travel times for their terrain/load; this mechanism owns no pathing policy. */
export function haulingDemand(routes: readonly HaulingRoute[], capacity: HaulingCapacity) {
  if (!Number.isFinite(capacity.utilization) || capacity.utilization <= 0 || capacity.utilization > 1) {
    throw new Error('Invalid hauling utilization');
  }
  nonnegative(capacity.committedCapacity);
  nonnegative(capacity.workerCapacity);
  if (capacity.workerCapacity === 0) throw new Error('Hauler capacity must be positive');
  const identities = new Set<string>();
  const contributions = routes.map(route => {
    if (!route.id || identities.has(route.id)) throw new Error('Missing or duplicate hauling route');
    identities.add(route.id);
    const roundTripTicks = roundTrip(route);
    return { id: route.id, roundTripTicks, capacity: route.production * roundTripTicks / capacity.utilization };
  });
  const requiredCapacity = contributions.reduce((total, route) => total + route.capacity, 0);
  const shortfall = Math.max(0, requiredCapacity - capacity.committedCapacity);
  const missingWorkers = Math.ceil(shortfall / capacity.workerCapacity);
  if (!Number.isFinite(requiredCapacity) || !Number.isSafeInteger(missingWorkers)) throw new Error('Hauling demand overflow');
  return { contributions, requiredCapacity, shortfall, missingWorkers };
}
function roundTrip(route: HaulingRoute): number {
  const times = [route.outboundTicks, route.loadedReturnTicks, route.serviceTicks, route.delayTicks];
  nonnegative(route.production);
  times.forEach(nonnegative);
  const ticks = times.reduce((total, time) => total + time, 0);
  if (!Number.isFinite(ticks) || (route.production > 0 && ticks === 0)) throw new Error('Invalid hauling round trip');
  return ticks;
}
function nonnegative(value: number): void {
  if (!Number.isFinite(value) || value < 0) throw new Error('Expected finite nonnegative hauling value');
}
