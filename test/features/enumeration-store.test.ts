import { expect, test } from 'vitest';
import { createEnumerationStore } from '../../src/features/planning/enumeration-store';
import { enumeratePlanningCandidates } from '../../src/features/planning/candidate-enumeration';
import type { Envelope } from '../../src/persistence/versioned-state';
const options = { standard: { storage: { x: 25, y: 25 }, structures: [] },
  constrained: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 36 } };
function setup() {
  const records: Record<string, unknown> = { 'planning/W0N1': { marker: 'last-valid-plan' } };
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  return { records, port, store: createEnumerationStore(port, 'W0N1') };
}
test('recreated stores resume all candidates in order and leave the committed plan untouched', () => {
  const { records, port, store } = setup(), plan = JSON.stringify(records['planning/W0N1']);
  let result = enumeratePlanningCandidates(options, undefined, 400);
  store.save(0, result.checkpoint);
  while (!result.done) {
    const recreated = createEnumerationStore(port, 'W0N1'), saved = recreated.read();
    result = enumeratePlanningCandidates(options, saved.checkpoint, 400);
    expect(recreated.save(saved.revision, result.checkpoint).ok).toBe(true);
  }
  expect(result.checkpoint).toEqual(enumeratePlanningCandidates(options, undefined, 2000).checkpoint);
  expect(result.source.count).toBe(1176);
  const restored = store.read(); restored.checkpoint!.candidates[0]!.anchor.x = 0;
  expect(store.read().checkpoint!.candidates[0]!.anchor.x).toBe(25);
  expect(JSON.stringify(records['planning/W0N1'])).toBe(plan);
});
test('stale writes and identity changes require explicit revision-guarded restart', () => {
  const { store } = setup(), first = enumeratePlanningCandidates(options, undefined, 1).checkpoint;
  store.save(0, first);
  first.candidates[0]!.anchor.x = 0;
  expect(store.read().checkpoint!.candidates[0]!.anchor.x).toBe(25);
  const changed = enumeratePlanningCandidates({}, undefined, 0).checkpoint;
  expect(store.save(0, changed)).toEqual({ ok: false, reason: 'revision' });
  expect(store.save(1, changed)).toEqual({ ok: false, reason: 'identity' });
  expect(store.clear(0)).toEqual({ ok: false, reason: 'revision' });
  expect(store.clear(1).ok).toBe(true);
  expect(store.save(2, changed).ok).toBe(true);
});
test('invalid geometry, transform, history and cursor cannot replace valid progress', () => {
  const { records, store } = setup(), checkpoint = enumeratePlanningCandidates(options, undefined, 2).checkpoint;
  store.save(0, checkpoint);
  const before = JSON.stringify(records);
  const bad = [
    { ...checkpoint, candidates: [{ ...checkpoint.candidates[0]!, anchor: { x: 50, y: 25 }, id: 'standard:50:25:0' }] },
    { ...checkpoint, candidates: [{ ...checkpoint.candidates[0]!, transform: 9, id: 'standard:25:25:9' }] },
    { ...checkpoint, standard: { ...checkpoint.standard!, seen: [] } },
    { ...checkpoint, standard: { ...checkpoint.standard!, next: 0 } },
    { ...checkpoint, candidates: [checkpoint.candidates[0]!, checkpoint.candidates[0]!] },
  ];
  for (const value of bad) {
    expect(() => store.save(1, value as typeof checkpoint)).toThrow('invalid state');
    expect(JSON.stringify(records)).toBe(before);
  }
});
test('future, foreign and corrupt envelopes survive failed reads without replacement', () => {
  const { records, store } = setup();
  for (const value of [{ owner: 'foreign', version: 1, data: {} },
    { owner: 'planning-candidates', version: 2, data: {} },
    { owner: 'planning-candidates', version: 1, data: { room: 'W0N1', revision: -1 } }]) {
    records['planning-candidates/W0N1'] = value;
    const before = JSON.stringify(records);
    expect(() => store.read()).toThrow();
    expect(JSON.stringify(records)).toBe(before);
  }
});
