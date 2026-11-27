import { startupProjectIdentity } from '../checkpoints/project-identity';
import { StartupCheckpointCapacityError } from '../checkpoints/capacity';
import { record } from '../checkpoints/validation';
import type { prepareStartupHomeProject } from './input';
export function startupHomeIdentity(input: ReturnType<typeof prepareStartupHomeProject>): string {
  const wire = { format: 1,spawning: { ...input.spawning,liveNames: [...input.spawning.liveNames].sort() },sink: input.sink,...(input.household ? { household: input.household } : {}),sources: input.sources.map(source => ({ id: source.id,binding: startupProjectIdentity(source.input) })) };
  const binding = JSON.stringify(wire,(_key,value: unknown) => record(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key,value[key]])) : value);
  if (binding.length > 262144) throw new StartupCheckpointCapacityError('Home checkpoint input capacity');
  return binding;
}
