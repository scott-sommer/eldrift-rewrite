import type { MiningStation } from '../../capabilities/mining/station';
import { stationTile, validateStation } from '../../capabilities/mining/station';
import type { Position } from '../../capabilities/movement/step';
import { createReservations } from '../../persistence/reservations/store';
import type { StatePort } from '../../persistence/versioned-state';
export function createStationAssignments(state: StatePort) {
  const reservations = createReservations(state);
  function acquire(station: MiningStation, tile: Position, unit: string, scope: string, tick: number, lifetime: number): boolean {
    validateStation(station);
    if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(lifetime) || lifetime < 1) throw new Error('Invalid station lease');
    if (station.risk !== 'safe') return false;
    const key = stationTile(tile);
    if (!station.access.some(access => stationTile(access) === key)) return false;
    return reservations.acquire({ resource: 'mining-tile:' + key, holder: unit, scope, expiresAt: tick + lifetime }, tick);
  }
  return { acquire,
    select(station: MiningStation, unit: string, scope: string, tick: number, lifetime: number): Position | undefined {
      validateStation(station);
      const held = new Set(reservations.held(scope,tick).filter(claim => claim.holder === unit).map(claim => claim.resource));
      const preferred = station.access.filter(tile => held.has('mining-tile:' + stationTile(tile)));
      const candidates = [...preferred,...station.access.filter(tile => !preferred.includes(tile))];
      return candidates.find(tile => acquire(station,tile,unit,scope,tick,lifetime));
    },
    release: (scope: string) => reservations.releaseScope(scope),
  };
}
