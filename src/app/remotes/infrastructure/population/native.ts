import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { createNativeDispatch } from '../../../native-dispatch';
import { validRemoteTaskPayload } from '../../task';
import { createNativeConstructionRecruitment } from './recruitment';
import { createNativeConstructionActors } from './actors';
export function createNativeRemoteConstructionWorkers(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: (home: string) => Readonly<RuntimeConfig>,
  otherDefinitions: Readonly<Record<string,TaskDefinition>>) {
  const definitions = { 'remote-work': { phases: ['work'],validPayload: validRemoteTaskPayload } };
  return { definitions,recruitment: createNativeConstructionRecruitment(state,dispatch),actors: createNativeConstructionActors(state,dispatch,config,{ ...otherDefinitions,...definitions }) };
}
