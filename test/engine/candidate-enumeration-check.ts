import { enumeratePlanningCandidates } from '../../src/features/planning/candidate-enumeration';
import { createEnumerationStore } from '../../src/features/planning/enumeration-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
export function verifyCandidateEnumeration(): void {
  const memory = Memory as Memory & { enumerationRows?: unknown[] };
  const store = createEnumerationStore(createMemoryPort(() => Memory), 'W0N1');
  const saved = store.read();
  const result = enumeratePlanningCandidates({
    standard: { storage: { x: 25, y: 25 }, structures: [] },
    constrained: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 36 },
  }, saved.checkpoint, 400);
  if (!store.save(saved.revision, result.checkpoint).ok) throw new Error('Enumeration save conflict');
  if (result.done) {
    if (result.source.count !== 1176) throw new Error('Missing enumerated candidates');
    if (result.source.at(0).id !== 'standard:25:25:0'
      || result.source.at(888).id !== 'constrained:25:25:0') throw new Error('Changed candidate ordering');
  }
  (memory.enumerationRows ??= []).push({ done: result.done, attempts: result.attempts,
    candidates: result.checkpoint.candidates.length, exposedSource: 'source' in result });
}
