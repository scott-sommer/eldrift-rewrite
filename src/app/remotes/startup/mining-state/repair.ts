import { withinRange } from '../../../../capabilities/movement/path-model';
import type { RepairProfile } from '../../../../capabilities/mining/repair-effect';
import type { HomeWorldShared } from '../hauling-state/world/model';
import type { ForecastMinerWorker } from './model';
/** SDK-style admission over frozen physical facts; the caller's shared work arbiter owns issuance. */
export function queueForecastMiningRepair(shared: HomeWorldShared,worker: ForecastMinerWorker,target: string,id: string,profile: RepairProfile): number {
  const body = shared.body(worker.unit); if (body.spawning) return -4;
  if (profile.workParts === 0) return -12;
  const unit = shared.inventory.observe(worker.unit); if (!unit || unit.energy < 1) return -6;
  const structure = shared.inventory.structure(target); if (!structure) return -7;
  if (!withinRange(body.position,structure.position,3)) return -9;
  shared.inventory.queue({ id,kind: 'repair',source: worker.unit,target,position: body.position,profile }); return 0;
}
