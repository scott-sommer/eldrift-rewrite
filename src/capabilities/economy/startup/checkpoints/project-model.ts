import type { StartupProjectMotionCheckpoint } from '../courier-trips/project-model';
import type { StartupHouseholdCheckpoint } from '../household/model';
import type { StartupOpeningState } from '../initial-model';
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
  format: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; motion?: StartupProjectMotionCheckpoint; household?: Omit<StartupHouseholdCheckpoint,'spawning'>; binding: string; tick: number; timeline: StartupTimelineCheckpoint;
  container: StartupContainerCheckpoint; sink: StartupSinkCheckpoint;
  opening: StartupOpeningState;
  construction: StartupConstructionForecast; delivery: StartupDeliveryForecast;
  couriers: StartupCourierCheckpoint[]; due: StartupProjectReceipt[]; settled: StartupDeliveryForecast['receipts'];
  houseAccounting: StartupCashCheckpoint; sourceAccounting: StartupCashCheckpoint;
}
