import { createPlanningRoomCaches } from './planning-room-caches';
import { createConfiguredPlanningFeature } from './configured-planning-feature';
import { createNativePlanningWork } from './native-planning-work';
import { nativePlanningPolicy } from './native-planning-policy';
import type { NativePlanningPolicy } from './native-planning-work';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { PlanningFeaturePorts } from './planning-feature';
export interface NativePlanningOptions {
  policy?: (room: string, config: Readonly<RuntimeConfig>) => NativePlanningPolicy;
  report?: PlanningFeaturePorts['report'];
}
export function createNativePlanningFeature(
  state: StatePort, readConfig: (room: string) => Readonly<RuntimeConfig>, options: NativePlanningOptions = {},
) {
  const policy = options.policy ?? nativePlanningPolicy;
  const caches = createPlanningRoomCaches();
  return createConfiguredPlanningFeature({
    usedCpu: () => Game.cpu.getUsed(), tickLimit: () => Game.cpu.tickLimit,
    prepare(context, canContinue) {
      const room = context.room.name;
      const cache = caches(room);
      const result = createNativePlanningWork(state, room, () => policy(room, readConfig(room)), cache.replay, cache.assess)(canContinue);
      return result.status === 'ready' ? result.work : undefined;
    },
    report: options.report ?? (() => {}),
  });
}
