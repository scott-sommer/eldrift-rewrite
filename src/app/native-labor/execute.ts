import { recordNativeLaborReceipt, recordNativeLaborFailure } from './receipt';
import { createNativeLaborTaskPorts } from './ports';
import type { NativeLaborPolicy } from './ports';
import { createLaborTaskBehavior } from '../labor-task';
import { createTaskRunner } from '../task-runner';
import { peekState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition } from '../../persistence/tasks/schema';
import { laborTaskDefinition } from '../../features/work/labor-task';
import type { RuntimeConfig } from '../../config/model';
import type { createNativeDispatch } from '../native-dispatch';
/** Worker composition delegates before ordinary cargo/work; a terminal labor task still owns this tick. */
export function createNativeLaborExecution(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, otherDefinitions: Readonly<Record<string,TaskDefinition>>, hooks: Pick<NativeLaborPolicy,'observeIntent'> = {}) {
  const definitions = { ...otherDefinitions,'household-labor': laborTaskDefinition };
  return {
    definitions: { 'household-labor': laborTaskDefinition },
    run(creep: Creep, config: Readonly<RuntimeConfig>): boolean {
      const head = peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue[0];
      if (head?.kind !== 'household-labor') return false;
      const ports = createNativeLaborTaskPorts(state,dispatch,{ ...hooks,enabled: () => config.workersEnabled,
        completed: recordNativeLaborReceipt,failed: recordNativeLaborFailure,
      });
      dispatch.activate();
      createTaskRunner(state,{ 'household-labor': createLaborTaskBehavior(ports) },() => Game.time,definitions)(creep.name,creep);
      return true;
    },
  };
}
