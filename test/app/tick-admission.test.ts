import { expect, test } from 'vitest';
import { createTickAdmission } from '../../src/app/tick-admission';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import { openState } from '../../src/persistence/versioned-state';

test('migration blocks expiry; exact boundary expiry survives reset and preserves other state', () => {
  let memory: { eldrift?: unknown; legacy: { keep: number } } = { legacy: { keep: 1 } };
  const port = createMemoryPort(() => memory);
  const claims = createReservations(port);
  claims.acquire({ resource: 'old', holder: 'a', scope: 'mine', expiresAt: 2 }, 1);
  claims.acquire({ resource: 'live', holder: 'b', scope: 'haul', expiresAt: 4 }, 1);
  let tick = 2;
  let migrated = false;
  let admit = createTickAdmission(port, () => migrated, () => tick);
  expect(admit()).toBe(false);
  expect(openState(port, 'reservations/empire', reservationSchema).claims).toHaveLength(2);
  migrated = true;
  expect(admit()).toBe(false); // No second admission attempt within the tick.
  tick = 3;
  expect(admit()).toBe(true);
  expect(openState(port, 'reservations/empire', reservationSchema).claims.map(c => c.resource)).toEqual(['live']);
  memory = JSON.parse(JSON.stringify(memory));
  admit = createTickAdmission(port, () => true, () => tick);
  tick = 4;
  expect(admit()).toBe(true);
  expect(openState(port, 'reservations/empire', reservationSchema).claims).toEqual([]);
  expect(memory.legacy).toEqual({ keep: 1 });
});

test('corrupt claims block admission, preserve evidence, and can retry next tick', () => {
  const memory = { eldrift: { format: 1, records: {
    'reservations/empire': { owner: 'reservations', version: 99, data: { claims: [] } },
  } } };
  const before = JSON.stringify(memory);
  let tick = 1;
  const admit = createTickAdmission(createMemoryPort(() => memory), () => true, () => tick);
  expect(admit).toThrow('unsupported future version');
  expect(admit()).toBe(false);
  expect(JSON.stringify(memory)).toBe(before);
  tick++;
  expect(admit).toThrow('unsupported future version');
});

test('idle maintenance does not create a reservation record', () => {
  const memory = {};
  const port = createMemoryPort(() => memory);
  expect(createTickAdmission(port, () => true, () => 1)()).toBe(true);
  expect(port.read('reservations/empire')).toBeUndefined();
});
