import { validateBuildProfile } from '../../../../capabilities/construction/build-effect';
import { validateRepairProfile } from '../../../../capabilities/mining/repair-effect';
import type { BuildProfile } from '../../../../capabilities/construction/build-effect';
import type { RepairProfile } from '../../../../capabilities/mining/repair-effect';
import type { PaidHomeBody } from '../home-observation/model';
import type { HomeHaulingInput } from '../hauling-state/world/model';
interface MinerProfile { build: BuildProfile; repair: RepairProfile; harvestPower: number }
export function readHomeMinerRoster(home: HomeHaulingInput) {
  return home.sources.flatMap(source => source.miners.map(miner => {
    const worker = { name: miner.paid.request,unit: miner.observation.unit },body = home.bodies.find(body => body.unit === worker.unit);
    const physical = home.workers.find(physical => physical.name === worker.name);
    if (!body || body.name !== worker.name || physical?.owner !== miner.paid.owner) throw new Error('Home miner actor ownership mismatch');
    return { worker,paid: miner.paid,plan: source.plan,demand: source.demand.id,profile: readProfile(body),expiresAt: home.observedAt+(physical.ticksToLive ?? 0) };
  }));
}
function readProfile(body: PaidHomeBody): MinerProfile {
  if (!body.build || !body.repair || body.harvestPower === undefined) throw new Error('Missing native forecast miner WORK profile');
  validateBuildProfile(body.build); validateRepairProfile(body.repair);
  if (!Number.isSafeInteger(body.harvestPower) || body.harvestPower < 0 || body.harvestPower > 1000000) throw new Error('Invalid forecast miner harvest power');
  return { build: body.build,repair: body.repair,harvestPower: body.harvestPower };
}
