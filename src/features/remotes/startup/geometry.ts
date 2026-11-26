import { adjacentWorkTiles } from '../../../capabilities/movement/work-tiles';
import { roomCoordinates } from '../../../core/geometry/room-grid';
import type { Position } from '../../../capabilities/movement/step';
import type { BodyPart } from '../../../capabilities/spawning/body';
import type { StartupTravelPlan } from './travel-model';
export interface StartupGeometryPort { id: string; position: Position }
export interface StartupGeometryFacts {
  home: string; room: string; source: StartupGeometryPort; spawns: readonly StartupGeometryPort[]; endpoints: readonly StartupGeometryPort[];
  stations: readonly { position: Position; status: 'ready' | 'building' | 'empty' }[]; miner: readonly BodyPart[]; courier: readonly BodyPart[];
}
export type StartupGeometryStrategy = (facts: StartupGeometryFacts, standable: (point: Position) => boolean) => StartupTravelPlan | undefined;
/** Deterministic geometric proposal only. Travel feasibility, state/funding and adoption have other owners. */
export const nearestStartupGeometry: StartupGeometryStrategy = (facts,standable) => {
  const origins = facts.spawns.slice(0,8).flatMap(spawn => facts.endpoints.slice(0,8).map(endpoint => ({ spawn,endpoint })))
    .sort((a,b) => originScore(a,facts.source.position)-originScore(b,facts.source.position) || a.spawn.id.localeCompare(b.spawn.id) || a.endpoint.id.localeCompare(b.endpoint.id));
  const rank = { ready: 0,building: 1,empty: 2 };
  for (const origin of origins) {
    const stations = [...facts.stations].sort((a,b) => rank[a.status]-rank[b.status] || distance(a.position,origin.endpoint.position)-distance(b.position,origin.endpoint.position) || a.position.x-b.position.x || a.position.y-b.position.y).slice(0,8);
    for (const station of stations) {
      const plan = geometry(facts,origin,station.position,standable); if (plan) return plan;
    }
  }
  return undefined;
};
function geometry(facts: StartupGeometryFacts, origin: { spawn: StartupGeometryPort; endpoint: StartupGeometryPort }, station: Position, standable: (point: Position) => boolean): StartupTravelPlan | undefined {
  if (!standable(station)) return undefined;
  const exit = neighbor(origin.spawn.position,station,standable), deposit = neighbor(origin.endpoint.position,station,standable);
  if (!exit || !deposit) return undefined;
  const collection = neighbor(station,deposit,standable); if (!collection) return undefined;
  return { home: facts.home,room: facts.room,source: facts.source.id,spawn: { id: origin.spawn.id,position: { ...origin.spawn.position },exit },
    station: { ...station },collection,endpoint: { id: origin.endpoint.id,position: { ...origin.endpoint.position },deposit },miner: [...facts.miner],courier: [...facts.courier] };
}
function neighbor(target: Position, toward: Position, standable: (point: Position) => boolean): Position | undefined {
  return adjacentWorkTiles(target).filter(standable).sort((a,b) => distance(a,toward)-distance(b,toward) || a.x-b.x || a.y-b.y)[0];
}
function originScore(origin: { spawn: StartupGeometryPort; endpoint: StartupGeometryPort }, source: Position): number { return distance(origin.spawn.position,source)+distance(origin.endpoint.position,source); }
function distance(a: Position, b: Position): number {
  const left = roomCoordinates(a.room), right = roomCoordinates(b.room);
  return Math.abs((left.x-right.x)*50+a.x-b.x)+Math.abs((left.y-right.y)*50+a.y-b.y);
}
