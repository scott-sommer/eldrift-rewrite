import type { WorkAssessment } from './assessment';
export interface RepairRegion { room: string; left: number; right: number; top: number; bottom: number }
/** Exclusion changes eligibility only; execution and target retention remain owned by work policy. */
export function excludeBarrierRepairs(view: WorkAssessment, region: RepairRegion | 'all' | undefined,
  types: readonly string[] = ['constructedWall', 'rampart']): WorkAssessment {
  if (!region) return view;
  return { ...view, structures: view.structures.map(item => {
    const barrier = types.includes(item.type);
    const inside = region === 'all' || item.position.room === region.room && item.position.x >= region.left
      && item.position.x <= region.right && item.position.y >= region.top && item.position.y <= region.bottom;
    return { ...item, excluded: item.excluded || barrier && inside };
  }) };
}
