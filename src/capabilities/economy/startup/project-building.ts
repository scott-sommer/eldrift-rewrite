import { forecastSelfBuild } from './self-build';
import type { StartupConstructionForecast, StartupBuildWave } from './construction-model';
import type { StartupDeliveryForecast } from './delivery-model';
import type { SelfBuildForecast } from './build-model';
/** Exactly one supplied at-station action, including that frame's source regeneration. */
export function advanceStartupBuilding(construction: StartupConstructionForecast, delivery: StartupDeliveryForecast, wave: StartupBuildWave, tick: number): void {
  const work = forecastSelfBuild({ ...wave,remainingProgress: construction.remainingProgress,source: delivery.source,carriedEnergy: delivery.minerCargoEnergy,maximumTicks: 1 });
  delivery.minerCargoEnergy = work.carriedEnergy; delivery.source.energy = work.sourceEnergy; delivery.source.regenerationIn = work.regenerationIn;
  delivery.uncapturedOverflowEnergy += work.overflowEnergy;
  construction.remainingProgress = work.remainingProgress; construction.harvestedEnergy += work.harvestedEnergy;
  construction.overflowEnergy += work.overflowEnergy; construction.constructionEnergy += work.constructionEnergy; construction.regeneratedEnergy += work.regeneratedEnergy;
  recordWave(construction,wave,work,tick);
  if (work.status === 'complete') {
    construction.status = 'complete'; construction.completeAt = tick+1; construction.unusedCargoEnergy += work.carriedEnergy;
  }
}
function recordWave(construction: StartupConstructionForecast, wave: StartupBuildWave, work: SelfBuildForecast, tick: number): void {
  const previous = construction.waves.at(-1);
  if (!previous || previous.request !== wave.request) { construction.waves.push({ request: wave.request,startAt: tick,endAt: tick+1,work }); return; }
  previous.endAt = tick+1;
  previous.work = { ...work,ticks: previous.work.ticks+work.ticks,harvestedEnergy: previous.work.harvestedEnergy+work.harvestedEnergy,
    constructionEnergy: previous.work.constructionEnergy+work.constructionEnergy,regeneratedEnergy: previous.work.regeneratedEnergy+work.regeneratedEnergy,
    overflowEnergy: previous.work.overflowEnergy+work.overflowEnergy,harvestTicks: previous.work.harvestTicks+work.harvestTicks,
    buildTicks: previous.work.buildTicks+work.buildTicks,idleTicks: previous.work.idleTicks+work.idleTicks };
}
