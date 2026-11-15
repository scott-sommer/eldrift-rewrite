import type { EnumerationCheckpoint } from './candidate-enumeration';
import type { CandidateCheckpoint } from '../../capabilities/planning/candidate-batch';
import type { PlanningCandidate } from './planning-job-model';
import { integer } from './plan-model';
/** Structural validation only; strategy-specific cursor bounds are checked on resume. */
export function validEnumeration(value: unknown): value is EnumerationCheckpoint {
  if (!value || typeof value !== 'object') return false;
  const state = value as EnumerationCheckpoint;
  if (state.version !== 1 || !text(state.signature) || !Array.isArray(state.candidates)) return false;
  if (state.candidates.length > 10000 || !state.candidates.every(validCandidate)) return false;
  if (new Set(state.candidates.map(candidate => candidate.id)).size !== state.candidates.length) return false;
  if (![state.standard, state.constrained, state.stamps].every(validCursor)) return false;
  const seen = { standard: new Set(state.standard?.seen), constrained: new Set(state.constrained?.seen), stamps: new Set(state.stamps?.seen) };
  return state.candidates.every(candidate => seen[candidate.strategy as keyof typeof seen]
    .has(candidate.id.slice(candidate.strategy.length + 1)));
}
function validCandidate(value: unknown): value is PlanningCandidate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as PlanningCandidate;
  if (!['standard', 'constrained', 'stamps'].includes(candidate.strategy) || !candidate.anchor) return false;
  if (!integer(candidate.anchor.x, 0, 49) || !integer(candidate.anchor.y, 0, 49)
    || !integer(candidate.transform, 0, 7)) return false;
  if (candidate.strategy === 'stamps' && candidate.transform !== 0) return false;
  return candidate.id === candidate.strategy + ':' + candidate.anchor.x + ':' + candidate.anchor.y + ':' + candidate.transform;
}
export function validCursor(value: unknown): value is CandidateCheckpoint | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const cursor = value as CandidateCheckpoint;
  if (cursor.version !== 1 || !text(cursor.signature) || !integer(cursor.next, 0, Number.MAX_SAFE_INTEGER)) return false;
  return Array.isArray(cursor.seen) && cursor.seen.length <= cursor.next
    && cursor.seen.every(text) && new Set(cursor.seen).size === cursor.seen.length;
}
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
