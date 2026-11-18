import { insideRoom } from '../../../core/geometry/local-grid';
import { roomCoordinates } from '../../../core/geometry/room-grid';
import type { Position } from '../../../capabilities/movement/step';
import type { PlanEntry, PlanState } from '../../planning/plan-model';
import type { RemoteInfrastructureRoute, RemoteOutpostDemand } from './model';
import { natural, room } from '../assignment-validation';
/** Compile complete admitted source routes; engine eligibility remains the construction owner's responsibility. */
export function compileRemoteInfrastructure(demand: RemoteOutpostDemand, routes: readonly RemoteInfrastructureRoute[], revision: number) {
  validateRoutes(routes,revision);
  const plans = new Map<string,Map<string,PlanEntry>>();
  for (const route of routes) {
    if (!validInfrastructureRoute(route,demand.room)) throw new Error('Invalid infrastructure route');
    for (const point of demand.infrastructure.roads ? route.path.filter(point => insideRoom(point,1)) : []) add(point,'road');
    if (demand.infrastructure.containers) add(route.station,'container');
  }
  function add(point: Position, type: string): void {
    if (!plans.has(point.room)) plans.set(point.room,new Map());
    plans.get(point.room)!.set(type+':'+point.x+':'+point.y,{ type,x: point.x,y: point.y,rcl: 1,priority: type === 'container' ? 0 : 10,source: 'strategy' });
  }
  const result: PlanState[] = [...plans].sort(([a],[b]) => a.localeCompare(b)).map(([room,entries]) => ({
    room,revision,strategy: 'remote-infrastructure-v1',entries: [...entries.values()] }));
  validateCapacity(result);
  return { plans: result,stations: routes.map(route => ({ source: route.source,position: { ...route.station } })) };
}
export function validInfrastructureRoute(value: RemoteInfrastructureRoute, targetRoom: string): boolean {
  if (!sourceIdentity(value)) return false;
  if (!position(value.target) || !position(value.station) || value.target.room !== targetRoom || value.station.room !== targetRoom) return false;
  if (!validStation(value.target,value.station) || !validPath(value.path)) return false;
  if (value.path.length && distance(value.path.at(-1)!,value.station) !== 0) return false;
  return value.path.every((point,index) => index === 0 || distance(value.path[index-1]!,point) === 1);
}
export function position(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const point = value as Position;
  return room(point.room) && natural(point.x) && point.x < 50 && natural(point.y) && point.y < 50;
}
function distance(a: Position,b: Position): number {
  const left = roomCoordinates(a.room), right = roomCoordinates(b.room);
  return Math.max(Math.abs((left.x-right.x)*50+a.x-b.x),Math.abs((left.y-right.y)*50+a.y-b.y));
}

function sourceIdentity(value: RemoteInfrastructureRoute): boolean {
  return !!value && typeof value.source === 'string' && value.source.length > 0 && value.source.length <= 256;
}
function validPath(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length <= 3200 && value.every(position);
}
function validateRoutes(routes: readonly RemoteInfrastructureRoute[], revision: number): void {
  if (!natural(revision) || revision < 1 || routes.length > 16 || new Set(routes.map(route => route.source)).size !== routes.length) throw new Error('Invalid infrastructure routes');
}
function validateCapacity(plans: readonly PlanState[]): void {
  if (plans.length > 64 || plans.reduce((sum,plan) => sum+plan.entries.length,0) > 10000) throw new Error('Infrastructure plan capacity');
}

function validStation(target: Position, station: Position): boolean {
  return insideRoom(station,1) && distance(target,station) === 1;
}
