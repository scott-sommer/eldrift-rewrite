import { expect, test } from 'vitest';
import { forecastStartupCash } from '../../src/capabilities/economy/startup/cash';
import type { StartupCashInput, StartupCashFlow } from '../../src/capabilities/economy/startup/cash-model';
function input(flows: StartupCashFlow[],overrides: Partial<StartupCashInput> = {}): StartupCashInput {
  return { homeEnergy: 1300,protectedEnergy: 0,horizon: 1500,readyAt: 1250,selfHarvestedConstruction: 5000,flows,...overrides };
}
const birth: StartupCashFlow = { id: 'miner',kind: 'birth',energy: 550,firstTick: 0,interval: null,occurrences: 1 };
test('self-harvested construction is a recovery target, not an invented debit from home cash',() => {
  const result = forecastStartupCash(input([birth]));
  expect(result).toMatchObject({ endingEnergy: 750,minimumEnergy: 750,requiredHomeEnergy: 550,homeShortfall: 0,birthEnergy: 550,homeConstructionEnergy: 0,homeCashSurplus: -550,constructionRecoveryMargin: -5550,firstRecoveryAt: null });
});
test('home-funded construction, protected reserve and existing body cost all require finite funding',() => {
  const construction: StartupCashFlow = { id: 'road',kind: 'home-construction',energy: 300,firstTick: 1,interval: null,occurrences: 1 };
  expect(forecastStartupCash(input([birth,construction],{ homeEnergy: 1000,protectedEnergy: 200 }))).toMatchObject({ endingEnergy: 150,minimumAt: 1,requiredHomeEnergy: 1050,homeShortfall: 50 });
});
test('same-frame delivery cannot finance earlier birth admission',() => {
  const delivery: StartupCashFlow = { id: 'credit',kind: 'delivery',energy: 550,firstTick: 0,interval: null,occurrences: 1 };
  expect(forecastStartupCash(input([delivery,birth],{ homeEnergy: 0 }))).toMatchObject({ endingEnergy: 0,minimumEnergy: -550,requiredHomeEnergy: 550,homeShortfall: 550 });
});
test('discrete replacement births include idle workers and future delivery is not prepaid',() => {
  const flows: StartupCashFlow[] = [{ ...birth,interval: 1400,occurrences: 3 },
    { id: 'courier',kind: 'birth',energy: 200,firstTick: 21,interval: 1400,occurrences: 3 },
    { id: 'credit',kind: 'delivery',energy: 100,firstTick: 1300,interval: 30,occurrences: 100 }];
  const result = forecastStartupCash(input(flows));
  expect(result.birthEnergy).toBe(1500); expect(result.deliveredEnergy).toBe(700);
  expect(result.firstDeliveryAt).toBe(1300); expect(result.firstRecoveryAt).toBeNull();
  expect(result.endingEnergy).toBe(500); expect(result.minimumEnergy).toBe(300);
});
test('recovery excludes initial bank and requires declared readiness and actual deliveries',() => {
  const flow: StartupCashFlow = { id: 'income',kind: 'delivery',energy: 100,firstTick: 10,interval: 10,occurrences: 5 };
  expect(forecastStartupCash(input([flow],{ selfHarvestedConstruction: 300,readyAt: 40,horizon: 50 }))).toMatchObject({ firstRecoveryAt: 40,constructionRecoveryMargin: 200 });
  expect(forecastStartupCash(input([],{ selfHarvestedConstruction: 0,readyAt: 0 }))).toMatchObject({ firstRecoveryAt: null,firstDeliveryAt: null });
});
test('finite recurrence counts and zero horizon have explicit inclusive frame semantics',() => {
  expect(forecastStartupCash(input([{ ...birth,firstTick: 0,interval: 1,occurrences: 2 }],{ horizon: 1 })).birthEnergy).toBe(1100);
  expect(forecastStartupCash(input([birth],{ horizon: 0 })).birthEnergy).toBe(550);
});
test.each([{ horizon: 10001 },{ protectedEnergy: -1 },{ flows: [birth,birth] },{ flows: [{ ...birth,interval: 0 }] },{ flows: [{ ...birth,occurrences: 2 }] }])('invalid capital/schedule inputs are rejected',(overrides) => {
  expect(() => forecastStartupCash(input([birth],overrides))).toThrow();
});
