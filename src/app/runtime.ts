import { resolveConfig } from '../config/resolve';
import { createScheduler } from '../core/scheduling/scheduler';
import { observeTick } from '../world/observe';
import type { EffectiveConfig } from '../config/model';
import type { ScheduledWork } from '../core/scheduling/model';
import type { RoomFeature, RuntimePorts, RuntimeResult } from './runtime-model';
export function createRuntime(features: readonly RoomFeature[], ports: RuntimePorts) {
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
      const jobs: ScheduledWork[] = [...world.rooms.values()].flatMap(room => {
        const config = configs.get(room.name)!;
        return features.filter(feature => room.owned || feature.scope === 'visible').map(feature => ({
          id: `${room.name}/${feature.id}`, room: room.name,
          urgency: feature.urgency, interval: feature.interval, background: config.values,
          run: () => feature.run({ world, room, config }),
        }));
      });
      scheduler.synchronize(jobs, clock.tick);
      const failures = scheduler.run({ ...clock, ...empire.values });
      last = { world, failures };
      return last;
    },
  };
}


