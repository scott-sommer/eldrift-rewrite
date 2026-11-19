import type { WorkOrder, WorkSite } from '../../../capabilities/work/assessment';
import type { Position } from '../../../capabilities/movement/step';
import { roomCoordinates } from '../../../core/geometry/room-grid';
import type { RemoteInfrastructureRecord, RemoteOutpostDemand } from './model';
export interface RemoteWorkSite extends WorkSite { owned: boolean }
/** Caller supplies resolved lease authority and current safe route; selection never expands either. */
export function selectRemoteInfrastructureWork(record: RemoteInfrastructureRecord, demand: RemoteOutpostDemand, tick: number,
  sites: readonly RemoteWorkSite[], origin: Position, allowedRooms: readonly string[], current?: string): WorkOrder | undefined {
  const orders = remoteInfrastructureWorkOrders(record,demand,tick,sites,origin,allowedRooms);
  orders.sort((a,b) => a.priority-b.priority || a.score-b.score || a.id.localeCompare(b.id));
  return orders.find(order => order.id === current && order.priority === orders[0]?.priority) ?? orders[0];
}
export function remoteInfrastructureWorkOrders(record: RemoteInfrastructureRecord, demand: RemoteOutpostDemand, tick: number,
  sites: readonly RemoteWorkSite[], origin: Position, allowedRooms: readonly string[]): WorkOrder[] {
  if (record.home !== demand.home || record.room !== demand.room || record.generation !== demand.generation || tick >= demand.expiresAt) return [];
  const rooms = new Set(allowedRooms), planned = new Map<string,number>();
  for (const plan of record.plans.filter(plan => rooms.has(plan.room))) for (const entry of plan.entries) {
    if (enabled(entry.type,demand)) planned.set(key(plan.room,entry.type,entry.x,entry.y),entry.priority);
  }
  return sites.filter(site => site.owned && site.ready && site.progress < site.total)
    .flatMap(site => order(site,planned,origin));
}
function enabled(type: string, demand: RemoteOutpostDemand): boolean {
  return type === 'road' && demand.infrastructure.roads || type === 'container' && demand.infrastructure.containers;
}
function key(room: string, type: string, x: number, y: number): string { return JSON.stringify([room,type,x,y]); }
function order(site: RemoteWorkSite, planned: Map<string,number>, origin: Position): WorkOrder[] {
  const priority = planned.get(key(site.position.room,site.type,site.position.x,site.position.y));
  if (priority === undefined) return [];
  const a = roomCoordinates(origin.room), b = roomCoordinates(site.position.room);
  const score = Math.max(Math.abs((a.x-b.x)*50+origin.x-site.position.x),Math.abs((a.y-b.y)*50+origin.y-site.position.y));
  return [{ id: site.id,kind: 'build',position: { ...site.position },priority,score }];
}
