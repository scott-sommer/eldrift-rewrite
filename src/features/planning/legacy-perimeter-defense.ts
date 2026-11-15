import { perimeterDefense } from '../../capabilities/planning/perimeter-defense';
import { standardTemplate } from '../../capabilities/planning/standard-template';
import { placeTemplate } from '../../capabilities/planning/template';
import type { StagedTile } from '../../capabilities/planning/template';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
import type { PlanningCandidate } from './planning-job-model';
import { copyPlain } from '../../persistence/plain-data';
/** Port of the implemented legacy fallback; no new exit/cut strategy is implied. */
export function applyLegacyPerimeterDefense(candidate: PlanningCandidate, entries: readonly StagedTile[], observation: AssessmentInput) {
  const footprint = candidate.strategy === 'standard'
    ? placeTemplate(standardTemplate, candidate.anchor, candidate.transform)
    : entries.filter(entry => !['road', 'rampart'].includes(entry.type)
      && !['source', 'controller', 'mineral'].includes(entry.tag ?? ''));
  if (!['standard', 'constrained'].includes(candidate.strategy) || !footprint?.length) throw new Error('Missing legacy defense footprint');
  const bounds = { minX: Math.min(...footprint.map(entry => entry.position.x)), maxX: Math.max(...footprint.map(entry => entry.position.x)),
    minY: Math.min(...footprint.map(entry => entry.position.y)), maxY: Math.max(...footprint.map(entry => entry.position.y)) };
  const controller = observation.objects.find(object => object.kind === 'controller')?.position;
  const barriers = perimeterDefense({ bounds, terrain: observation.terrain, ...(controller ? { controller } : {}) });
  const existing = new Set(entries.filter(entry => entry.type === 'rampart').map(entry => key(entry)));
  return copyPlain([...entries, ...barriers.filter(entry => !existing.has(key(entry)))]);
}
function key(entry: StagedTile): string { return entry.position.x + ':' + entry.position.y; }
