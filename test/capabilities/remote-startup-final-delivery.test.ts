import { expect, test } from 'vitest';
import { createStartupProject, forecastStartupProject, restoreStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupInitialInput, initialCourier } from '../fixtures/startup-initial';
function input(availableAt = 0,deliveryTicks = 1) {
  const value = startupInitialInput();
  value.initial!.couriers = [initialCourier({ phase: 'deliver',energy: 30,expiresAt: 1,availableAt,deliveryTicks })];
  return value;
}

test('a loaded courier transfers on its last live tick and confirmation remains creditable after death',() => {
  const value = input(), result = forecastStartupProject(value);
  expect(result.delivery).toMatchObject({ deliveredEnergy: 30,unreturnedCourierEnergy: 0,receipts: [{ tick: 1,energy: 30,request: 'paid-courier' }] });
  expect(result.cash).toMatchObject({ endingEnergy: 330,homeCashSurplus: 30,constructionRecoveryMargin: 0 });
  let project = createStartupProject(value);
  for (let frame = 0; frame < 21; frame++) {
    project.advance(1); project = restoreStartupProject(value,JSON.parse(JSON.stringify(project.checkpoint())));
  }
  expect(project.result()).toEqual(result);
});

test.each([[1,1],[0,2]])('arrival or completion after the final live action cannot create cash (%i,%i)',(arrival,service) => {
  const result = forecastStartupProject(input(arrival,service));
  expect(result.delivery).toMatchObject({ deliveredEnergy: 0,unreturnedCourierEnergy: 30,receipts: [] });
  expect(result.cash).toMatchObject({ endingEnergy: 300,constructionRecoveryMargin: -30 });
});

test('collection admits a journey whose final transfer settles exactly at expiry',() => {
  const value = startupInitialInput(); value.initial!.containerEnergy = 30;
  value.initial!.couriers = [initialCourier({ expiresAt: 3,retireTicks: 0,returnTicks: 1 })];
  const result = forecastStartupProject(value);
  expect(result.delivery).toMatchObject({ deliveredEnergy: 30,unreturnedCourierEnergy: 0,receipts: [{ tick: 3,energy: 30,request: 'paid-courier' }] });
});
