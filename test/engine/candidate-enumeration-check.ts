import type { Envelope } from '../../src/persistence/versioned-state';
import { runEnumerationCycle } from '../../src/features/planning/enumeration-cycle';
import { createEnumerationStore } from '../../src/features/planning/enumeration-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
export function verifyCandidateEnumeration(): void {
  const memory = Memory as Memory & { enumerationRows?: unknown[]; enumerationVersions?: number[][] };
  const state = createMemoryPort(() => Memory), key = 'planning-candidates/W0N1';
  const before = (state.read(key) as Envelope | undefined)?.version ?? 0;
  const store = createEnumerationStore(state, 'W0N1');
  const result = runEnumerationCycle(store, {
    standard: { storage: { x: 25, y: 25 }, structures: [] },
    constrained: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 36 },
  }, 400);
  if (result.status === 'conflict') throw new Error('Enumeration conflict');
  if (result.done) {
    if (result.source.count !== 1176) throw new Error('Missing enumerated candidates');
    if (result.source.at(0).id !== 'standard:25:25:0'
      || result.source.at(888).id !== 'constrained:25:25:0') throw new Error('Changed candidate ordering');
  }
  if (Game.time === 1) state.write(key, { owner: 'planning-candidates', version: 1, data: store.read() });
  (memory.enumerationVersions ??= []).push([before, (state.read(key) as Envelope).version]);
  (memory.enumerationRows ??= []).push({ done: result.done, attempts: result.attempts,
    candidates: result.checkpoint.candidates.length, exposedSource: 'source' in result });
}
