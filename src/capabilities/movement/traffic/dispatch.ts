import { createTrafficAuthority } from './authority';
import type { TrafficPorts } from './authority';
import type { TrafficRequest } from './model';
import type { MovementIntent } from '../step';
type Settlement = (unit: string, tick: number, outcome: 'issued' | 'traffic-blocked') => void;
/** One shared dispatch instance connects queued requests to actual end-of-tick results. */
export function createTrafficDispatch(ports: TrafficPorts, settle: Settlement) {
  const authority = createTrafficAuthority(ports);
  let flushed: number | undefined;
  return {
    submit(request: TrafficRequest): MovementIntent {
      const result = authority.submit(request);
      return result === 'queued' ? { status: 'queued' } : { status: 'blocked', reason: `traffic-${result}` };
    },
    flush() {
      const tick = ports.clock();
      if (flushed === tick) return authority.flush();
      flushed = tick;
      const batch = authority.flush();
      if (!batch) return batch;
      for (const denial of batch.resolution.denied) {
        if (['destination-conflict', 'dependency-blocked', 'group-blocked'].includes(denial.reason)) settle(denial.unit, tick, 'traffic-blocked');
      }
      for (const outcome of batch.outcomes) {
        if ('intent' in outcome && outcome.intent.status === 'issued') settle(outcome.unit, tick, 'issued');
      }
      return batch;
    },
  };
}
