import { createResumableRemoteTravel } from './travel';
import type { StatePort } from '../../../persistence/versioned-state';
import { createIntelStore } from '../../../features/intel/store';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { createRemoteManagement } from '../../../features/remotes/management/cycle';
import type { RemoteManagementRequest, RemoteScanBudget } from '../../../features/remotes/management/model';
import { createNativeRemoteAssessment } from '../assessment/native';
import type { NativeRemoteAssessmentOptions } from '../assessment/native';
import { createRemoteObservationRefresh } from '../native-observations';
import { createCurrentRemoteAdmission } from './current';
/** Explicit policy supplies the candidate set; discovery and population/execution remain separate responsibilities. */
export function createNativeRemoteManagement(state: StatePort, options: NativeRemoteAssessmentOptions) {
  const assess = createNativeRemoteAssessment(state,{ ...options,measure: createResumableRemoteTravel(state) }), refresh = createRemoteObservationRefresh(state);
  const intel = createIntelStore(state), assignments = createRemoteAssignmentStore(state);
  return { advance(request: RemoteManagementRequest, budget: RemoteScanBudget, guard: () => boolean) {
    if (request.tick !== Game.time) throw new Error('Native remote management tick mismatch');
    const home = Game.rooms[request.home];
    if (!home?.controller?.my || home.controller.owner?.username !== request.policy.traversal.username) return { status: 'deferred' as const };
    const admission = createCurrentRemoteAdmission(state,request,refresh,guard,options);
    const manager = createRemoteManagement(state,request.home,{
      summary(room) { refresh([room]); return intel.peek(room,Game.time).record.summary ?? undefined; },
      assess(input,admitted) {
        refresh([request.home,input.room]);
        const owner = assignments.owner(input.room,Game.time);
        return assess({ ...input,...(owner ? { assignedHome: owner.home } : {}) },admitted);
      },
      current: admission.current,currentReservation: admission.currentReservation,
    });
    return manager.advance(request,budget,admission.guard);
  } };
}
