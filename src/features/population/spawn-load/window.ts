import { spawnLoadWindow } from './model';
import type { SpawnLoadSample, SpawnLoadSegment, SpawnLoadReport } from './model';
/** Half-open segments keep idle/busy/starved history bounded without one object per routine tick. */
export function sampleSpawnLoad(previous: readonly SpawnLoadSegment[], tick: number, sample: SpawnLoadSample): SpawnLoadSegment[] {
  validateSample(tick,sample);
  const start = Math.max(0,tick-spawnLoadWindow+1), segments = previous.filter(segment => segment.to > start).map(segment => ({ ...segment,from: Math.max(start,segment.from) }));
  const last = segments.at(-1);
  if (last && last.to > tick) throw new Error('Duplicate or regressed spawn-load sample');
  if (last?.to === tick && last.busy === sample.busy && last.starved === sample.starved && last.spawns === sample.spawns) last.to = tick+1;
  else segments.push({ ...sample,from: tick,to: tick+1 });
  return segments;
}
export function reportSpawnLoad(segments: readonly SpawnLoadSegment[], tick: number, spawnCount: number): SpawnLoadReport {
  if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(spawnCount) || spawnCount < 0 || spawnCount > 3) throw new Error('Invalid spawn-load report');
  const start = tick-spawnLoadWindow+1; let observed = 0, busyTicks = 0, starvedTicks = 0;
  for (const segment of segments) {
    const overlap = Math.max(0,Math.min(tick+1,segment.to)-Math.max(start,segment.from));
    observed += overlap; busyTicks += overlap*segment.busy; starvedTicks += overlap*segment.starved;
  }
  const denominator = spawnLoadWindow*spawnCount;
  return { load: denominator ? Math.min(1,(busyTicks+starvedTicks)/denominator) : 0,coverage: observed/spawnLoadWindow,busyTicks,starvedTicks,spawnCount };
}
function validateSample(tick: number, sample: SpawnLoadSample): void {
  if (!Number.isSafeInteger(tick) || tick < 0 || ![sample.busy,sample.starved,sample.spawns].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 3)) throw new Error('Invalid spawn-load sample');
  if (sample.busy+sample.starved > sample.spawns) throw new Error('Spawn occupancy counted twice');
}
