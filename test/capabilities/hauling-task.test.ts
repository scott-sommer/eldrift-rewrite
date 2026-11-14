import { expect, test } from 'vitest';
import { assignHaulingTask } from '../../src/app/assign-hauling-task';
import { createHaulingTaskBehavior } from '../../src/app/hauling-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import type { Envelope } from '../../src/persistence/versioned-state';
const request = { id: 'fill', owner: 'economy', source: 'source', sink: 'sink', resource: 'energy', quantity: 50, priority: 0, expiresAt: 100 };
test('hauling admission preserves work; persistent tasks tolerate long capacity waits and reject reused unit identities', () => {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, JSON.parse(JSON.stringify(value)) as Envelope); } };
  createLogisticsRequests(state, 'home').submit(request, 1);
  let tick = 1;
  const definitions = () => ({ haul: createHaulingTaskBehavior<{ id: string; name: string }>(state, {
    identity: unit => unit,
    view: () => ({ tick, cargo: 0, freeCargo: 50, sourceStock: 100, sinkFree: 0, sinkPool: 'sink-capacity' }),
    execution: () => ({ observe: () => ({ tick }), execute: () => { throw new Error('Cannot transfer to full sink'); } }),
  }) });
  const payload = { home: 'home', unitId: 'unit-id', request };
  expect(assignHaulingTask(state, definitions(), 'hauler', 'haul-1', payload, tick, 50)).toBe(true);
  expect(assignHaulingTask(state, definitions(), 'hauler', 'haul-2', payload, tick, 50)).toBe(false);
  for (tick = 1; tick <= 8; tick++) {
    expect(createTaskRunner(state, definitions(), () => tick)('hauler', { name: 'hauler', id: 'unit-id' })).toEqual({ status: 'running' });
  }
  expect(createTaskRunner(state, definitions(), () => tick)('hauler', { name: 'hauler', id: 'new-id' }))
    .toEqual({ status: 'failed', reason: 'hauling-unit-replaced' });
  createLogisticsRequests(state, 'home').cancel('economy', 'fill');
  expect(assignHaulingTask(state, definitions(), 'hauler', 'haul-3', payload, tick, 50)).toBe(false);
});
