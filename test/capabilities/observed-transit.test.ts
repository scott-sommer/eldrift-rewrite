import { expect,test } from 'vitest';
import { observeTransitCursor,requestTransitCursor } from '../../src/capabilities/movement/transit/observed';
import { createTransitPlan } from '../../src/capabilities/movement/transit/plan';
const point = (x: number) => ({ room: 'W0N1',x,y: 25 });
const plan = createTransitPlan({ unit: 'courier',owner: 'source',priority: 0,weight: 0,recovery: 2,origin: point(10),path: [point(11),point(12)] });
const opening = () => ({ index: 0,position: point(10),observedAt: 10,requestedAt: null });
test('queued movement earns no cursor progress until the actual next position is observed',() => {
  const current = opening(),requested = requestTransitCursor(plan,current,10);
  expect(requested.index).toBe(0); expect(current.requestedAt).toBeNull();
  const blocked = observeTransitCursor(plan,requested,11,point(10));
  expect(blocked.index).toBe(0); expect(blocked.requestedAt).toBeNull();
  const moved = observeTransitCursor(plan,requestTransitCursor(plan,blocked,11),12,point(11));
  expect(moved).toEqual({ index: 1,position: point(11),observedAt: 12,requestedAt: null });
  expect(observeTransitCursor(plan,JSON.parse(JSON.stringify(moved)),12,point(11))).toEqual(moved);
});
test('unrequested displacement, skipped steps, duplicate requests and forged cursors refuse',() => {
  expect(() => observeTransitCursor(plan,opening(),11,point(11))).toThrow('deviation');
  const requested = requestTransitCursor(plan,opening(),10);
  expect(() => observeTransitCursor(plan,requested,11,point(12))).toThrow('deviation');
  expect(() => requestTransitCursor(plan,requested,10)).toThrow('phase');
  expect(() => observeTransitCursor(plan,requested,10,point(11))).toThrow('same-frame');
  expect(() => requestTransitCursor(plan,{ ...opening(),position: point(11) },10)).toThrow('cursor position');
});
