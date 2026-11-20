import { expect, test } from 'vitest';
import { planBoostSupply } from '../../src/capabilities/industry/boosts/supply';
const lab = { id: 'lab',mineral: 'XGH2O',amount: 30,free: 2970,energy: 0,energyFree: 2000 };
const need = { resource: 'XGH2O',mineral: 60,energy: 40,maximum: 200,mineralReserve: 5,energyReserve: 1000 };
const stores = [{ id: 'bank',stock: { XGH2O: 100,energy: 1100 },free: 100 }];
test('incompatible minerals drain first, then mineral supply precedes energy',() => {
  expect(planBoostSupply({ ...lab,mineral: 'K',amount: 10 },stores,need)).toMatchObject({ direction: 'drain',resource: 'K',quantity: 10 });
  expect(planBoostSupply(lab,stores,need)).toMatchObject({ resource: 'XGH2O',quantity: 30 });
  expect(planBoostSupply({ ...lab,amount: 60 },stores,need)).toMatchObject({ resource: 'energy',quantity: 40 });
});
test('floors, bank capacity and actual resource availability prevent invented refills',() => {
  expect(planBoostSupply(lab,stores,{ ...need,mineralReserve: 100 })).toBeUndefined();
  expect(planBoostSupply({ ...lab,amount: 60 },stores,{ ...need,energyReserve: 1100 })).toBeUndefined();
  expect(planBoostSupply({ ...lab,mineral: 'K' },[{ ...stores[0]!,free: 0 }],need)).toBeUndefined();
});
