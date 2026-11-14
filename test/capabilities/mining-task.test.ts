import { expect, test } from 'vitest';
import { createMiningTaskBehavior, validMiningPayload } from '../../src/app/mining-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { cancelTask } from '../../src/app/cancel-task';
import { createStationStore } from '../../src/features/mining/station-store';
import { openState, saveState } from '../../src/persistence/versioned-state';
import type { Envelope } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import type { MiningStation } from '../../src/capabilities/mining/station';
const station: MiningStation = {
  id: 'source', target: 'source', kind: 'energy', resource: 'energy',
  position: { room: 'W0N0', x: 20, y: 20 }, access: [{ room: 'W0N0', x: 21, y: 20 }],
  throughput: 10, available: 3000, observedAt: 1, readyAt: 1, risk: 'safe',
};
test('mining tasks retain exclusive slots across resets, tolerate normal waits and release on cancellation', () => {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  let tick = 1;
  const acquired: Record<string, boolean> = {};
  const definitions = () => ({ mine: createMiningTaskBehavior<string>(port, {
    clock: () => tick, unit: unit => unit,
    run: (unit, _station, _tile, assigned) => {
      acquired[unit] = assigned;
      return { status: 'blocked', reason: assigned ? 'source-depleted' : 'station-unassigned', retryAt: tick + 1 };
    },
  }) });
  for (const unit of ['first', 'replacement']) {
    const schema = taskSchema(unit, definitions());
    const state = openState(port, 'tasks/' + unit, schema);
    state.queue.push({ id: 'mine-1', kind: 'mine', phase: 'work',
      payload: { room: 'W0N0', station: 'source', tile: station.access[0] }, wakeAt: 0, retries: 0, expiresAt: 100 });
    saveState(port, 'tasks/' + unit, schema, state);
  }
  for (tick = 1; tick <= 8; tick++) {
    createStationStore(port, 'W0N0').observe(tick, [{ ...station, observedAt: tick }]);
    const run = createTaskRunner(port, definitions(), () => tick);
    expect(run('first', 'first')?.status).toBe('running');
    expect(run('replacement', 'replacement')?.status).toBe('running');
    expect(acquired).toEqual({ first: true, replacement: false });
  }
  cancelTask(port, 'first', 'mine-1', definitions());
  createStationStore(port, 'W0N0').observe(tick, [{ ...station, observedAt: tick }]);
  createTaskRunner(port, definitions(), () => tick)('replacement', 'replacement');
  expect(acquired.replacement).toBe(true);
  tick++;
  createStationStore(port, 'W0N0').observe(tick, []);
  expect(createTaskRunner(port, definitions(), () => tick)('replacement', 'replacement'))
    .toEqual({ status: 'failed', reason: 'station-removed' });
  expect((records.get('reservations/empire')!.data as { claims: unknown[] }).claims).toEqual([]);
});
test('mining task payload rejects malformed and cross-room tiles', () => {
  expect(validMiningPayload({ room: 'W0N0', station: 'source', tile: station.access[0] })).toBe(true);
  expect(validMiningPayload({ room: 'E0N0', station: 'source', tile: station.access[0] })).toBe(false);
  expect(validMiningPayload({ room: 'W0N0', station: 'source', tile: null })).toBe(false);
});
