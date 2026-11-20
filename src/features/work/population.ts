import type { BodyPart } from '../../capabilities/spawning/body';
import type { SpawnBoost } from '../../capabilities/spawning/boost';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import type { PopulationUnit } from '../../capabilities/spawning/demand';
import { builderBody, upgraderBody } from '../../capabilities/spawning/worker-recipes';
import { applyPopulationDemand } from '../population/apply-demand';
import { createSpawnQueue } from '../population/spawn-queue';
import { workOwner, workModeFor, workerModes } from './identity';
import type { WorkerMode } from './policy';
export interface WorkerPopulationPlan {
  room: string; level: number; enabled: boolean; budget: number; fallback: WorkerMode;
  targets: Readonly<Record<WorkerMode, number>>;
  selectBirthBoost?: (mode: WorkerMode,body: readonly BodyPart[]) => SpawnBoost | null | 'wait';
}
export function reconcileWorkerPopulation(state: StatePort, plan: WorkerPopulationPlan, units: readonly PopulationUnit[], tick: number): void {
  const scoped = units.map(unit => {
    const mode = workModeFor(unit.owner, plan.room, plan.fallback);
    return mode ? { ...unit, owner: workOwner(plan.room, mode) } : unit;
  });
  for (const mode of workerModes) {
    const owner = workOwner(plan.room, mode);
    const body = mode === 'upgrader' ? upgraderBody(plan.budget, plan.level) : builderBody(plan.budget);
    if (!plan.enabled || !body || plan.targets[mode] === 0) { cancelWorkerDemand(state, plan.room, owner); continue; }
    applyPopulationDemand(state, { owner, room: plan.room, body: body.parts, desired: plan.targets[mode],
      replacementParts: body.parts.length, travelTicks: 25, marginTicks: 10, priority: 5 + workerModes.indexOf(mode), requestLifetime: 100,...(plan.selectBirthBoost ? { selectBirthBoost: (parts: readonly BodyPart[]) => plan.selectBirthBoost!(mode,parts) } : {}) }, scoped, tick);
  }
}
function cancelWorkerDemand(state: StatePort, room: string, owner: string): void {
  if (state.read(stateKey('spawning', room)) === undefined) return;
  const queue = createSpawnQueue(state, room);
  for (const request of queue.list().filter(item => item.owner === owner)) queue.cancel(request.id, owner);
}
