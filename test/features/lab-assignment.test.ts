import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { reconcileLabAssignment } from '../../src/features/industry/lab-assignment';
import { reconcileLabServices, labServiceOwner } from '../../src/features/industry/lab-services';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { labStateSchema } from '../../src/features/industry/lab-state';
import { openState } from '../../src/persistence/versioned-state';
function fixture() {
  let memory = {}; const state = createMemoryPort(() => memory);
  const labs = ['h','o','out'].map(id => ({ id,mineral: null,amount: 0,x: 10,y: 10,free: 3000,cooldown: 0,reactionAmount: 5 }));
  const recipe = { product: 'OH',reagents: ['H','O'] as const };
  const current = reconcileLabAssignment(state,'home',1,labs,recipe)!;
  const desired = [{ lab: 'h',transfer: { direction: 'refill',source: 'bank',sink: 'h',resource: 'H',quantity: 20 } }];
  reconcileLabServices(state,'home',1,desired,8);
  return { state,labs,recipe,current,desired,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}

test('assignment role identities survive changing stocks, enumeration, reconstruction and JSON reset',() => {
  const f = fixture(); f.reset();
  const observed = [...f.labs].reverse().map(lab => ({ ...lab,mineral: 'X',amount: 10 }));
  expect(reconcileLabAssignment(f.state,'home',2,observed,f.recipe)).toEqual(f.current);
});

test('recipe changes wait for admitted cargo and cancel only unreserved work',() => {
  const f = fixture(), queue = createLogisticsRequests(f.state,'home'), request = queue.pending(1)[0]!;
  const pool = logisticsPool('request',request.owner,request.id);
  createQuantityReservations(f.state).reserve({ id: 'trip',owner: request.owner,holder: 'courier',scope: 'task',expiresAt: 10,allocations: [{ pool,amount: 20 }] },{ [pool]: 20 },1);
  const next = { product: 'UH',reagents: ['U','H'] as const };
  expect(reconcileLabAssignment(f.state,'home',2,f.labs,next)).toBeNull();
  expect(openState(f.state,'industry-labs/home',labStateSchema).assignment).toEqual(f.current);
  expect(queue.pending(2)).toHaveLength(1);
  queue.confirm(request.owner,request.id,{ id: 'native',amount: 20 },2,1);
  createQuantityReservations(f.state).releaseScope('task'); f.reset();
  expect(reconcileLabAssignment(f.state,'home',3,f.labs,next)?.product).toBe('UH');
});

test('disabled production cancels unclaimed services without deleting unrelated work',() => {
  const f = fixture(), queue = createLogisticsRequests(f.state,'home');
  queue.submit({ id: 'other',owner: 'elsewhere',source: 'a',sink: 'b',resource: 'energy',quantity: 10,priority: 1,expiresAt: 100 },1);
  expect(reconcileLabAssignment(f.state,'home',2,f.labs,null)).toBeNull();
  expect(queue.pending(2).map(request => request.owner)).toEqual(['elsewhere']);
  expect(openState(f.state,'industry-labs/home',labStateSchema).assignment).toBeNull();
});

test('destroyed or excluded lab cannot remain in a new assignment; unchanged rooms retain their state',() => {
  const f = fixture(); expect(reconcileLabAssignment(f.state,'home',2,f.labs.slice(1),f.recipe)).toBeNull();
  expect(openState(f.state,'industry-labs/home',labStateSchema).assignment).toBeNull();
  expect(labServiceOwner('other','h')).not.toBe(labServiceOwner('home','h'));
});

test('future schema and malformed persisted assignments are refused rather than reinterpreted',() => {
  const f = fixture(); f.state.write('industry-labs/home',{ owner: 'industry',version: 2,data: { assignment: f.current } });
  expect(() => reconcileLabAssignment(f.state,'home',2,f.labs,f.recipe)).toThrow('future');
  expect(labStateSchema.valid({ assignment: { ...f.current,outputs: [f.current.inputs[0]] } })).toBe(false);
});
