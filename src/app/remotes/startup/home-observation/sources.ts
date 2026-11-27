import { createNativePaidSourceObservation } from '../motion-observation/source';
import { createNativePaidMinerObservation } from '../motion-observation/miner';
import { createNativePaidCourierOpening } from '../motion-observation/native-opening';
import { createPaidCourierRouteStore } from '../../../../features/remotes/startup/routes/store';
import { paidRouteContextMatches } from '../route-control/program';
import { withinRange } from '../../../../capabilities/movement/path-model';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { PaidHomeGroup,PaidHomeSourceObservation } from './model';
import type { PaidCourierActiveRoute } from '../../../../features/remotes/startup/routes/model';
import type { PaidCourierOpening } from '../motion-observation/opening-model';
export function observePaidHomeSource(state: StatePort,group: PaidHomeGroup,requireActivated: boolean,guard: () => boolean): PaidHomeSourceObservation | undefined {
  const source = createNativePaidSourceObservation(state)(group,guard); if (source.status === 'deferred') return undefined;
  const { quantityClaims,...observation } = source.observation;
  const miners: PaidHomeSourceObservation['miners'] = [],couriers: PaidHomeSourceObservation['couriers'] = [];
  const routes = createPaidCourierRouteStore(state,group.cohort.home).read().routes;
  for (const paid of group.cohort.workers) {
    if (!guard()) return undefined;
    const context = { ...group,paid };
    if (paid.body.includes('work')) {
      const miner = createNativePaidMinerObservation(state)(context,guard); if (miner.status === 'deferred') return undefined;
      miners.push({ paid,observation: miner.observation }); continue;
    }
    const current = createNativePaidCourierOpening(state)(context,guard); if (current.status === 'deferred') return undefined;
    const route = routes.find(route => route.program.name === paid.request) ?? null;
    if (route && !paidRouteContextMatches(route.program,context)) return undefined;
    if (requireActivated && !routeCurrent(route,current.opening)) return undefined;
    couriers.push({ paid,opening: current.opening,route });
  }
  return { ...group,observation,claimIds: quantityClaims.map(claim => claim.id),miners,couriers };
}
function routeCurrent(route: PaidCourierActiveRoute | null,opening: PaidCourierOpening): boolean {
  if (!route || !routeBodyCurrent(route,opening)) return false;
  if (route.observedAt !== Game.time) return false;
  if (route.readyAt < opening.continuation.readyAt) return false;
  if (opening.continuation.stage === 'spawning') return route.cursor === null;
  return !!route.cursor && route.cursor.observedAt === Game.time && route.cursor.requestedAt === null && withinRange(route.cursor.position,opening.observed.position,0);
}

function routeBodyCurrent(route: PaidCourierActiveRoute,opening: PaidCourierOpening): boolean {
  return route.program.unit === opening.observed.unit && route.energy === opening.observed.energy && route.fatigue === opening.observed.fatigue;
}
