import { expect, test } from 'vitest';
import { economyBudget } from '../../src/features/population/economy-budget';
const room = { available: 300, capacity: 1800, stored: 0, miners: 0, couriers: 0, fillers: 0 };
test('bootstrap and collapsed economies use spendable energy while established roles size to capacity', () => {
  expect(economyBudget('miner', room)).toBe(300);
  expect(economyBudget('courier', room)).toBe(300);
  expect(economyBudget('miner', { ...room, miners: 1 })).toBe(1800);
  expect(economyBudget('courier', { ...room, couriers: 1 })).toBe(1800);
  expect(economyBudget('scavenger', { ...room, miners: 1, couriers: 1 })).toBe(300);
});
test('stored energy only supports waiting for larger bodies when a filler can replenish spawns', () => {
  expect(economyBudget('miner', { ...room, stored: 10000 })).toBe(300);
  expect(economyBudget('miner', { ...room, stored: 10000, fillers: 1 })).toBe(1800);
  expect(economyBudget('courier', { ...room, stored: 10000, fillers: 1 })).toBe(1100);
  expect(economyBudget('courier', { ...room, stored: 5000, fillers: 1 })).toBe(300);
});
test('policy overrides remain bounded by room capacity and reject invalid observations', () => {
  const policy = { recoveryReserve: 1000, matureCourierBudget: 800, maximumBudget: 900 };
  expect(economyBudget('miner', { ...room, miners: 1 }, policy)).toBe(900);
  expect(economyBudget('courier', { ...room, stored: 2000, fillers: 1 }, policy)).toBe(800);
  expect(() => economyBudget('miner', { ...room, available: 2000 })).toThrow('capacity');
});
