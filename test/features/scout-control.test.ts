import { expect, test, vi } from 'vitest';
import { advanceScout } from '../../src/features/intel/scout-control';
import { createScoutControlStore, initialScoutControl } from '../../src/features/intel/scout-control-store';
import { createScoutRetirement } from '../../src/features/intel/scout-retirement';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { ScoutControlContext } from '../../src/features/intel/scout-control-model';
function context(tick: number, patch: Partial<ScoutControlContext> = {}): ScoutControlContext {
  return { tick, position: { room: 'W0N1', x: 20, y: 20 }, canMove: true, dangerous: false,
    policy: { assigned: ['E0N1'], stabilizeTicks: 1, hostileAvoidTicks: 1500, routeAvoidTicks: 1000, stuckTicks: 3, oscillationLimit: 2 },
    ports: { next: vi.fn(() => undefined), stabilize: vi.fn(() => ({ status: 'running' as const })),
      travel: vi.fn(() => ({ status: 'running' as const })), escape: vi.fn(() => 'W0N1'), capture: vi.fn(), failure: vi.fn() }, ...patch };
}

test('assigned scout stabilizes entry before physical visit, survives reset and does not repeat a tick', () => {
  let control = initialScoutControl('scout','W0N1','W0N1',1);
  let ctx = context(1);
  control = advanceScout(control,ctx).control;
  expect(ctx.ports.capture).not.toHaveBeenCalled();
  ctx = context(2); control = advanceScout(control,ctx).control;
  expect(ctx.ports.capture).toHaveBeenCalledWith(true);
  expect(ctx.ports.travel).toHaveBeenCalledWith('E0N1',{});
  ctx = context(3,{ position: { room: 'E0N1', x: 0, y: 25 } });
  control = advanceScout(control,ctx).control;
  expect(ctx.ports.stabilize).toHaveBeenCalledOnce(); expect(ctx.ports.capture).not.toHaveBeenCalled();
  control = JSON.parse(JSON.stringify(control));
  ctx = context(4,{ position: { room: 'E0N1', x: 2, y: 25 } });
  control = advanceScout(control,ctx).control;
  expect(control.assignmentIndex).toBe(1); expect(control.objective).toBeNull();
  expect(ctx.ports.capture).toHaveBeenCalledExactlyOnceWith(true);
  advanceScout(control,ctx);
  expect(ctx.ports.capture).toHaveBeenCalledTimes(1);
});

test('danger interrupts sleep, records observation without a physical visit and escapes via shared travel port', () => {
  let control = initialScoutControl('scout','W0N1','E0N1',10);
  control.wakeAt = 50;
  const ctx = context(10,{ dangerous: true, position: { room: 'E0N1', x: 0, y: 25 } });
  control = advanceScout(control,ctx).control;
  expect(ctx.ports.capture).toHaveBeenCalledExactlyOnceWith(false);
  expect(ctx.ports.travel).toHaveBeenCalledWith('W0N1',{ E0N1: 1510 });
  expect(control.phase).toBe('evade'); expect(control.visited).toBe(false);
});

test('lack of observed progress replans without issuing another movement on the recovery tick', () => {
  let control = initialScoutControl('scout','W0N1','W0N1',1);
  for (let tick = 1; tick <= 4; tick++) control = advanceScout(control,context(tick)).control;
  const ctx = context(5);
  control = advanceScout(control,ctx).control;
  expect(ctx.ports.travel).not.toHaveBeenCalled();
  expect(ctx.ports.failure).toHaveBeenCalledWith('E0N1','stuck');
  expect(control).toMatchObject({ phase: 'choose', objective: null, assignmentIndex: 1, avoidUntil: { E0N1: 1005 } });
});

test('fatigue preserves the objective rather than exhausting generic retry limits', () => {
  let control = initialScoutControl('scout','W0N1','W0N1',1);
  control = advanceScout(control,context(1)).control;
  for (let tick = 2; tick < 15; tick++) {
    const ctx = context(tick,{ canMove: false });
    ctx.ports.travel = vi.fn(() => ({ status: 'blocked' as const, retryAt: tick+1, reason: 'fatigue' }));
    control = advanceScout(control,ctx).control;
    expect(control.objective).toBe('E0N1'); expect(ctx.ports.failure).not.toHaveBeenCalled();
  }
});

test('retirement clears control state without creating unknown identity records', () => {
  let memory = {};
  const state = createMemoryPort(() => memory), controls = createScoutControlStore(state);
  createScoutRetirement(state,() => 1)('absent'); expect(memory).toEqual({});
  controls.save(initialScoutControl('scout','W0N1','W0N1',1));
  memory = JSON.parse(JSON.stringify(memory));
  expect(controls.read().units).toHaveLength(1);
  createScoutRetirement(state,() => 2)('scout');
  expect(controls.read().units).toEqual([]);
});

test('typed fallback runs only without objectives and yields to newly available work or danger', () => {
  let control = initialScoutControl('scout','W0N1','W0N1',1);
  const ctx = context(1); ctx.policy.assigned = [];
  ctx.ports.fallback = vi.fn(() => ({ status: 'running' as const }));
  control = advanceScout(control,ctx).control;
  ctx.tick = 2; control = advanceScout(control,ctx).control;
  expect(ctx.ports.fallback).toHaveBeenCalledOnce(); expect(control).toMatchObject({ phase: 'choose', objective: null, moving: true });
  advanceScout(control,ctx); expect(ctx.ports.fallback).toHaveBeenCalledOnce();
  ctx.tick = 3; ctx.position.x++;
  ctx.ports.next = vi.fn(() => 'E0N1'); control = advanceScout(control,ctx).control;
  expect(control.objective).toBe('E0N1'); expect(ctx.ports.fallback).toHaveBeenCalledOnce();
  ctx.tick = 4; ctx.dangerous = true; control = advanceScout(control,ctx).control;
  expect(control.phase).toBe('evade'); expect(ctx.ports.fallback).toHaveBeenCalledOnce();
});
test('arrival at a fallback goal holds without false stuck tracking or exhausting generic retries', () => {
  let control = initialScoutControl('scout','W0N1','W0N1',1);
  const ctx = context(1); ctx.policy.assigned = [];
  ctx.ports.fallback = vi.fn(() => ({ status: 'done' as const }));
  for (let tick = 1; tick < 15; tick++) {
    ctx.tick = tick; control = advanceScout(JSON.parse(JSON.stringify(control)),ctx).control;
    expect(control.moving).toBe(false); expect(control.stuck).toBe(0); expect(control.retries).toBeLessThan(2);
  }
  expect(ctx.ports.failure).not.toHaveBeenCalled();
});
test('route failure persists its exclusion before fallback on the next admissible tick', () => {
  let control = initialScoutControl('scout','W0N1','W0N1',1);
  const ctx = context(1); ctx.ports.fallback = vi.fn(() => ({ status: 'running' as const }));
  control = advanceScout(control,ctx).control;
  ctx.tick = 2; ctx.ports.travel = vi.fn(() => ({ status: 'failed' as const, reason: 'no-room-route' }));
  control = advanceScout(control,ctx).control;
  expect(ctx.ports.fallback).not.toHaveBeenCalled(); expect(control.avoidUntil.E0N1).toBe(1002);
  ctx.tick = 3; control = advanceScout(control,ctx).control;
  expect(ctx.ports.fallback).toHaveBeenCalledWith({ E0N1: 1002 }); expect(control.objective).toBeNull();
});
