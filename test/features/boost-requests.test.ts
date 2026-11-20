import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { boostRequest } from '../fixtures/boosts';
function fixture() { let memory = {}; const state = createMemoryPort(() => memory); return { state,store: createBoostRequests(state),reset: () => { memory = JSON.parse(JSON.stringify(memory)); } }; }

test('immutable requests survive JSON reset and equivalent field-order replay; conflicting requests cannot replace owned work',() => {
  const f = fixture(), request = boostRequest(); expect(f.store.submit(request,1)).toBe(true);
  f.reset(); expect(f.store.submit({ ...request,steps: [{ count: 2,resource: 'XGH2O',part: 'work' }] },2)).toBe(true);
  expect(() => f.store.submit({ ...request,expiresAt: 30 },2)).toThrow('conflict');
  expect(f.store.submit({ ...request,id: 'other' },2)).toBe(false);
  request.steps = []; expect(f.store.get('mission','boost')!.request.steps).toHaveLength(1);
});

test('required failed requests remain gated until their owner acknowledges; outcomes are not success',() => {
  const f = fixture(); f.store.submit(boostRequest(),1);
  expect(f.store.readiness('mission','boost')).toBe('waiting');
  f.store.update('mission','boost',job => { job.status = 'failed'; job.reason = 'unavailable'; });
  expect(f.store.readiness('mission','boost')).toBe('failed');
  expect(f.store.submit({ ...boostRequest(),id: 'retry' },2)).toBe(false);
  f.store.acknowledge('mission','boost'); expect(f.store.submit({ ...boostRequest(),id: 'retry' },2)).toBe(true);
  expect(() => f.store.cancel('other','retry')).toThrow('absent');
});

test('bounded fair batches persist across reset and cannot execute again in the same tick',() => {
  const f = fixture(); for (const id of ['one','two','three']) f.store.submit(boostRequest(id),1);
  expect(f.store.batch(1,2).map(job => job.request.id)).toEqual(['one','two']); f.reset();
  expect(f.store.batch(1,2)).toEqual([]); expect(f.store.batch(2,2).map(job => job.request.id)).toEqual(['three','one']);
});

test('capacity does not discard unacknowledged outcomes or pinned lab cleanup',() => {
  const f = fixture(); for (let index = 0; index < 64; index++) f.store.submit(boostRequest('job-'+index),1);
  expect(f.store.submit(boostRequest('overflow'),1)).toBe(false);
  f.store.update('mission','job-0',job => { job.status = 'failed'; job.lab = 'lab'; job.reason = 'lost'; });
  f.store.acknowledge('mission','job-0'); expect(f.store.submit(boostRequest('overflow'),1)).toBe(false);
  f.store.update('mission','job-0',job => { job.lab = null; }); expect(f.store.submit(boostRequest('overflow'),1)).toBe(true);
});

test('schema rejects unobserved confirmations and future data',() => {
  const f = fixture(); f.store.submit(boostRequest(),1);
  expect(() => f.store.update('mission','boost',job => { job.status = 'confirmed'; })).toThrow('invalid');
  f.state.write('industry-boosts/empire',{ owner: 'industry',version: 2,data: { jobs: [],cursor: 0,processedAt: -1 } });
  expect(f.store.read).toThrow('future');
});
