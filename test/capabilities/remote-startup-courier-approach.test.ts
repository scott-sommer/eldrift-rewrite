import { expect, test } from 'vitest';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { forecastStartupDelivery } from '../../src/capabilities/economy/startup/delivery';
test('the first approach from a spawn exit can differ from subsequent empty service trips',() => {
  const view = startupDeliveryInput(); view.project.spawning.cash.horizon = 160;
  view.couriers = [{ ...view.couriers[0]!,initialOutboundTicks: 80 }];
  const forward = forecastStartupProject(view), staticResult = forecastStartupDelivery(view);
  expect(forward.delivery).toEqual(staticResult.delivery);
  expect(forward.delivery.receipts.slice(0,2).map(receipt => receipt.tick)).toEqual([99,104]);
  expect(forward.delivery.receipts[0]!.energy).toBe(50);
});
test('omitting the first-approach override matches an explicit identical first journey',() => {
  const view = startupDeliveryInput(), expected = forecastStartupProject(view);
  view.couriers = [{ ...view.couriers[0]!,initialOutboundTicks: view.couriers[0]!.outboundTicks }];
  expect(forecastStartupProject(view)).toEqual(expected);
});
test('invalid first-approach timing cannot produce a future project certificate',() => {
  const view = startupDeliveryInput();
  for (const initialOutboundTicks of [-1,NaN,1501,0.5]) {
    view.couriers = [{ ...view.couriers[0]!,initialOutboundTicks }];
    expect(() => forecastStartupProject(view)).toThrow('courier timing');
  }
});
