import { validateStation } from './station';
import type { MiningStation } from './station';
export interface MiningCapacity { id: string; rate: number }
export interface MiningCapacityPlan { missing: number; cancel: string[]; committedRate: number; shortfall: number }
/** Live and queued production count separately; retiring workers are excluded by the caller. */
export function planMiningCapacity(station: MiningStation, live: readonly MiningCapacity[],
  queued: readonly MiningCapacity[], replacementRate: number): MiningCapacityPlan {
  validateStation(station);
  validateCapacity([...live, ...queued], replacementRate);
  const enabled = station.risk === 'safe' && station.throughput > 0
    && (station.kind === 'energy' || (station.available > 0 && !!station.extractor));
  const throughput = enabled ? station.throughput : 0;
  let committedRate = live.reduce((total, worker) => total + worker.rate, 0);
  let slots = Math.max(0, station.access.length - live.length);
  const cancel: string[] = [];
  for (const request of queued) {
    if (request.rate === 0 || slots === 0 || committedRate >= throughput) { cancel.push(request.id); continue; }
    slots--;
    committedRate += request.rate;
  }
  const deficit = Math.max(0, throughput - committedRate);
  const missing = Math.min(slots, Math.ceil(deficit / replacementRate));
  return { missing, cancel, committedRate, shortfall: Math.max(0, deficit - missing * replacementRate) };
}
function validateCapacity(workers: readonly MiningCapacity[], replacementRate: number): void {
  if (!Number.isFinite(replacementRate) || replacementRate <= 0) throw new Error('Invalid replacement production rate');
  if (workers.some(worker => !worker.id || !Number.isFinite(worker.rate) || worker.rate < 0)) throw new Error('Invalid mining capacity');
  if (new Set(workers.map(worker => worker.id)).size !== workers.length) throw new Error('Duplicate mining capacity identity');
}

