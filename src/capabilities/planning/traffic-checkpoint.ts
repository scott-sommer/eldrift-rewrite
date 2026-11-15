import type { Tile } from '../../core/geometry/local-grid';
import { tileIndex } from '../../core/geometry/local-grid';
import { roadCheckpoint } from './road-checkpoint';
import type { RoadCheckpoint } from './road-checkpoint';
import type { TrafficRoadInput } from './traffic-roads';
export interface TrafficLane { id: string; primaryCost: number; secondaryCost?: number; secondaryFailure?: string }
export interface TrafficCheckpoint {
  version: 1; network: RoadCheckpoint; lanes: TrafficLane[]; blocked?: Tile[];
}
export function trafficCheckpoint(input: TrafficRoadInput, revision: string, previous?: TrafficCheckpoint): TrafficCheckpoint {
  const network = roadCheckpoint({ ...input, search: (start, goal, roads) => input.search(start, goal, roads, []) },
    revision, previous?.network);
  if (!previous) return { version: 1, network, lanes: [] };
  if (previous.version !== 1 || !Array.isArray(previous.lanes)) throw new Error('Invalid traffic checkpoint');
  const pending = previous.blocked !== undefined;
  if (network.connections.length !== previous.lanes.length + Number(pending)) throw new Error('Invalid traffic phase');
  previous.lanes.forEach((lane, index) => validateLane(lane, network.connections[index]!));
  const blocked = previous.blocked?.map(tile => ({ ...tile }));
  if (blocked) {
    const roads = new Set(network.roads.map(tileIndex));
    const keys = blocked.map(tileIndex);
    if (new Set(keys).size !== keys.length || keys.some(key => !roads.has(key))) throw new Error('Invalid blocked lane');
  }
  return { version: 1, network, lanes: previous.lanes.map(lane => ({ ...lane })),
    ...(blocked === undefined ? {} : { blocked }) };
}
function validateLane(lane: TrafficLane, connection: { id: string; cost: number }): void {
  if (lane.id !== connection.id || lane.primaryCost !== connection.cost) throw new Error('Invalid traffic lane');
  const success = lane.secondaryCost !== undefined;
  if (success === (lane.secondaryFailure !== undefined)) throw new Error('Invalid secondary result');
  if (success && (!Number.isFinite(lane.secondaryCost) || lane.secondaryCost! < 0)) throw new Error('Invalid secondary cost');
  if (!success && !lane.secondaryFailure) throw new Error('Missing secondary failure');
}
