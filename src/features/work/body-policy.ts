import { builderBody, upgraderBody } from '../../capabilities/spawning/worker-recipes';
import type { WorkerMode } from './policy';
export interface WorkerBodyPolicy { budget: number; level: number; builderRecipe?: 'standard' | 'boosted' }
export function workerBody(mode: WorkerMode, plan: WorkerBodyPolicy) {
  if (mode === 'upgrader') return upgraderBody(plan.budget,plan.level);
  return builderBody(plan.budget,mode === 'builder' && plan.builderRecipe === 'boosted');
}
