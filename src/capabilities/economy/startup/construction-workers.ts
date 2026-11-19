import type { StartupScheduledBirth } from './spawn-model';
import type { StartupConstructionInput, StartupBuildWave, StartupConstructionWorker } from './construction-model';
/** Finite, unboosted standard miner lives only. No CLAIM lifetime or invented active worker. */
export function startupConstructionWaves(input: StartupConstructionInput, births: readonly StartupScheduledBirth[]): StartupBuildWave[] {
  if (input.workers.length > 64 || new Set(input.workers.map(worker => worker.request)).size !== input.workers.length) throw new Error('Invalid construction workers');
  const waves: StartupBuildWave[] = [];
  for (const worker of input.workers) {
    const { work,carry } = workerBody(input,worker);
    const birth = births.find(birth => birth.request === worker.request);
    if (!birth) continue;
    const startAt = birth.activeAt+worker.travelTicks, endAt = Math.min(input.spawning.cash.horizon+1,birth.activeAt+1500-worker.retireTicks);
    if (startAt >= endAt) continue;
    waves.push({ request: worker.request,startAt,endAt,carryCapacity: carry*50,harvestPower: work*2,buildPower: work*5 });
  }
  const ordered = waves.sort((a,b) => a.startAt-b.startAt || a.request.localeCompare(b.request));
  if (ordered.some((wave,index) => index > 0 && wave.startAt < ordered[index-1]!.endAt)) throw new Error('Overlapping construction workers require a handoff model');
  return ordered;
}

function workerBody(input: StartupConstructionInput, worker: StartupConstructionWorker) {
  const request = input.spawning.requests.find(request => request.id === worker.request);
  if (!request || ![worker.travelTicks,worker.retireTicks].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1500)) throw new Error('Invalid construction worker timing');
  if (request.body.some(part => !['work','carry','move'].includes(part))) throw new Error('Unsupported construction worker body');
  const work = request.body.filter(part => part === 'work').length, carry = request.body.filter(part => part === 'carry').length;
  if (!work || !carry) throw new Error('Construction worker requires WORK and CARRY');
  if (worker.travelTicks > 0 && !request.body.includes('move')) throw new Error('Travelling construction worker requires MOVE');
  return { work,carry };
}
