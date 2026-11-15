import { assessRoom } from './assessment';
import type { AssessmentInput } from './assessment-model';
export const assessmentVersion = 1;
export function assessmentSnapshot(room: string, input: AssessmentInput, observedAt: number) {
  if (!room || !Number.isSafeInteger(observedAt) || observedAt < 0) throw new Error('Invalid assessment observation');
  const assessment = assessRoom(input);
  return { version: assessmentVersion, room, observedAt, fingerprint: fingerprint(room, input), assessment };
}
/** Lossless canonical signature: avoids collision-based cache reuse; never includes the observation tick. */
function fingerprint(room: string, input: AssessmentInput): string {
  const objects = input.objects.map(item => [item.id, item.kind, item.position.x, item.position.y]);
  const structures = input.infrastructure.map(item => [item.id, item.type, item.position.x, item.position.y, item.walkable, item.owned]);
  const constraints = input.constraints.map(item => [item.id, item.kind, item.position.x, item.position.y, item.type ?? null]);
  const cells = { plain: 'p', swamp: 's', wall: 'w' };
  return JSON.stringify([assessmentVersion, room, input.terrain.map(cell => cells[cell]).join(''),
    canonical(objects), canonical(structures), canonical(constraints),
    input.margin ?? 2, input.costs?.plain ?? 1, input.costs?.swamp ?? 5]);
}
function canonical(entries: unknown[][]): string[] {
  return entries.map(entry => JSON.stringify(entry)).sort();
}
export type AssessmentFreshness = 'current' | 'remembered' | 'stale' | 'unknown';
/** Visibility is separate from age: a recently seen but hidden room is never current. */
export function assessmentFreshness(observedAt: number | undefined, tick: number, visible: boolean, maximumAge: number): AssessmentFreshness {
  if (![tick, maximumAge].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid assessment clock');
  if (observedAt === undefined) return 'unknown';
  if (!Number.isSafeInteger(observedAt) || observedAt < 0 || observedAt > tick) throw new Error('Invalid observation time');
  if (visible && observedAt === tick) return 'current';
  return tick - observedAt <= maximumAge ? 'remembered' : 'stale';
}
