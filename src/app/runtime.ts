import { resolveConfig } from '../config/resolve';
import { createScheduler } from '../core/scheduling/scheduler';
import { observeTick } from '../world/observe';
import type { EffectiveConfig } from '../config/model';
import { runtimeJobs } from './runtime-jobs';
import type { RuntimeFeature, RuntimePorts, RuntimeResult } from './runtime-model';
export function createRuntime(features: readonly RuntimeFeature[], ports: RuntimePorts) {
  const scheduler = createScheduler([], ports, 0);
  let last: RuntimeResult | undefined;
  return {
    tick(): RuntimeResult {
      const clock = ports.clock();
      if (last?.world.tick === clock.tick) return last;
      const empire = resolveConfig(ports.config(), clock.tick);
      const configs = new Map<string, EffectiveConfig>();
      const world = observeTick(clock.tick, ports.observations, name => {
        const config = resolveConfig(ports.config(name), clock.tick);
        configs.set(name, config);
        return config.values.allies;
      });
      const jobs = runtimeJobs(features, world, empire, configs);
      scheduler.synchronize(jobs, clock.tick);
      const failures = scheduler.run({ ...clock, ...empire.values });
      last = { world, failures };
      return last;
    },
  };
}


