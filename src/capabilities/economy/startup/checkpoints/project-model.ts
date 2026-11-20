import type { StartupTimelineCheckpoint } from './timeline';
import type { StartupCashCheckpoint } from './cash';
import type { StartupContainerCheckpoint } from './container';
import type { StartupSinkCheckpoint } from './sink';
import type { StartupConstructionForecast } from '../construction-model';
import type { StartupCourierState, StartupDeliveryForecast } from '../delivery-model';
export type StartupCourierCheckpoint = Omit<StartupCourierState,'nextAt'> & { nextAt: number | null };
export interface StartupProjectReceipt { request: string; id: string; tick: number; energy: number }
/** Wire format only; mutable Maps, Sets, Infinity and undefined never cross this boundary. */
export interface StartupProjectCheckpoint {
  format: 1; binding: string; tick: number; timeline: StartupTimelineCheckpoint;
  container: StartupContainerCheckpoint; sink: StartupSinkCheckpoint;
  construction: StartupConstructionForecast; delivery: StartupDeliveryForecast;
  couriers: StartupCourierCheckpoint[]; due: StartupProjectReceipt[]; settled: StartupDeliveryForecast['receipts'];
  houseAccounting: StartupCashCheckpoint; sourceAccounting: StartupCashCheckpoint;
}
