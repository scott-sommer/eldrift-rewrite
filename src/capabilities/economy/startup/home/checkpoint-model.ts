import type { StartupProjectCheckpoint,StartupProjectReceipt } from '../checkpoints/project-model';
import type { StartupCourierTrip } from '../courier-trips/model';
export interface StartupHomeSourceCheckpoint extends Pick<StartupProjectCheckpoint,'container' | 'construction' | 'delivery' | 'opening' | 'couriers'> {
  id: string; trips: StartupCourierTrip[]; due: StartupProjectReceipt[]; settled: StartupProjectReceipt[];
}
export interface StartupHomeCheckpoint extends Pick<StartupProjectCheckpoint,'timeline' | 'sink' | 'household'> {
  format: 1; binding: string; tick: number; sources: StartupHomeSourceCheckpoint[];
}
