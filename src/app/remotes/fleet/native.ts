import { admitRemoteFleetSpawn } from './admission';
import type { SpawnRequest } from '../../../capabilities/spawning/request';
import type { RemoteBirthPermit, RemoteFleetBirthPolicy } from '../startup/model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { TaskDefinition } from '../../../persistence/tasks/schema';
import type { RemoteManagementRequest } from '../../../features/remotes/management/model';
import type { RemoteAssignment } from '../../../features/remotes/assignment-model';
import type { RemotePortfolio } from '../../../features/remotes/portfolio-model';
import { createRemoteManagementStore } from '../../../features/remotes/management/store';
import { publishRemoteFleet } from '../../../features/remotes/fleet/plan';
import { validRemoteTaskPayload } from '../task';
import { createNativeRemoteRecruitment } from './recruitment';
import { createNativeRemoteActors } from './actors';
import type { createNativeDispatch } from '../../native-dispatch';
export const remoteFleetDefinitions = { 'remote-mine': { phases: ['work'],validPayload: validRemoteTaskPayload } };
export function createNativeRemoteWorkers(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: (home: string) => Readonly<RuntimeConfig>,
  otherDefinitions: Readonly<Record<string,TaskDefinition>>, permit: RemoteBirthPermit = () => true,births?: RemoteFleetBirthPolicy) {
  const definitions = { ...otherDefinitions,...remoteFleetDefinitions };
  return { definitions: remoteFleetDefinitions,recruitment: createNativeRemoteRecruitment(state,dispatch,permit,births),actors: createNativeRemoteActors(state,dispatch,config,definitions,births),
    admit: (request: SpawnRequest) => admitRemoteFleetSpawn(state,request,config,births),
    publish(request: RemoteManagementRequest, result: { assignments: RemoteAssignment[]; portfolio: RemotePortfolio }): void {
      const policy = config(request.home);
      if (!policy.remoteWorkersEnabled) return;
      publishRemoteFleet(state,request.home,request.tick,result.assignments,result.portfolio,createRemoteManagementStore(state,request.home).read().offers,policy.remoteWorkerMaximumUnits);
    } };
}
