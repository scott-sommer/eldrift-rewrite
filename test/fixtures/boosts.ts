import type { BoostJob, BoostRequest, BoostUnit } from '../../src/capabilities/industry/boosts/model';
export function boostRequest(id = 'boost',required = true): BoostRequest {
  return { id,owner: 'mission',unit: 'unit-'+id,name: id,home: 'W0N1',steps: [{ part: 'work',resource: 'XGH2O',count: 2 }],expiresAt: 20,required };
}
export function boostJob(required = true): BoostJob {
  return { request: boostRequest('boost',required),status: 'pending',lab: null,attempt: null,observed: [0],cancelRequested: false,acknowledged: false,reason: null };
}
export function boostUnit(): BoostUnit {
  return { id: 'unit-boost',name: 'boost',owner: 'mission',home: 'W0N1',spawning: false,body: [{ type: 'work',hits: 100,boost: null },{ type: 'work',hits: 100,boost: null }] };
}
