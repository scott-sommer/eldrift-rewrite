import { createStampCatalog } from './stamp-catalog';
import { stampAnchors } from './stamp-anchors';
import type { StampCompositionInput } from './stamp-composition';
import type { AssessmentInput } from './assessment-model';
import type { StructureLimits } from './core-model';
import type { Tile } from '../../core/geometry/local-grid';
import type { StagedTile } from './template';
/** Fix the hub origin to candidate storage; let each other stamp reuse or search its own anchors. */
export function prepareStampComposition(
  storage: Tile, observation: AssessmentInput, limits: StructureLimits, anchorLimit: number,
  entries: readonly StagedTile[] = [],
): Pick<StampCompositionInput, 'stamps' | 'anchors' | 'anchorsByStamp' | 'entries' | 'corridors'> {
  const stamps = createStampCatalog(limits);
  const anchorsByStamp = stamps.map(stamp => stamp.id === 'hub-v1' ? [{ ...storage }]
    : stampAnchors(stamp, storage, observation, anchorLimit));
  return { stamps, anchors: [], anchorsByStamp,
    entries: entries.map(entry => ({ ...entry, position: { ...entry.position } })), corridors: [] };
}
