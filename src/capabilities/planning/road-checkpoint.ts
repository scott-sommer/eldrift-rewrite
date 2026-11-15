import type { Tile } from '../../core/geometry/local-grid';
import { tileIndex } from '../../core/geometry/local-grid';
import type { RoadConnectionsInput } from './road-connections';
export interface RoadConnection { id: string; cost: number; steps: number }
export interface RoadCheckpoint { version: 1; signature: string; roads: Tile[]; connections: RoadConnection[] }
export function roadCheckpoint(input: RoadConnectionsInput, revision: string, previous?: RoadCheckpoint): RoadCheckpoint {
  if (!revision) throw new Error('Missing road network revision');
  const ids = input.targets.map(target => target.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Invalid road target identities');
  const signature = JSON.stringify([revision, input.start, input.roads, input.targets]);
  if (!previous) return { version: 1, signature, roads: uniqueRoads(input.roads), connections: [] };
  if (previous.version !== 1 || previous.signature !== signature) throw new Error('Stale road checkpoint');
  validateConnections(previous.connections, ids);
  const roads = uniqueRoads(previous.roads);
  if (roads.length !== previous.roads.length) throw new Error('Duplicate checkpoint roads');
  const keys = new Set(roads.map(tileIndex));
  if (input.roads.some(tile => !keys.has(tileIndex(tile)))) throw new Error('Missing original checkpoint roads');
  return { version: 1, signature, roads, connections: previous.connections.map(connection => ({ ...connection })) };
}
function uniqueRoads(roads: readonly Tile[]): Tile[] {
  return [...new Map(roads.map(tile => [tileIndex(tile), { ...tile }])).values()];
}
function validateConnection(connection: RoadConnection, id: string): void {
  if (connection.id !== id || !Number.isFinite(connection.cost) || connection.cost < 0
    || !Number.isSafeInteger(connection.steps) || connection.steps < 0) throw new Error('Invalid checkpoint connection');
}

function validateConnections(connections: readonly RoadConnection[], ids: readonly string[]): void {
  if (!Array.isArray(connections) || connections.length > ids.length) throw new Error('Invalid road checkpoint');
  connections.forEach((connection, index) => validateConnection(connection, ids[index]!));
}
