import { enumeratePlanningCandidates } from '../../src/features/planning/candidate-enumeration';
import type { EnumerationCheckpoint } from '../../src/features/planning/candidate-enumeration';
export function verifyCandidateEnumeration(): void {
  const memory = Memory as Memory & { enumeration?: EnumerationCheckpoint; enumerationRows?: unknown[] };
  const result = enumeratePlanningCandidates({
    standard: { storage: { x: 25, y: 25 }, structures: [] },
    constrained: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 36 },
  }, memory.enumeration, 400);
  memory.enumeration = result.checkpoint;
  if (result.done) {
    if (result.source.count !== 1176) throw new Error('Missing enumerated candidates');
    if (result.source.at(0).id !== 'standard:25:25:0'
      || result.source.at(888).id !== 'constrained:25:25:0') throw new Error('Changed candidate ordering');
  }
  (memory.enumerationRows ??= []).push({ done: result.done, attempts: result.attempts,
    candidates: result.checkpoint.candidates.length, exposedSource: 'source' in result });
}
