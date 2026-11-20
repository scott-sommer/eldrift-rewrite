import { expect, test } from 'vitest';
import { boostJob, boostUnit } from '../fixtures/boosts';
import { observeBoostJob, missingBoostParts } from '../../src/capabilities/industry/boosts/observe';
import { holdsBoostUnit } from '../../src/capabilities/industry/boosts/model';
function issued() {
  const job = boostJob(); job.status = 'issued'; job.attempt = { tick: 1,before: 0,count: 2,part: 'work',resource: 'XGH2O',code: 0 }; return job;
}

test('acceptance cannot release a mission before later native body observation',() => {
  const job = issued(), unit = boostUnit();
  unit.body = unit.body.map(part => ({ ...part,boost: 'XGH2O' }));
  observeBoostJob(job,unit,1); expect(job.status).toBe('issued'); expect(holdsBoostUnit(job)).toBe(true);
  observeBoostJob(job,unit,2); expect(job.status).toBe('confirmed'); expect(job.observed).toEqual([2]); expect(holdsBoostUnit(job)).toBe(false);
});

test('interrupted invocation and partial/rejected effects retry only the observed missing body parts',() => {
  const job = issued(), unit = boostUnit(); job.attempt!.code = null;
  unit.body = [{ type: 'work',hits: 100,boost: 'XGH2O' },unit.body[1]!];
  observeBoostJob(job,unit,2); expect(job.status).toBe('pending'); expect(job.observed).toEqual([1]);
  expect(missingBoostParts(job,unit,job.request.steps[0]!)).toBe(1);
  const rejected = issued(); rejected.attempt!.code = -6; observeBoostJob(rejected,boostUnit(),2); expect(rejected.status).toBe('pending');
});

test('cancellation waits for an admitted effect and preserves observed partial capability without success',() => {
  const job = issued(), unit = boostUnit(); job.cancelRequested = true;
  observeBoostJob(job,unit,1); expect(job.status).toBe('issued');
  unit.body = unit.body.map(part => ({ ...part,boost: 'XGH2O' }));
  observeBoostJob(job,unit,2); expect(job.status).toBe('cancelled'); expect(job.observed).toEqual([2]); expect(holdsBoostUnit(job)).toBe(true);
  job.acknowledged = true; expect(holdsBoostUnit(job)).toBe(false);
});

test('expiry blocks new work but a last admitted effect can still be observed',() => {
  const job = issued(), unit = boostUnit(); job.request.expiresAt = 2;
  unit.body = unit.body.map(part => ({ ...part,boost: 'XGH2O' })); observeBoostJob(job,unit,2); expect(job.status).toBe('confirmed');
  const expired = boostJob(false); observeBoostJob(expired,boostUnit(),20); expect(expired.status).toBe('expired'); expect(holdsBoostUnit(expired)).toBe(false);
});

test.each([null,{ ...boostUnit(),id: 'replacement' },{ ...boostUnit(),owner: 'different' }])('missing/reassigned native identities never inherit success (%j)',unit => {
  const job = issued(); observeBoostJob(job,unit,2); expect(job.status).toBe('failed'); expect(job.observed).toEqual([0]);
});

test('unreplaceable foreign boosts and destroyed eligible parts are refused',() => {
  const job = boostJob(), unit = boostUnit(); unit.body = [{ type: 'work',hits: 100,boost: 'LH' },unit.body[1]!];
  expect(missingBoostParts(job,unit,job.request.steps[0]!)).toBeNull();
  unit.body = [{ type: 'work',hits: 0,boost: null },unit.body[1]!]; expect(missingBoostParts(job,unit,job.request.steps[0]!)).toBeNull();
});
