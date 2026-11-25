import { expect, test } from 'vitest';
import { createStartupCashLedger } from '../../src/capabilities/economy/startup/cash-ledger';
const input = { homeEnergy: 100,protectedEnergy: 0,horizon: 2,readyAt: 0,selfHarvestedConstruction: 10 };
const birth = { id: 'body',kind: 'birth' as const,energy: 100,firstTick: 0,interval: null,occurrences: 1 };
test('settled ambient stock increases cash but cannot manufacture delivery income or source recovery',() => {
  const ledger = createStartupCashLedger(input,undefined,{ ambient: true });
  ledger.frame(0,[birth],0,true,0,10);
  expect(ledger.checkpoint().state).toMatchObject({ endingEnergy: 10,minimumEnergy: 0,ambientEnergy: 10,deliveredEnergy: 0,homeCashSurplus: -100,constructionRecoveryMargin: -110,firstDeliveryAt: null,firstRecoveryAt: null });
  ledger.frame(1,[],50,true,0,50);
  expect(ledger.checkpoint().state).toMatchObject({ endingEnergy: 110,ambientEnergy: 60,deliveredEnergy: 50,homeCashSurplus: -50,constructionRecoveryMargin: -60,firstDeliveryAt: 1,firstRecoveryAt: null });
  ledger.frame(2,[],60,true,0,100);
  expect(ledger.result()).toMatchObject({ endingEnergy: 270,ambientEnergy: 160,deliveredEnergy: 110,homeCashSurplus: 10,constructionRecoveryMargin: 0,firstRecoveryAt: 2,requiredHomeEnergy: 100 });
});
test('JSON recovery preserves ambient attribution while legacy readers refuse its new state shape',() => {
  const ledger = createStartupCashLedger(input,undefined,{ ambient: true }); ledger.frame(0,[birth],0,true,0,10);
  const wire = JSON.parse(JSON.stringify(ledger.checkpoint())), resumed = createStartupCashLedger(input,wire,{ ambient: true });
  expect(() => createStartupCashLedger(input,wire)).toThrow('checkpoint');
  for (const model of [ledger,resumed]) { model.frame(1,[],50,true,0,50); model.frame(2,[],60,true,0,100); }
  expect(resumed.result()).toEqual(ledger.result());
  wire.state.ambientEnergy++; expect(() => createStartupCashLedger(input,wire,{ ambient: true })).toThrow('checkpoint');
});
test('legacy mode refuses ambient input before mutation and retains its original checkpoint shape',() => {
  const ledger = createStartupCashLedger(input), before = ledger.checkpoint();
  expect(() => ledger.frame(0,[birth],0,true,0,10)).toThrow('ambient'); expect(ledger.checkpoint()).toEqual(before);
  expect(before.state).not.toHaveProperty('ambientEnergy'); expect(() => createStartupCashLedger(input,before,{ ambient: true })).toThrow('checkpoint');
});
