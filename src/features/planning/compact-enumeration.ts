import type { EnumerationCheckpoint } from './candidate-enumeration';
import type { PlanningCandidate } from './planning-job-model';
import { validEnumeration, validCursor } from './enumeration-state';
export interface CompactEnumeration extends Omit<EnumerationCheckpoint, 'candidates'> { candidates: string[] }
/** IDs already encode every candidate field; storing repeated objects adds no information. */
export function compactEnumeration(checkpoint: EnumerationCheckpoint): CompactEnumeration {
  if (!validEnumeration(checkpoint)) throw new Error('invalid state data: enumeration');
  return { ...checkpoint, candidates: checkpoint.candidates.map(candidate => candidate.id) };
}
export function expandEnumeration(checkpoint: CompactEnumeration): EnumerationCheckpoint {
  return { ...checkpoint, candidates: checkpoint.candidates.map(candidateFromId) };
}
export function candidateFromId(id: string): PlanningCandidate {
  if (typeof id !== 'string') throw new Error('Invalid candidate ID');
  const parts = id.split(':');
  if (parts.length !== 4) throw new Error('Invalid candidate ID');
  return { id, strategy: parts[0]!, anchor: { x: Number(parts[1]), y: Number(parts[2]) },
    transform: Number(parts[3]) as PlanningCandidate['transform'] };
}
export function validCompactEnumeration(value: unknown): value is CompactEnumeration {
  if (!value || typeof value !== 'object') return false;
  const state = value as CompactEnumeration;
  if (state.version !== 1 || typeof state.signature !== 'string' || !state.signature) return false;
  if (!Array.isArray(state.candidates) || state.candidates.length > 10000) return false;
  if (![state.standard, state.constrained].every(validCursor)) return false;
  if (new Set(state.candidates).size !== state.candidates.length) return false;
  const seen = { standard: new Set(state.standard?.seen), constrained: new Set(state.constrained?.seen) };
  return state.candidates.every(id => validId(id, seen));
}
function validId(id: unknown, seen: { standard: Set<string>; constrained: Set<string> }): boolean {
  if (typeof id !== 'string' || !/^(standard|constrained):([0-9]|[1-4][0-9]):([0-9]|[1-4][0-9]):[0-7]$/.test(id)) return false;
  const split = id.indexOf(':');
  return seen[id.slice(0, split) as keyof typeof seen].has(id.slice(split + 1));
}
