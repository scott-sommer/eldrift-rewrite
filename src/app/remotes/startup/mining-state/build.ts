import { withinRange } from '../../../../capabilities/movement/path-model';
import type { BuildProfile } from '../../../../capabilities/construction/build-effect';
import type { HomeWorldShared } from '../hauling-state/world/model';
import type { ForecastMinerWorker } from './model';
/** Permission is an explicit current blocker/ownership assessment, never an indefinitely replayed opening fact. */
export function queueForecastMiningBuild(shared: HomeWorldShared,worker: ForecastMinerWorker,target: string,id: string,profile: BuildProfile,allowed: boolean): number {
  const body = shared.body(worker.unit); if (body.spawning) return -4;
  if (profile.workParts === 0) return -12;
  const unit = shared.inventory.observe(worker.unit); if (!unit || unit.energy < 1) return -6;
  const site = shared.inventory.site(target); if (!site) return -7;
  if (!withinRange(body.position,site.position,3)) return -9;
  shared.inventory.queue({ id,kind: 'build',source: worker.unit,target,position: body.position,profile,allowed }); return 0;
}
