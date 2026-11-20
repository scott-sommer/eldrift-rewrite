import { parsePlain } from '../../../../core/plain-data';
import { startupProjectIdentity } from '../../../../capabilities/economy/startup/checkpoints/project-identity';
import type { StartupDeliveryInput } from '../../../../capabilities/economy/startup/delivery-model';
import type { StartupPlanningInput } from './model';
/** Reuse the portable identity wire; the simulator validates all decoded domain inputs. */
export function encodeStartupPlanningInput(input: StartupDeliveryInput): StartupPlanningInput {
  return parsePlain(startupProjectIdentity(input)) as StartupPlanningInput;
}
export function decodeStartupPlanningInput(input: StartupPlanningInput): StartupDeliveryInput {
  const spawning = input.project.spawning;
  const names = spawning.liveNames;
  if (!Array.isArray(names) || !names.every(name => typeof name === 'string') || new Set(names).size !== names.length) throw new Error('Invalid startup planning live names');
  const requests = spawning.requests.map(request => {
    const { home,placement,...rest } = request;
    return { ...rest,...(home === null ? {} : { home }),...(placement === null ? {} : { placement }) };
  });
  return { ...input,project: { ...input.project,spawning: { ...spawning,requests,liveNames: new Set(names) } } };
}
