import { expect, test } from 'vitest';
import { forecastStartupCash } from '../../src/capabilities/economy/startup/cash';
import type { StartupCashInput, StartupCashReceipt } from '../../src/capabilities/economy/startup/cash-model';
const cash: StartupCashInput = { homeEnergy: 0,protectedEnergy: 0,horizon: 300,readyAt: 0,selfHarvestedConstruction: 0,flows: [] };
test('irregular finite delivery events need no invented recurring income and aggregate by observed frame',() => {
  const receipts = Array.from({ length: 200 },(_,tick) => ({ id: String(tick),tick,energy: tick%2 ? 2 : 1 }));
  expect(forecastStartupCash(cash,receipts)).toMatchObject({ deliveredEnergy: 300,endingEnergy: 300,firstDeliveryAt: 0,firstRecoveryAt: 0 });
  expect(forecastStartupCash(cash,[{ id: 'a',tick: 1,energy: 3 },{ id: 'b',tick: 1,energy: 4 }]).endingEnergy).toBe(7);
});
test('receipt events still cannot pay an earlier same-frame birth admission',() => {
  const input = { ...cash,flows: [{ id: 'body',kind: 'birth' as const,energy: 200,firstTick: 1,interval: null,occurrences: 1 }] };
  expect(forecastStartupCash(input,[{ id: 'income',tick: 1,energy: 200 }])).toMatchObject({ endingEnergy: 0,minimumEnergy: -200,homeShortfall: 200 });
});
test('duplicate identities and invalid/out-of-horizon receipt events are rejected',() => {
  const receipt: StartupCashReceipt = { id: 'a',tick: 0,energy: 2 };
  expect(() => forecastStartupCash(cash,[receipt,receipt])).toThrow('identity');
  for (const invalid of [{ ...receipt,tick: 301 },{ ...receipt,tick: -1 },{ ...receipt,energy: Infinity },{ ...receipt,energy: -1 }]) {
    expect(() => forecastStartupCash(cash,[invalid])).toThrow();
  }
});

test('event identities cannot double-book an existing recurring-flow receipt',() => {
  const input = { ...cash,flows: [{ id: 'same',kind: 'delivery' as const,energy: 2,firstTick: 1,interval: null,occurrences: 1 }] };
  expect(() => forecastStartupCash(input,[{ id: 'same',tick: 1,energy: 2 }])).toThrow('identity');
});
