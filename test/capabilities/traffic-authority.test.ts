import { expect, test } from 'vitest';
import { createTrafficAuthority } from '../../src/capabilities/movement/traffic/authority';
import type { TrafficRequest } from '../../src/capabilities/movement/traffic/model';
const request: TrafficRequest = { unit: 'a', owner: 'work', from: { room: 'W0N0', x: 20, y: 20 }, to: { room: 'W0N0', x: 21, y: 20 }, priority: 1, mobile: true };
test('queue snapshots requests, enforces one owner, flushes once and clears next tick', () => {
  let tick = 1;
  let calls = 0;
  const authority = createTrafficAuthority({ clock: () => tick,
    observe: () => [{ unit: 'a', position: request.from }], legal: () => true,
    issue: value => { calls++; expect(value.to.x).toBe(21); return { status: 'issued', code: 0 }; },
  });
  const submitted = { ...request, to: { ...request.to } };
  expect(authority.submit(submitted)).toBe('queued');
  submitted.to.x = 30;
  expect(authority.submit({ ...request, owner: 'other' })).toBe('duplicate');
  expect(authority.flush()?.outcomes).toEqual([{ unit: 'a', intent: { status: 'issued', code: 0 } }]);
  authority.flush();
  expect(calls).toBe(1);
  expect(authority.submit(request)).toBe('sealed');
  tick++;
  expect(authority.flush()?.resolution.accepted).toEqual([]);
  expect(calls).toBe(1);
});
test('re-entry and uncertain intent exceptions cannot reissue, and next tick recovers', () => {
  let tick = 1;
  let calls = 0;
  const authority = createTrafficAuthority({ clock: () => tick,
    observe: () => [{ unit: 'a', position: request.from }], legal: () => true,
    issue: () => { calls++; authority.flush(); throw new Error('uncertain'); },
  });
  authority.submit(request);
  expect(authority.flush()?.outcomes[0]).toMatchObject({ unit: 'a', error: new Error('uncertain') });
  authority.flush();
  expect(calls).toBe(1);
  tick++;
  authority.submit(request);
  authority.flush();
  expect(calls).toBe(2);
});
test('failed observation seals this tick and capacity never silently replaces an owner', () => {
  const authority = createTrafficAuthority({ clock: () => 1, observe: () => { throw new Error('observation'); }, legal: () => true, issue: () => ({ status: 'issued', code: 0 }) }, 1);
  expect(authority.submit(request)).toBe('queued');
  expect(authority.submit({ ...request, unit: 'b' })).toBe('capacity');
  expect(() => authority.flush()).toThrow('observation');
  expect(authority.flush()).toBeUndefined();
});
