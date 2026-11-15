import type { StructureLimits } from '../../capabilities/planning/core-model';
export function nativePlanningLimits(): StructureLimits {
  return Object.fromEntries(Object.entries(CONTROLLER_STRUCTURES).map(([type, levels]) =>
    [type, Array.from({ length: 9 }, (_, level) => levels[level] ?? 0)]));
}
