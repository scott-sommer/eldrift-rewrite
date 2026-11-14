import type { WorkAssessment, WorkOrder } from '../../capabilities/work/assessment';
import type { Position } from '../../capabilities/movement/step';
import { constructionOrders, repairOrders, workRange } from './candidates';
import { validateWorkPolicy } from './policy';
import type { WorkerMode, WorkPolicy } from './policy';
/** Keep a valid current target within its priority tier; emergencies can preempt routine work. */
export function selectWork(view: WorkAssessment, origin: Position, mode: WorkerMode, policy: Readonly<WorkPolicy>, current?: string): WorkOrder | undefined {
  validateWorkPolicy(policy);
  const candidates = controllerOrders(view, origin, mode, policy);
  if (mode !== 'upgrader') candidates.push(...constructionOrders(view, origin, policy), ...repairOrders(view, origin, mode, policy));
  candidates.sort((a, b) => a.priority - b.priority || a.score - b.score || a.id.localeCompare(b.id));
  const best = candidates[0];
  return candidates.find(item => item.id === current && item.priority === best?.priority) ?? best;
}
function controllerOrders(view: WorkAssessment, origin: Position, mode: WorkerMode, policy: Readonly<WorkPolicy>): WorkOrder[] {
  const controller = view.controller;
  if (!controller?.owned || controller.position.room !== origin.room) return [];
  const emergency = controller.downgrade < policy.downgradeThreshold;
  if (!emergency && !policy.allowUpgrade) return [];
  if (!emergency && controller.level === 8 && (mode !== 'upgrader' || !policy.allowMaxLevelUpgrade)) return [];
  return [{ id: controller.id, position: controller.position, kind: 'upgrade', priority: emergency ? 0 : 50,
    score: workRange(origin, controller.position) }];
}
