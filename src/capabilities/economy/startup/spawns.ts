import { createStartupSpawnTimeline } from './spawn-timeline';
import type { StartupSpawnInput, StartupSpawnForecast } from './spawn-model';
/** Static external flows; use the timeline phases when projected earned receipts also finance births. */
export function forecastStartupSpawns(input: StartupSpawnInput): StartupSpawnForecast {
  const timeline = createStartupSpawnTimeline(input);
  for (let tick = 0; tick <= input.cash.horizon; tick++) { timeline.begin(tick); timeline.finish(); }
  return timeline.result();
}
