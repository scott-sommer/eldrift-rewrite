import type { StatePort } from '../../persistence/versioned-state';
import { createStationStore } from '../../features/mining/station-store';
import { observeMiningStations } from '../../adapters/screeps/mining-stations';
import type { MiningStation } from '../../capabilities/mining/station';
/** Only called after current ownership/risk admission; unseen stations are never promoted to safe. */
export function createRemoteStationObservation(state: StatePort) {
  const observed = new Map<string,MiningStation[]>();
  let tick = -1;
  return (room: string): MiningStation[] | undefined => {
    if (tick !== Game.time) { tick = Game.time; observed.clear(); }
    if (!Game.rooms[room]) return undefined;
    if (!observed.has(room)) {
      const stations = observeMiningStations(room,'safe');
      if (!stations) return undefined;
      createStationStore(state,room).observe(tick,stations); observed.set(room,stations);
    }
    return observed.get(room);
  };
}
