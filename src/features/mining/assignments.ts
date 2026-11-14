import type { MiningStation } from '../../capabilities/mining/station';
import { stationTile, validateStation } from '../../capabilities/mining/station';
import type { Position } from '../../capabilities/movement/step';
import { createReservations } from '../../persistence/reservations/store';
import type { StatePort } from '../../persistence/versioned-state';
export function createStationAssignments(state: StatePort) {
  const reservations = createReservations(state);
  return {
    acquire(station: MiningStation, tile: Position, unit: string, scope: string, tick: number, lifetime: number): boolean {
      validateStation(station);
      if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(lifetime) || lifetime < 1) throw new Error('Invalid station lease');
      if (station.risk !== 'safe') return false;
      const key = stationTile(tile);
      if (!station.access.some(access => stationTile(access) === key)) return false;
      return reservations.acquire({ resource: 'mining-tile:' + key, holder: unit, scope, expiresAt: tick + lifetime }, tick);
    },
    release: (scope: string) => reservations.releaseScope(scope),
  };
}
