import { peekState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition } from '../../persistence/tasks/schema';
import { createTaskRunner } from '../task-runner';
import type { TaskBehavior } from '../task-runner';
import { createRemoteMiningTaskBehavior } from './mining-task';
import type { RemoteMiningDemand,RemoteMiningTaskPorts } from './mining-task';
import { cancelTask } from '../cancel-task';
import { assignRemoteTask } from './assign-task';
export interface RemoteMiningCyclePorts<Context> extends RemoteMiningTaskPorts<Context> {
  eligible(context: Context): boolean;
  cargo(context: Context): number;
  lifetime(context: Context): number;
  mode(context: Context,definitions: Readonly<Record<string,TaskDefinition>>): 'hold' | 'bank' | 'service';
}
/** Shared actor/task control; native and forecast adapters retain physics, safety and banking ownership. */
export function createRemoteMiningCycle<Context>(state: StatePort,binding: { home: string; owner: string },ports: RemoteMiningCyclePorts<Context>,
  banking: Readonly<Record<string,TaskBehavior<Context>>>,otherDefinitions: Readonly<Record<string,TaskDefinition>> = {}) {
  if (typeof binding.owner !== 'string' || !binding.owner) throw new Error('Remote mining actor owner is required');
  const behaviors = { 'remote-mine': createRemoteMiningTaskBehavior(state,ports),...banking };
  const definitions = { ...otherDefinitions,...behaviors },execute = createTaskRunner(state,behaviors,ports.clock,definitions);
  const head = (context: Context) => peekState(state,'tasks/'+ports.unit(context),taskSchema(ports.unit(context),definitions))?.queue[0];
  function prepare(context: Context,demand?: RemoteMiningDemand): boolean {
    const task = head(context),name = ports.unit(context);
    if (!task && ports.cargo(context) > 0) { ports.retire(context,binding.home,'remote-return:'+name); return false; }
    if (!demand && task?.kind === 'remote-mine') cancelTask(state,name,task.id,definitions);
    if (demand?.home === binding.home) assignRemoteTask(state,definitions,'remote-mine',name,demand,ports.clock(),ports.lifetime(context));
    return true;
  }
  return { definitions,
    run(context: Context,demand?: RemoteMiningDemand): void {
      if (!ports.eligible(context)) return;
      const mode = ports.mode(context,definitions);
      if (mode === 'hold') return;
      if (mode === 'service' && !prepare(context,demand)) return;
      if (head(context)) execute(ports.unit(context),context);
      else if (mode === 'service') ports.retire(context,binding.home,'remote-return:'+ports.unit(context));
    },
  };
}
