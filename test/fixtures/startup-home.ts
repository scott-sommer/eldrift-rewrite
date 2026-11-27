import { startupInitialMotionInput } from './startup-initial-motion';
import type { StartupHomeProjectInput,StartupHomeSourceInput } from '../../src/capabilities/economy/startup/home/model';
export function startupHomeInput(): StartupHomeProjectInput {
  const base = startupInitialMotionInput(),spawning = base.project.spawning;
  spawning.room = 'W0N1'; spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: 'W0N1' }));
  const sources = ['a','b'].map((name,index) => {
    const input = JSON.parse(JSON.stringify(base,(_key,value) => value instanceof Set ? [] : value).replaceAll('paid-courier',name)) as typeof base;
    const motion = input.motion!;
    if (index) {
      for (const route of motion.routes) for (const plan of [route.approach,route.empty,route.loaded]) { plan.origin.y++; for (const point of plan.path) point.y++; }
      for (const opening of motion.openings!) { opening.plan.origin.y++; for (const point of opening.plan.path) point.y++; }
      for (const fact of motion.terrain) fact.position.y++;
    }
    return { id: name,requests: [],project: { workers: [],remainingProgress: 0,source: input.project.source },couriers: [],containerCapacity: input.containerCapacity,container: input.container,initial: input.initial!,motion } satisfies StartupHomeSourceInput;
  });
  return { spawning,sink: { capacity: 50,freeCapacity: 50,changes: [] },sources };
}
