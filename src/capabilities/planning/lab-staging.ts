import { reactionGeometry } from './lab-geometry';
import { stagePositions } from './staging';
import { tileIndex } from '../../core/geometry/local-grid';
import type { Tile } from '../../core/geometry/local-grid';
import type { StagedPosition } from './staging';
/** Keep one reagent pair through every expansion instead of staging an unusable intermediate cluster. */
export function stageReactionLabs(
  positions: readonly Tile[], storage: Tile, limits: readonly number[], minimumLevel = 6,
): StagedPosition[] {
  const slots = stagePositions(positions, storage, limits, minimumLevel);
  const geometry = reactionGeometry(positions);
  if (!geometry) throw new Error('No complete reaction lab geometry');
  const inputs = new Set(geometry.inputs.map(tileIndex));
  const outputs = slots.filter(slot => !inputs.has(tileIndex(slot.position))).map(slot => slot.position);
  const ordered = [...geometry.inputs, ...outputs];
  return ordered.map((position, index) => ({ position: { ...position }, rcl: slots[index]!.rcl }));
}
