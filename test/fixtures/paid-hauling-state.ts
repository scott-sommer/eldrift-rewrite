import { resolvePaidCourierOpening } from '../../src/app/remotes/startup/motion-observation/opening';
import type { PaidCourierObservation } from '../../src/app/remotes/startup/motion-observation/model';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { taskScope } from '../../src/persistence/tasks/scope';
export function paidHaulingStateFixture(kind: 'transfer' | 'withdraw' = 'transfer', cargo = 0, quantity = 50) {
  const request = { id: 'trip',owner: 'owner',source: 'container',sink: 'bank',resource: 'energy',quantity,priority: 0,expiresAt: 100 };
  const record = { id: 'trip',kind: 'haul',phase: 'work',payload: { home: 'W0N1',unitId: 'native',sinkRoom: 'W0N1',request },wakeAt: 11,retries: 2,expiresAt: 100 };
  const amount = 50;
  const observed: PaidCourierObservation = { observedAt: 11,name: 'courier',unit: 'native',owner: 'fleet',position: { room: 'W0N1',x: 10,y: 25 },energy: cargo,fatigue: 0,
    activeAt: 1,expiresAt: 1500,retireAt: 1400,stage: 'pending',task: { record,id: 'trip',wakeAt: 11,expiresAt: 100,remaining: quantity,receipts: [],request },
    journal: { acknowledged: false,result: { status: 'observed',amount },attempt: { id: 'attempt',unit: 'native',target: kind === 'withdraw' ? 'container' : 'bank',
      room: kind === 'withdraw' ? 'E0N1' : 'W0N1',resource: 'energy',kind,tick: 10,amount,cargoBefore: kind === 'withdraw' ? 0 : cargo+amount,
      requestKey: logisticsPool('request-binding','W0N1','owner','trip') } } };
  const resolved = resolvePaidCourierOpening(observed);
  if (resolved.status !== 'ready') throw new Error('Fixture opening unresolved: '+resolved.reason);
  const scope = taskScope('courier','trip');
  const claims = [{ id: logisticsPool('booking','owner','trip',scope),owner: 'owner',holder: 'courier',scope,expiresAt: 12,
    allocations: [logisticsPool('request','owner','trip'),logisticsPool('capacity','bank'),logisticsPool('stock','container','energy')].map(pool => ({ pool,amount: 50 })) },
    { id: 'outside',owner: 'other',holder: 'resident',scope: 'other-task',expiresAt: 20,allocations: [{ pool: logisticsPool('capacity','bank'),amount: 10 }] }];
  const courier = { source: 'source-a',room: 'E0N1',opening: resolved.opening };
  return { request,record,observed,opening: resolved.opening,courier,claims };
}
