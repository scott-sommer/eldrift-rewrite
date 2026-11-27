import { validTrafficOrder } from './validation';
import type { IntentResult } from '../../../core/execution/action-arbiter';
import type { Occupant, TrafficRequest, TrafficResolution } from './model';
import { tileKey, trafficTargets } from './model';
import { resolveTraffic } from './resolve';
export interface TrafficBatch {
  resolution: TrafficResolution;
  outcomes: ({ unit: string; intent: IntentResult } | { unit: string; error: unknown })[];
}
export interface TrafficPorts {
  clock(): number;
  observe(): readonly Occupant[];
  legal(request: TrafficRequest): boolean;
  issue(request: TrafficRequest): IntentResult;
}
export function createTrafficAuthority(ports: TrafficPorts, maximum = 1000) {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid traffic capacity');
  let tick: number | undefined;
  let sealed = false;
  let result: TrafficBatch | undefined;
  const requests = new Map<string, TrafficRequest>();
  function synchronize(): void {
    const current = ports.clock();
    if (!Number.isSafeInteger(current) || current < 0) throw new Error('Invalid traffic clock');
    if (tick === current) return;
    tick = current; sealed = false; result = undefined; requests.clear();
  }
  return {
    submit(request: TrafficRequest): 'queued' | 'sealed' | 'duplicate' | 'capacity' {
      synchronize();
      if (sealed) return 'sealed';
      if (requests.has(request.unit)) return 'duplicate';
      if (requests.size >= maximum) return 'capacity';
      validateSubmission(request);
      requests.set(request.unit, { ...request, from: { ...request.from }, to: { ...request.to }, ...(request.via ? { via: { ...request.via } } : {}) });
      return 'queued';
    },
    flush(): TrafficBatch | undefined {
      synchronize();
      if (sealed) return result;
      sealed = true; // Seal before callbacks: throws/re-entry must never duplicate uncertain intents.
      const resolution = resolveTraffic([...requests.values()], ports.observe(), ports.legal, maximum);
      result = { resolution, outcomes: [] };
      for (const request of resolution.accepted) {
        try { result.outcomes.push({ unit: request.unit, intent: ports.issue(request) }); }
        catch (error) { result.outcomes.push({ unit: request.unit, error }); }
      }
      return result;
    },
  };
}
function validateSubmission(request: TrafficRequest): void {
  if (!request.unit || !request.owner || !Number.isFinite(request.priority)) throw new Error('Invalid traffic request');
  if (!validTrafficOrder(request.order)) throw new Error('Invalid traffic order');
  tileKey(request.from); trafficTargets(request);
}

