import type { Tile } from '../../core/geometry/local-grid';
import type { TransformIndex } from '../../core/geometry/transforms';
import { constrainedFootprint } from './constrained-footprint';
import { stageReactionLabs } from './lab-staging';
import { stagePositions } from './staging';
import type { CorePlacement, StructureLimits } from './core-model';
const settings = [
  { type: 'storage', rcl: 4, priority: -500, tag: 'core' },
  { type: 'terminal', rcl: 6, priority: -320, tag: 'terminal' },
  { type: 'link', rcl: 5, priority: -365, tag: 'storage' },
  { type: 'lab', rcl: 6, priority: -300, tag: 'core' },
  { type: 'road', rcl: 4, priority: -220, tag: 'core' },
] as const;
/** Compact hub only: service structures, utilities and logistics attach separately. */
export function stageConstrainedCore(
  anchor: Tile, transform: TransformIndex, limits: StructureLimits,
): CorePlacement[] | undefined {
  const placed = constrainedFootprint(anchor, transform);
  if (!placed) return undefined;
  return settings.flatMap(setting => {
    const capacity = limits[setting.type];
    if (!capacity) throw new Error('Missing structure limits: ' + setting.type);
    const positions = placed.filter(entry => entry.type === setting.type).map(entry => entry.position);
    const stage = setting.type === 'lab' ? stageReactionLabs : stagePositions;
    return stage(positions, anchor, capacity, setting.rcl).map(entry => ({
      type: setting.type, position: entry.position, rcl: entry.rcl, priority: setting.priority, tag: setting.tag,
    }));
  });
}
