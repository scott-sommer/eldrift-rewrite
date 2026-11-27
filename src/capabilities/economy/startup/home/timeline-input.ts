import type { prepareStartupHomeProject } from './input';
export function startupHomeTimelineInput(input: ReturnType<typeof prepareStartupHomeProject>) {
  const anchor = input.sources[0]!.input;
  return { ...anchor,project: { ...anchor.project,spawning: input.spawning,workers: input.sources.flatMap(source => source.input.project.workers) },couriers: input.sources.flatMap(source => source.input.couriers),...(input.household ? { household: input.household } : {}) };
}
