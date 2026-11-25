import { expect, test } from 'vitest';
import { materializeQuotedBirth } from '../../src/features/population/quoted-birth';
import { peekSpawnIdentity, reserveExpectedSpawnIdentity, reserveSpawnIdentity } from '../../src/features/population/spawn-identity';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
function fixture() {
  const request: SpawnRequest = { id: 'ed-W0N1-1',name: 'ed-W0N1-1',owner: 'work:W0N1:builder',room: 'W0N1',body: ['work','carry','move'],priority: 5,readyAt: 0,expiresAt: 101,placement: { spawn: 'spawn',exit: { room: 'W0N1',x: 14,y: 15 } } };
  return { request,birth: { request: request.id,spawn: 'spawn',startAt: 6,activeAt: 15,cost: 200 } };
}
test('identity preview is read-only and checked reservation refuses an intervening producer without another write',() => {
  const root = {},state = createMemoryPort(() => root), expected = peekSpawnIdentity(state,'W0N1'); expect(root).toEqual({});
  expect(reserveSpawnIdentity(state,'W0N1')).toBe(expected); const before = JSON.stringify(root);
  expect(reserveExpectedSpawnIdentity(state,'W0N1',expected)).toBeUndefined(); expect(JSON.stringify(root)).toBe(before);
  const next = peekSpawnIdentity(state,'W0N1'); expect(reserveExpectedSpawnIdentity(state,'W0N1',next)).toBe(next);
  const reset = createMemoryPort(() => JSON.parse(JSON.stringify(root))); expect(peekSpawnIdentity(reset,'W0N1')).toBe('ed-W0N1-3');
});
test('relative birth clocks become an exact one-tick native queue window without changing identity or caller input',() => {
  const f = fixture(), before = JSON.stringify(f), ready = materializeQuotedBirth(f.request,f.birth,5000,5006);
  expect(ready).toMatchObject({ status: 'ready',activeAt: 5015,request: { id: f.request.id,name: f.request.name,readyAt: 5006,expiresAt: 5007 } });
  if (ready.status !== 'ready') throw new Error('Expected materialized birth'); ready.request.placement!.exit.x = 1; expect(JSON.stringify(f)).toBe(before);
  expect(materializeQuotedBirth(f.request,f.birth,5000,5005)).toMatchObject({ reason: 'not-due' });
  expect(materializeQuotedBirth(f.request,f.birth,5000,5007)).toMatchObject({ reason: 'missed-frame' });
});
test('birth identity, payment, activation, placement and overflow must match the quote',() => {
  const f = fixture();
  for (const patch of [{ request: 'other' },{ spawn: 'other' },{ cost: 199 },{ activeAt: 14 },{ startAt: 101,activeAt: 110 }]) expect(() => materializeQuotedBirth(f.request,{ ...f.birth,...patch },5000,5006)).toThrow();
  expect(() => materializeQuotedBirth(f.request,f.birth,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)).toThrow('overflow');
});
