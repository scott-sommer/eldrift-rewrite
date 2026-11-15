import { placeOffset } from '../../src/core/geometry/transforms';
import type { StampTile } from '../../src/capabilities/planning/stamp-placement';
import type { LayoutStrategy } from '../../src/features/planning/layout-strategies';

/** Educational authored-blueprint adapter; not registered as a production room planner. */
export function blueprintStrategy(tiles: readonly StampTile[], version: string): LayoutStrategy {
  if (!version || tiles.length > 100) throw new Error('Invalid blueprint definition');
  const blueprint = tiles.map(tile => ({ ...tile, offset: { ...tile.offset } }));
  return { version, advance(candidate, revision, saved, _searches, guard) {
    const checkpoint = saved as { version: number; revision: string } | undefined;
    if (checkpoint && (checkpoint.version !== 1 || checkpoint.revision !== revision)) {
      throw new Error('Stale blueprint checkpoint');
    }
    if (!guard()) return { status: 'pending', checkpoint: { version: 1, revision } };
    const entries = [];
    for (const tile of blueprint) {
      const position = placeOffset(candidate.anchor, tile.offset, candidate.transform, 2);
      if (!position) return { status: 'rejected', reason: 'blueprint-out-of-bounds' };
      entries.push({ type: tile.type, position, rcl: tile.rcl, ...(tile.priority === undefined ? {} : { priority: tile.priority }), ...(tile.tag === undefined ? {} : { tag: tile.tag }) });
    }
    return { status: 'complete', entries };
  } };
}
