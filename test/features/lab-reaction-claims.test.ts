import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { reserveLabReaction } from '../../src/features/industry/reaction-claims';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
const labs = [{ id: 'h',mineral: 'H',amount: 10 },{ id: 'o',mineral: 'O',amount: 10 },{ id: 'out',mineral: null,amount: 0 }]
  .map(lab => ({ ...lab,x: 10,y: 10,free: 3000,cooldown: 0,reactionAmount: 5 }));
const reaction = { output: 'out',inputs: ['h','o'] as const,product: 'OH',amount: 5 };

test('reaction reservations share input stock with hauling and survive reconstruction',() => {
  let memory = {}; const state = createMemoryPort(() => memory), ledger = createQuantityReservations(state);
  const pool = logisticsPool('stock','h','H');
  ledger.reserve({ id: 'courier',owner: 'logistics',holder: 'unit',scope: 'trip',expiresAt: 3,allocations: [{ pool,amount: 6 }] },{ [pool]: 10 },1);
  expect(reserveLabReaction(state,'home',1,reaction,labs)).toBe(false);
  expect(ledger.list(1)).toHaveLength(1); ledger.releaseScope('trip');
  expect(reserveLabReaction(state,'home',1,reaction,labs)).toBe(true);
  memory = JSON.parse(JSON.stringify(memory)); expect(createQuantityReservations(state).list(1)[0]?.allocations).toHaveLength(3);
  expect(createQuantityReservations(state).list(2)).toEqual([]);
});

test('specialized mineral capacity is shared across resources without consuming the energy compartment',() => {
  const memory = {}, port = createMemoryPort(() => memory), ledger = createQuantityReservations(port);
  const pool = logisticsPool('capacity','out','mineral');
  ledger.reserve({ id: 'supply',owner: 'logistics',holder: 'unit',scope: 'trip',expiresAt: 3,allocations: [{ pool,amount: 2998 }] },{ [pool]: 3000 },1);
  expect(reserveLabReaction(port,'home',1,reaction,labs)).toBe(false);
  ledger.releaseScope('trip');
  const energy = logisticsPool('capacity','out','energy');
  ledger.reserve({ id: 'energy',owner: 'logistics',holder: 'unit',scope: 'trip',expiresAt: 3,allocations: [{ pool: energy,amount: 2000 }] },{ [energy]: 2000 },1);
  expect(reserveLabReaction(port,'home',1,reaction,labs)).toBe(true);
});
