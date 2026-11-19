import type { RuntimeConfig } from '../../../../config/model';
import { remoteFleetWorkEnabled } from '../../fleet/spawn-policy';
export function reservationWorkEnabled(config: Readonly<RuntimeConfig>): boolean { return config.remoteReservationEnabled && remoteFleetWorkEnabled(config); }
export function reservationSpawningEnabled(config: Readonly<RuntimeConfig>): boolean { return reservationWorkEnabled(config) && config.remoteSpawningEnabled; }
