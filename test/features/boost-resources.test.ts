import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { reserveBoostStock, releaseBoostStock } from '../../src/features/industry/boosts/resources';
import { boostScope } from '../../src/capabilities/industry/boosts/model';
import { boostJob } from '../fixtures/boosts';
const lab = { id: 'lab',mineral: 'XGH2O',amount: 60,free: 2940,energy: 40,energyFree: 1960 };
test('the whole boost kit shares stock pools atomically with hauling, survives reset and releases only its scope',() => {
  let memory = {}; const state = createMemoryPort(() => memory), ledger = createQuantityReservations(state), job = boostJob();
  const energy = logisticsPool('stock','lab','energy');
  ledger.reserve({ id: 'other',owner: 'logistics',holder: 'courier',scope: 'trip',expiresAt: 5,allocations: [{ pool: energy,amount: 1 }] },{ [energy]: 40 },1);
  expect(reserveBoostStock(state,job,lab,'XGH2O',60,40,1)).toBe(false); expect(ledger.list(1)).toHaveLength(1);
  ledger.releaseScope('trip'); expect(reserveBoostStock(state,job,lab,'XGH2O',60,40,1)).toBe(true);
  memory = JSON.parse(JSON.stringify(memory)); expect(createQuantityReservations(state).list(4)[0]?.scope).toBe(boostScope(job.request));
  expect(createQuantityReservations(state).list(4)[0]?.allocations.map(item => item.amount)).toEqual([60,40]);
  releaseBoostStock(state,job); expect(ledger.list(4)).toEqual([]);
});
