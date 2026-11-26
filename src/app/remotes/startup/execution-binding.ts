import { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import { createIntelStore } from '../../../features/intel/store';
import { selectionBinding } from '../../../features/remotes/startup/selection-validation';
import { prepareRemoteMatrices } from '../assessment/matrices';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { StartupTravelPlan } from '../../../features/remotes/startup/travel-model';
import type { StartupReturnPolicy } from '../../../capabilities/economy/startup/assessment';
/** Fresh read-only configuration/static topology key; lease, stock and spending gates remain independent. */
export function createNativeStartupExecutionBinding(state: StatePort) {
  const intel = createIntelStore(state), snapshots = createMatrixSnapshots();
  return (plan: StartupTravelPlan, rooms: readonly string[], config: Readonly<RuntimeConfig>, policy: StartupReturnPolicy): string | undefined => {
    const context = { intel: (room: string) => intel.peek(room,Game.time).record };
    if (!rooms.includes(plan.home) || !rooms.includes(plan.room) || rooms.some(room => !Game.rooms[room] && !context.intel(room).summary)) return undefined;
    const matrices = prepareRemoteMatrices(context,rooms,1,snapshots);
    const binding = JSON.stringify(['startup-execution-v2',plan,configurationGroups(config),policy,matrices.version],orderedObject);
    return selectionBinding(binding) ? binding : undefined;
  };
}
function orderedObject(_key: string, value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)));
}

/** Lossless camel-prefix dictionary: original key = group name + suffix, including empty suffix. */
function configurationGroups(config: Readonly<RuntimeConfig>): Record<string,Record<string,unknown>> {
  const groups: Record<string,Record<string,unknown>> = {};
  for (const [key,value] of Object.entries(config)) {
    const prefix = key.match(/^[a-z]+/)?.[0] ?? key;
    (groups[prefix] ??= {})[key.slice(prefix.length)] = value;
  }
  return groups;
}
