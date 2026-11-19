import type { RemoteBirthPermit } from '../../startup/model';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { createNativeDispatch } from '../../../native-dispatch';
import { validRemoteTaskPayload } from '../../task';
import { createNativeConstructionRecruitment } from './recruitment';
import { createNativeConstructionActors } from './actors';
export const remoteConstructionDefinitions = { 'remote-work': { phases: ['work'],validPayload: validRemoteTaskPayload } };
export function createNativeRemoteConstructionWorkers(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: (home: string) => Readonly<RuntimeConfig>,
  otherDefinitions: Readonly<Record<string,TaskDefinition>>, permit: RemoteBirthPermit = () => true) {
  const definitions = remoteConstructionDefinitions;
  return { definitions,recruitment: createNativeConstructionRecruitment(state,dispatch,permit),actors: createNativeConstructionActors(state,dispatch,config,{ ...otherDefinitions,...definitions }) };
}
