import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import type { MiningStation } from '../../capabilities/mining/station';
import { stationSchema } from './station-schema';
export function createStationStore(port: StatePort, room: string) {
  const key = stateKey('mining-stations', room);
  const schema = stationSchema(room);
  const read = () => openState(port, key, schema);
  return {
    read(tick: number) {
      validTick(tick);
      const record = read();
      if (record.lastSeen !== null && record.lastSeen > tick) throw new Error('Station observation is in the future');
      const visible = record.lastSeen === tick;
      const stations = record.stations.map(station => ({
        ...station, risk: visible ? station.risk : 'unknown' as const,
      }));
      return { lastSeen: record.lastSeen, visible, stations };
    },
    observe(tick: number, stations: readonly MiningStation[] | undefined): void {
      validTick(tick);
      const record = read();
      if (record.lastSeen !== null && tick < record.lastSeen) throw new Error('Station observation is older than stored state');
      if (stations === undefined) return;
      saveState(port, key, schema, { lastSeen: tick, stations: [...stations] });
    },
  };
}
function validTick(tick: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid station observation tick');
}
