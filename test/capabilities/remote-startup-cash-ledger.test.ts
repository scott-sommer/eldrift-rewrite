import { expect, test } from 'vitest';
import { createStartupCashLedger } from '../../src/capabilities/economy/startup/cash-ledger';
import type { StartupCashFlow } from '../../src/capabilities/economy/startup/cash-model';
const input = { homeEnergy: 300,protectedEnergy: 50,horizon: 1,readyAt: 0,selfHarvestedConstruction: 50 };
const birth: StartupCashFlow = { id: 'worker',kind: 'birth',energy: 200,firstTick: 0,interval: null,occurrences: 1 };
test('streamed accounting preserves cost-before-receipt minimum and observed readiness',() => {
  const ledger = createStartupCashLedger(input);
  ledger.frame(0,[birth],200,false);
  expect(ledger.through()).toBe(1); expect(() => ledger.result()).toThrow('incomplete');
  ledger.frame(1,[],100,true);
  expect(ledger.result()).toMatchObject({ endingEnergy: 400,minimumEnergy: 100,minimumAt: 0,requiredHomeEnergy: 250,homeShortfall: 0,
    birthEnergy: 200,deliveredEnergy: 300,homeCashSurplus: 100,constructionRecoveryMargin: 50,firstDeliveryAt: 0,firstRecoveryAt: 1 });
});
test('invalid effects, duplicate frames and unsafe totals cannot partially change accounting',() => {
  const ledger = createStartupCashLedger({ ...input,horizon: 0 });
  expect(() => ledger.frame(0,[{ ...birth,energy: -1 }])).toThrow();
  expect(() => ledger.frame(0,[],Number.MAX_SAFE_INTEGER)).toThrow('overflow');
  expect(ledger.through()).toBe(0);
  ledger.frame(0,[birth],200); expect(() => ledger.frame(0,[])).toThrow('order');
  expect(ledger.result()).toMatchObject({ birthEnergy: 200,endingEnergy: 300,deliveredEnergy: 200 });
});
test('cost categories remain separate and external deficits are reported explicitly',() => {
  const ledger = createStartupCashLedger({ ...input,homeEnergy: 100,horizon: 0 });
  ledger.frame(0,[{ ...birth,energy: 50 },{ ...birth,id: 'site',kind: 'home-construction',energy: 40 },{ ...birth,id: 'repair',kind: 'upkeep',energy: 30 }]);
  expect(ledger.result()).toMatchObject({ endingEnergy: -20,birthEnergy: 50,homeConstructionEnergy: 40,upkeepEnergy: 30,requiredHomeEnergy: 170,homeShortfall: 70 });
});
