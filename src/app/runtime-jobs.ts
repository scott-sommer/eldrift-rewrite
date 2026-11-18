import type { EffectiveConfig } from '../config/model';
import type { ScheduledWork } from '../core/scheduling/model';
import type { TickView } from '../world/model';
import type { RuntimeFeature } from './runtime-model';
/** Empire jobs own shared budgets; room jobs retain their individual configuration. */
export function runtimeJobs(features: readonly RuntimeFeature[], world: TickView,
  empire: EffectiveConfig, configs: ReadonlyMap<string, EffectiveConfig>): ScheduledWork[] {
  return features.flatMap(feature => {
    if (feature.scope === 'empire') return [{ id: `empire/${feature.id}`, urgency: feature.urgency,
      interval: feature.interval, background: empire.values, run: () => feature.run({ world, config: empire, rooms: configs }) }];
    return [...world.rooms.values()].filter(room => room.owned || feature.scope === 'visible').map(room => {
      const config = configs.get(room.name)!;
      return { id: `${room.name}/${feature.id}`, room: room.name, urgency: feature.urgency,
        interval: feature.interval, background: config.values, run: () => feature.run({ world, room, config }) };
    });
  });
}
