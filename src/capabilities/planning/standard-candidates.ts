import { anchorForPlacement } from '../../core/geometry/transforms';
import type { TransformIndex } from '../../core/geometry/transforms';
import type { Tile } from '../../core/geometry/local-grid';
import { standardTemplate } from './standard-template';
import { placeTemplate } from './template';
export interface CoreCandidate { anchor: Tile; transform: TransformIndex }
export interface CandidateSeeds {
  previous?: CoreCandidate;
  storage?: Tile;
  structures: readonly { type: string; position: Tile }[];
}
const orientations: readonly TransformIndex[] = [0, 1, 2, 3, 4, 5, 6, 7];
const seedTypes = new Set(['storage', 'spawn', 'terminal', 'link', 'tower', 'lab', 'powerSpawn', 'nuker', 'observer']);
/** Ordered legacy seeds; every fitting candidate is retained for downstream comparison. */
export function standardCandidates(seeds: CandidateSeeds): CoreCandidate[] {
  const candidates: CoreCandidate[] = [];
  if (seeds.previous) candidates.push(seeds.previous);
  if (seeds.storage) candidates.push(...orientations.map(transform => ({ anchor: seeds.storage!, transform })));
  candidates.push(...structureCandidates(seeds));
  for (let x = 16; x <= 34; x += 2) {
    for (let y = 12; y <= 32; y += 2) {
      candidates.push(...orientations.map(transform => ({ anchor: { x, y }, transform })));
    }
  }
  return uniqueFitting(candidates);
}
function structureCandidates(seeds: CandidateSeeds): CoreCandidate[] {
  const result: CoreCandidate[] = [];
  for (const structure of seeds.structures.filter(item => seedTypes.has(item.type))) {
    for (const point of standardTemplate.filter(entry => entry.type === structure.type)) {
      for (const transform of orientations) {
        const anchor = anchorForPlacement(structure.position, point.offset, transform);
        if (anchor) result.push({ anchor, transform });
      }
    }
  }
  return result;
}
function uniqueFitting(candidates: readonly CoreCandidate[]): CoreCandidate[] {
  const seen = new Set<string>();
  const result: CoreCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.anchor.x + ':' + candidate.anchor.y + ':' + candidate.transform;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!placeTemplate(standardTemplate, candidate.anchor, candidate.transform)) continue;
    result.push({ anchor: { ...candidate.anchor }, transform: candidate.transform });
  }
  return result;
}
