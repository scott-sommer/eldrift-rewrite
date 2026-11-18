import type { StateSchema } from '../../../persistence/versioned-state';
import { planSchema } from '../../planning/plan-state';
import { natural, object } from '../assignment-validation';
import { position, validInfrastructureRoute } from './plan';
import type { RemoteInfrastructureRecord } from './model';
export function remoteInfrastructureSchema(home: string, room: string): StateSchema<RemoteInfrastructureRecord> {
  return { owner: 'remotes',version: 1,migrations: {},
    initial: () => ({ home,room,revision: 0,generation: 0,draft: null,plans: [],stations: [] }),
    valid(value: unknown): value is RemoteInfrastructureRecord {
      if (!object(value) || value.home !== home || value.room !== room || !natural(value.revision) || !natural(value.generation)) return false;
      return validDraft(value.draft,room) && validPlans(value.plans) && validStations(value.stations,room);
    } };
}
function validDraft(value: unknown, room: string): boolean {
  if (value === null) return true;
  if (!object(value) || typeof value.identity !== 'string' || !value.identity || value.identity.length > 100000) return false;
  if (!sourceIds(value.sources)) return false;
  if (!routeCount(value.sources,value.routes)) return false;
  const sources = value.sources;
  const routes = value.routes as Parameters<typeof validInfrastructureRoute>[0][];
  return routes.every(route => validInfrastructureRoute(route,room) && sources.includes(route.source))
    && new Set(routes.map(route => route.source)).size === routes.length;
}
function validPlans(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 64) return false;
  if (!value.every(plan => object(plan) && typeof plan.room === 'string' && planSchema(plan.room,['road','container']).valid(plan))) return false;
  return new Set(value.map(plan => plan.room)).size === value.length && value.reduce((sum,plan) => sum+plan.entries.length,0) <= 10000;
}
function validStations(value: unknown, room: string): boolean {
  return Array.isArray(value) && value.length <= 16 && value.every(station => object(station) && typeof station.source === 'string'
    && position(station.position) && station.position.room === room) && new Set(value.map(station => station.source)).size === value.length;
}

function sourceIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 16 && value.every(id => typeof id === 'string' && id.length > 0 && id.length <= 256);
}

function routeCount(sources: string[], routes: unknown): routes is unknown[] {
  return new Set(sources).size === sources.length && Array.isArray(routes) && routes.length <= sources.length;
}
