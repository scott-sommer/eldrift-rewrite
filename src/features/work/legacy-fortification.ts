import type { WorkAssessment, WorkOrder, WorkStructure } from '../../capabilities/work/assessment';
import type { Position } from '../../capabilities/movement/step';
export function fortificationCeiling(level: number, maximum: number, override: number): number {
  return override > 0 ? override : level === 8 ? Math.max(0, maximum - 400000) : maximum / 2;
}
export function legacyFortificationOrders(view: WorkAssessment, origin: Position, ceiling: number, current?: string): WorkOrder[] {
  const barriers = view.structures.filter(item => item.position.room === origin.room && item.eligible && !item.excluded
    && (item.type === 'constructedWall' || item.type === 'rampart') && item.hits < item.maximum);
  const retained = barriers.find(item => item.id === current);
  const selected = retained ?? choose(barriers, origin, ceiling, 20000) ?? choose(barriers, origin, ceiling, 1);
  return selected ? [{ id: selected.id, position: selected.position, kind: 'repair', priority: 40,
    score: 0, targetHits: selected.maximum }] : [];
}
function choose(barriers: WorkStructure[], origin: Position, ceiling: number, weight: number): WorkStructure | undefined {
  const score = (item: WorkStructure) => item.hits + weight * Math.max(Math.abs(origin.x - item.position.x), Math.abs(origin.y - item.position.y));
  return barriers.filter(item => score(item) < ceiling).sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id))[0];
}
