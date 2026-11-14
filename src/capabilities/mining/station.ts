import type { Position } from '../movement/step';
export interface MiningStation {
  id: string;
  target: string;
  kind: 'energy' | 'mineral';
  resource: string;
  position: Position;
  access: readonly Position[];
  container?: string;
  link?: string;
  extractor?: string;
  throughput: number;
  available: number;
  observedAt: number;
  readyAt: number;
  risk: 'safe' | 'unknown' | 'hostile';
}
export function stationTile(position: Position): string {
  if (!position.room || ![position.x, position.y].every(value => Number.isInteger(value) && value >= 0 && value < 50)) throw new Error('Invalid station tile');
  return JSON.stringify([position.room, position.x, position.y]);
}
export function validateStation(station: MiningStation): void {
  if (!station.id || !station.target || !station.resource) throw new Error('Missing station identity');
  if (!['energy', 'mineral'].includes(station.kind) || !['safe', 'unknown', 'hostile'].includes(station.risk)) throw new Error('Invalid station classification');
  stationTile(station.position);
  if (![station.throughput, station.available, station.observedAt, station.readyAt].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid station production');
  validateAccess(station);
}
function validateAccess(station: MiningStation): void {
  if (station.access.length > 8 || new Set(station.access.map(stationTile)).size !== station.access.length) throw new Error('Invalid station access');
  for (const tile of station.access) {
    const range = Math.max(Math.abs(tile.x - station.position.x), Math.abs(tile.y - station.position.y));
    if (tile.room !== station.position.room || range !== 1) throw new Error('Access tile must border target');
  }
}

