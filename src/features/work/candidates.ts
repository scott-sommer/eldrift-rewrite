import { legacyFortificationOrders } from './legacy-fortification';
import type { WorkAssessment, WorkOrder, WorkStructure } from '../../capabilities/work/assessment';
import type { Position } from '../../capabilities/movement/step';
import type { WorkerMode, WorkPolicy } from './policy';
export function workRange(from: Position, to: Position): number {
  return from.room === to.room ? Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y)) : Infinity;
}
export function constructionOrders(view: WorkAssessment, origin: Position, policy: Readonly<WorkPolicy>): WorkOrder[] {
  return view.sites.filter(site => site.ready && site.progress < site.total && site.position.room === origin.room).map(site => {
    const rank = policy.constructionOrder.indexOf(site.type);
    return { id: site.id, position: site.position, kind: 'build', priority: 20,
      score: (rank < 0 ? policy.constructionOrder.length : rank) * 100 + workRange(origin, site.position) };
  });
}
export function repairOrders(view: WorkAssessment, origin: Position, mode: WorkerMode, policy: Readonly<WorkPolicy>, current?: string): WorkOrder[] {
  if (mode === 'fortifier' && policy.legacyFortificationCeiling !== undefined) return legacyFortificationOrders(view, origin, policy.legacyFortificationCeiling, current);
  return view.structures.filter(item => item.eligible && !item.excluded && item.position.room === origin.room)
    .flatMap(item => repairOrder(item, origin, mode, policy));
}
function repairOrder(item: WorkStructure, origin: Position, mode: WorkerMode, policy: Readonly<WorkPolicy>): WorkOrder[] {
  const barrier = item.type === 'rampart' || item.type === 'constructedWall';
  const targetHits = repairTarget(item, policy);
  if (item.hits >= targetHits) return [];
  const critical = !barrier && item.hits < item.maximum * policy.criticalRepairFraction;
  if (mode === 'fortifier' && !barrier && !critical) return [];
  const priority = critical ? 10 : barrier ? barrierPriority(item, mode, targetHits) : 30;
  const score = barrier ? item.hits + workRange(origin, item.position) * policy.barrierDistanceWeight : workRange(origin, item.position);
  return [{ id: item.id, position: item.position, kind: 'repair', priority, score, targetHits }];
}
function barrierPriority(item: WorkStructure, mode: WorkerMode, targetHits: number): number {
  if (mode === 'fortifier' || item.type === 'rampart') return 40;
  return item.hits < targetHits / 2 ? 41 : 42;
}

function repairTarget(item: WorkStructure, policy: Readonly<WorkPolicy>): number {
  if (item.type === 'rampart') return Math.min(item.maximum, Math.floor(policy.rampartHits));
  if (item.type === 'constructedWall') return Math.min(item.maximum, Math.floor(policy.wallHits));
  return Math.floor(item.maximum * policy.routineRepairFraction);
}
