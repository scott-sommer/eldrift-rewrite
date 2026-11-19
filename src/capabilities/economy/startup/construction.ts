import { advanceStartupSource } from './source';
import { forecastSelfBuild } from './self-build';
import { forecastStartupSpawns } from './spawns';
import { startupConstructionWaves } from './construction-workers';
import type { StartupConstructionInput, StartupConstructionForecast, StartupBuildWave } from './construction-model';
/** Composition only: supplied spawn/refill schedules determine finite builder lives; no income is invented. */
export function forecastStartupConstruction(input: StartupConstructionInput) {
  const spawning = forecastStartupSpawns(input.spawning);
  const waves = startupConstructionWaves(input,spawning.births);
  // Validate source/progress even when no worker can be born.
  forecastSelfBuild({ remainingProgress: input.remainingProgress,source: input.source,carriedEnergy: 0,carryCapacity: 50,harvestPower: 2,buildPower: 5,maximumTicks: 0 });
  const construction: StartupConstructionForecast = { status: input.remainingProgress === 0 ? 'complete' : 'incomplete',completeAt: input.remainingProgress === 0 ? 0 : null,
    remainingProgress: input.remainingProgress,harvestedEnergy: 0,constructionEnergy: 0,regeneratedEnergy: 0,unusedCargoEnergy: 0,projectedThrough: 0,source: { ...input.source },waves: [] };
  let tick = 0;
  for (const wave of waves) {
    if (construction.status === 'complete') break;
    construction.regeneratedEnergy += advanceStartupSource(construction.source,wave.startAt-tick);
    applyWave(construction,wave); tick = wave.endAt;
  }
  return { spawning,construction };
}
function applyWave(result: StartupConstructionForecast, wave: StartupBuildWave): void {
  const work = forecastSelfBuild({ ...wave,source: result.source,remainingProgress: result.remainingProgress,carriedEnergy: 0,maximumTicks: wave.endAt-wave.startAt });
  result.projectedThrough = wave.startAt+work.ticks;
  result.waves.push({ request: wave.request,startAt: wave.startAt,endAt: wave.startAt+work.ticks,work });
  result.harvestedEnergy += work.harvestedEnergy; result.constructionEnergy += work.constructionEnergy;
  result.regeneratedEnergy += work.regeneratedEnergy; result.unusedCargoEnergy += work.carriedEnergy;
  result.remainingProgress = work.remainingProgress; result.source = { ...result.source,energy: work.sourceEnergy,regenerationIn: work.regenerationIn };
  if (work.status === 'complete') { result.status = 'complete'; result.completeAt = wave.startAt+work.ticks; }
}
