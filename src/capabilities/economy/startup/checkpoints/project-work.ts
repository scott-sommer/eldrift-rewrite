import { integer, keys, numbers, record, requireCheckpoint } from './validation';
import type { StartupConstructionInput, StartupConstructionForecast } from '../construction-model';
import type { SelfBuildForecast, SelfBuildInput } from '../build-model';
const counters = ['remainingProgress','harvestedEnergy','overflowEnergy','constructionEnergy','regeneratedEnergy','unusedCargoEnergy','projectedThrough'];
export function validateProjectConstruction(input: StartupConstructionInput, value: unknown, tick: number): asserts value is StartupConstructionForecast {
  requireCheckpoint(record(value)); const saved = value as StartupConstructionForecast, data = value as Record<string,unknown>;
  requireCheckpoint(keys(data,[...counters,'status','completeAt','source','waves']) && numbers(data,counters));
  requireCheckpoint(validCompletion(saved,tick) && saved.remainingProgress <= input.remainingProgress && saved.projectedThrough <= tick);
  requireCheckpoint(validProjectSource(saved.source,input.source));
  requireCheckpoint(Array.isArray(saved.waves) && saved.waves.length <= input.workers.length);
  requireCheckpoint(saved.waves.every(wave => validWave(wave,input,tick)));
  requireCheckpoint(new Set(saved.waves.map(wave => wave.request)).size === saved.waves.length);
}
export function validProjectSource(value: unknown, expected: SelfBuildInput['source']): boolean {
  if (!record(value) || !keys(value,['energy','capacity','regenerationTicks','regenerationIn'])) return false;
  if (value.capacity !== expected.capacity || value.regenerationTicks !== expected.regenerationTicks) return false;
  return integer(value.energy,0,expected.capacity) && (value.regenerationIn === null || integer(value.regenerationIn,0,expected.regenerationTicks));
}
function validCompletion(saved: StartupConstructionForecast, tick: number): boolean {
  if (saved.remainingProgress === 0) return saved.status === 'complete' && integer(saved.completeAt,0,tick);
  return saved.status === 'incomplete' && saved.completeAt === null;
}
function validWave(value: unknown, input: StartupConstructionInput, tick: number): boolean {
  if (!record(value) || !keys(value,['request','startAt','endAt','work'])) return false;
  if (!input.workers.some(worker => worker.request === value.request)) return false;
  if (!integer(value.startAt,0,tick-1) || !integer(value.endAt,value.startAt+1,tick)) return false;
  return validWork(value.work,value.endAt-value.startAt,input.source);
}
function validWork(value: unknown, ticks: number, source: SelfBuildInput['source']): value is SelfBuildForecast {
  const metrics = ['ticks','remainingProgress','carriedEnergy','sourceEnergy','harvestedEnergy','overflowEnergy','constructionEnergy','regeneratedEnergy','harvestTicks','buildTicks','idleTicks'];
  if (!record(value) || !keys(value,[...metrics,'status','regenerationIn']) || !numbers(value,metrics)) return false;
  if (value.ticks !== ticks || Number(value.harvestTicks)+Number(value.buildTicks)+Number(value.idleTicks) !== ticks) return false;
  if (!['complete','incomplete'].includes(String(value.status))) return false;
  return integer(value.sourceEnergy,0,source.capacity) && (value.regenerationIn === null || integer(value.regenerationIn,0,source.regenerationTicks));
}
