import type { RemoteBirthPermit } from '../../startup/model';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { createNativeDispatch } from '../../../native-dispatch';
import { validRemoteTaskPayload } from '../../task';
import { createNativeReservationRecruitment } from './recruitment';
import { createNativeReservationActors } from './actors';
export const reservationDefinitions = { reserve: { phases: ['work'],validPayload: validRemoteTaskPayload } };
export function createNativeReservationWorkers(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: (home: string) => Readonly<RuntimeConfig>, otherDefinitions: Readonly<Record<string,TaskDefinition>>, permit: RemoteBirthPermit = () => true) {
  const definitions = reservationDefinitions;
  return { definitions,recruitment: createNativeReservationRecruitment(state,dispatch,{ ...otherDefinitions,...definitions },permit),actors: createNativeReservationActors(state,dispatch,config,{ ...otherDefinitions,...definitions }) };
}
