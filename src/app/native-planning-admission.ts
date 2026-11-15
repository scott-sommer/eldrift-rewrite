import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { PlanningConstraint } from '../capabilities/planning/assessment-model';
import { observeRoomPlanningInput } from '../adapters/screeps/room-assessment';
import { createPlanStore } from '../features/planning/plan-store';
import { createPlanningJobStore } from '../features/planning/planning-job-store';
import { createEnumerationStore } from '../features/planning/enumeration-store';
import { createPlanningRequestStore } from '../features/planning/planning-request-store';
import { admitPlanningRequest } from '../features/planning/planning-admission';
export function createNativePlanningAdmission(
  state: StatePort, valuableTypes: readonly string[], implementationRevision: string,
) {
  return (name: string, config: Readonly<RuntimeConfig>, constraints: readonly PlanningConstraint[] = []) => {
    if (!config.planningEnabled) return { status: 'unavailable' as const, reason: 'disabled' as const };
    const room = Game.rooms[name];
    if (!room) return { status: 'unavailable' as const, reason: 'hidden' as const };
    if (!room.controller?.my) return { status: 'unavailable' as const, reason: 'not-owned' as const };
    const observation = observeRoomPlanningInput(name, { constraints });
    if (!observation) return { status: 'unavailable' as const, reason: 'hidden' as const };
    const types = Object.keys(CONTROLLER_STRUCTURES);
    const stores = { plans: createPlanStore(state, name, types), jobs: createPlanningJobStore(state, name, types),
      candidates: createEnumerationStore(state, name), requests: createPlanningRequestStore(state, name, types) };
    const admission = admitPlanningRequest(stores.requests, observation, stores.plans.read(), config,
      valuableTypes, implementationRevision, stores.jobs.read().receipt);
    return { ...admission, stores };
  };
}
