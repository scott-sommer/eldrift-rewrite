import { anchorForPlacement } from '../../core/geometry/transforms';
import type { TransformIndex } from '../../core/geometry/transforms';
import type { CandidateSeeds, CoreCandidate } from './standard-candidates';
import { standardTemplate } from './standard-template';
const seedTypes = new Set(['storage', 'spawn', 'terminal', 'link', 'tower', 'lab', 'powerSpawn', 'nuker', 'observer']);
/** Random-access raw sequence: no array of all grid candidates or template placement work. */
export function standardCandidateSource(seeds: CandidateSeeds) {
  const alignments = seeds.structures.filter(entry => seedTypes.has(entry.type)).flatMap(structure =>
    standardTemplate.filter(point => point.type === structure.type).map(point => ({
      position: { ...structure.position }, offset: { ...point.offset },
    })));
  const previous = seeds.previous && { anchor: { ...seeds.previous.anchor }, transform: seeds.previous.transform };
  const storage = seeds.storage && { ...seeds.storage };
  const prefix = Number(!!previous) + (storage ? 8 : 0);
  const count = prefix + alignments.length * 8 + 880;
  function at(index: number): CoreCandidate | undefined {
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw new Error('Invalid candidate ordinal');
    if (previous) {
      if (index === 0) return { anchor: { ...previous.anchor }, transform: previous.transform };
      index--;
    }
    if (storage) {
      if (index < 8) return { anchor: { ...storage }, transform: index as TransformIndex };
      index -= 8;
    }
    const transform = (index % 8) as TransformIndex;
    if (index < alignments.length * 8) {
      const alignment = alignments[Math.floor(index / 8)]!;
      const anchor = anchorForPlacement(alignment.position, alignment.offset, transform);
      return anchor && { anchor, transform };
    }
    const grid = Math.floor((index - alignments.length * 8) / 8);
    return { anchor: { x: 16 + Math.floor(grid / 11) * 2, y: 12 + grid % 11 * 2 }, transform };
  }
  return { count, at };
}
