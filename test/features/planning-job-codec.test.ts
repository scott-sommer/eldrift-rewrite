import { expect, test } from 'vitest';
import { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { StoredPlanningJobRecord } from '../../src/features/planning/planning-job-codec';
import { retainedPlanningJob } from '../fixtures/planning-job';
const key = 'planning-jobs/W0N1', types = ['spawn', 'storage'];
function setup() {
  const root = {};
  const port = createMemoryPort(() => root);
  const store = createPlanningJobStore(port, 'W0N1', types);
  store.read();
  return { port, store };
}
test('both retained candidates survive v1/v2 migration and detached reads through the native memory port', () => {
  for (const version of [1, 2]) {
    const { port, store } = setup(), checkpoint = retainedPlanningJob();
    const before = { room: 'W0N1', revision: 7, checkpoint };
    port.write(key, { owner: 'planning-jobs', version, data: before });
    expect(store.readReceipt()).toBeUndefined();
    expect(store.read()).toEqual(before);
    const wire = port.read(key) as Envelope;
    expect(wire.version).toBe(3);
    const saved = wire.data as StoredPlanningJobRecord;
    expect(typeof saved.checkpoint?.best).toBe('string');
    expect(typeof saved.checkpoint?.previous).toBe('string');
    store.read().checkpoint!.best!.entries[0]!.x = 1;
    expect(store.read()).toEqual(before);
    expect(store.save(7, checkpoint)).toMatchObject({ ok: true, record: { revision: 8, checkpoint } });
  }
});
test('malformed JSON, invalid retained plans and unseen candidate identities cannot be read, overwritten or finished', () => {
  const { port, store } = setup();
  store.save(0, retainedPlanningJob());
  const original = port.read(key) as Envelope;
  for (const payload of ['{', '{}', JSON.stringify({ ...retainedPlanningJob().best!,
    provenance: { ...retainedPlanningJob().best!.provenance, candidateId: 'unknown' } })]) {
    const damaged = JSON.parse(JSON.stringify(original)) as Envelope;
    (damaged.data as StoredPlanningJobRecord).checkpoint!.best = payload;
    port.write(key, damaged);
    const baseline = JSON.stringify(port.read(key));
    expect(store.readReceipt()).toBeUndefined();
    expect(() => store.read()).toThrow();
    expect(() => store.save(1, retainedPlanningJob())).toThrow();
    expect(() => store.finish(1, { signature: 'job-v1', planRevision: 1, completedAt: 8, outcome: 'committed' })).toThrow();
    expect(JSON.stringify(port.read(key))).toBe(baseline);
  }
});
test('invalid legacy retained data never writes a partially migrated envelope', () => {
  const { port, store } = setup(), checkpoint = retainedPlanningJob();
  checkpoint.best!.entries[0]!.x = 99;
  port.write(key, { owner: 'planning-jobs', version: 2, data: { room: 'W0N1', revision: 7, checkpoint } });
  const before = JSON.stringify(port.read(key));
  expect(() => store.read()).toThrow('invalid state');
  expect(JSON.stringify(port.read(key))).toBe(before);
});
