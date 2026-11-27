import { openState,saveState } from '../../../src/persistence/versioned-state';
import type { StateSchema } from '../../../src/persistence/versioned-state';
import { expect,test } from 'vitest';
import { paidHaulingPhysicalFixture } from '../../fixtures/paid-hauling-physical';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import type { HomeHaulingCheckpoint } from '../../../src/app/remotes/startup/hauling-state/world/checkpoint';
function frame(tick: number) {
  return { tick,operations: [{ kind: 'settle' as const },{ kind: 'paid' as const,name: 'paid-courier',work: true }],
    outside: { plans: [],states: [],requestedUnits: [],occupants: [] },settlementOrder: (intents: readonly { id: string }[]) => intents.map(intent => intent.id) };
}
function roundtrip(value: HomeHaulingCheckpoint): HomeHaulingCheckpoint { return JSON.parse(JSON.stringify(value)); }

test.each([100,101,105,106,109,110,112,113])('resume at%s preserves future frames and the complete private checkpoint exactly', boundary => {
  const f = paidHaulingPhysicalFixture(); for (let tick = 100; tick < boundary; tick++) f.step();
  const restored = resumeHomeHaulingWorld(roundtrip(f.world.checkpoint()),paidHaulingPhysicalFixture().configure);
  for (let tick = boundary; tick <= 114; tick++) expect(restored.step(frame(tick))).toEqual(f.step());
  expect(restored.checkpoint()).toEqual(f.world.checkpoint());
  expect(restored.snapshot()).toEqual(f.world.snapshot());
});

test('pending delivery survives resume and is credited once on the next frame', () => {
  const f = paidHaulingPhysicalFixture(); for (let tick = 100; tick <= 104; tick++) f.step();
  const checkpoint = roundtrip(f.world.checkpoint());
  expect(checkpoint.inventory.effects).toMatchObject([{ kind: 'transfer',amount: 32,issuedAt: 104,settledAt: 105 }]);
  const restored = resumeHomeHaulingWorld(checkpoint,f.configure);
  checkpoint.inventory.effects[0]!.amount = 1;
  expect(restored.step(frame(105)).deliveries).toMatchObject([{ energy: 32,tick: 105 }]);
  const after = resumeHomeHaulingWorld(roundtrip(restored.checkpoint()),f.configure);
  expect(after.step(frame(106)).deliveries).toEqual([]);
});

test('resume rejects incompatible clocks, missing task state and malformed transfer effects', () => {
  const f = paidHaulingPhysicalFixture(); for (let tick = 100; tick <= 104; tick++) f.step();
  const fresh = () => roundtrip(f.world.checkpoint());
  const clock = fresh(); clock.inventory.nextTick++; expect(() => resumeHomeHaulingWorld(clock,f.configure)).toThrow('version/clock');
  const task = fresh(); task.state = task.state.filter(record => record.key !== 'tasks/paid-courier');
  expect(() => resumeHomeHaulingWorld(task,f.configure)).toThrow('Missing private hauling tasks');
  const journal = fresh(); journal.state = journal.state.filter(record => record.key !== 'logistics-attempts/native-id');
  expect(() => resumeHomeHaulingWorld(journal,f.configure)).toThrow('pending journal');
  const missing = fresh(); missing.inventory.effects = []; expect(() => resumeHomeHaulingWorld(missing,f.configure)).toThrow('pending effect');
  const body = fresh(); body.bodies[0]!.position.x++; expect(() => resumeHomeHaulingWorld(body,f.configure)).toThrow('body/movement mismatch');
  const effect = fresh(); effect.inventory.effects[0]!.settledAt++;
  expect(() => resumeHomeHaulingWorld(effect,f.configure)).toThrow('effect clock');
});


test('outside controller state survives in the shared private state instead of being reset on resume', () => {
  const schema: StateSchema<{ visits: number }> = { owner: 'resident',version: 1,initial: () => ({ visits: 0 }),migrations: {},
    valid: (value): value is { visits: number } => !!value && typeof value === 'object' && Number.isSafeInteger((value as { visits: number }).visits) };
  const f = paidHaulingPhysicalFixture();
  f.step([{ kind: 'external',id: 'resident',run: shared => {
    const data = openState(shared.state,'resident-control',schema); data.visits++; saveState(shared.state,'resident-control',schema,data);
  } },{ kind: 'settle' },{ kind: 'paid',name: 'paid-courier',work: true }]);
  const restored = resumeHomeHaulingWorld(roundtrip(f.world.checkpoint()),f.configure);
  const next = frame(101);
  restored.step({ ...next,operations: [{ kind: 'external',id: 'resident',run: shared => {
    const data = openState(shared.state,'resident-control',schema); expect(data.visits).toBe(1); data.visits++; saveState(shared.state,'resident-control',schema,data);
  } },...next.operations] });
  expect(restored.checkpoint().state.find(record => record.key === 'resident-control')?.value.data).toEqual({ visits: 2 });
});


test('a checkpoint is only available at a closed successful frame boundary', () => {
  const f = paidHaulingPhysicalFixture();
  f.step([{ kind: 'settle' },{ kind: 'external',id: 'check-boundary',run: () => {
    expect(() => f.world.checkpoint()).toThrow('open energy inventory frame');
  } }]);
  expect(f.world.checkpoint().inventory.nextTick).toBe(101);
  f.reassign(); expect(() => f.step()).toThrow('authority invalidated');
  expect(() => f.world.checkpoint()).toThrow('Cannot resume failed home world');
});
