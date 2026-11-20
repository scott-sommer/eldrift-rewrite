import { expect, test } from 'vitest';
import { createStartupSpawnTimeline } from '../../src/capabilities/economy/startup/spawn-timeline';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
function input() {
  const view = startupDeliveryInput().project.spawning;
  view.cash.homeEnergy = 0; view.cash.horizon = 2; view.funding.initialEnergy = 0;
  view.requests = [{ ...view.requests[0]!,body: ['move'],id: 'later',name: 'later' }];
  view.funding.refills = [{ id: 'distribution',energy: 50,firstTick: 0,interval: 1,occurrences: 3 }];
  return view;
}
test('a receipt cannot fund an earlier same-frame admission or earlier internal transfer',() => {
  const timeline = createStartupSpawnTimeline(input());
  expect(timeline.begin(0)).toEqual([]); timeline.finish([{ id: 'earned',tick: 0,energy: 50 }]);
  expect(timeline.begin(1)).toEqual([]); timeline.finish();
  expect(timeline.begin(2)[0]).toMatchObject({ request: 'later',startAt: 2,cost: 50 }); timeline.finish();
  expect(timeline.result().cash).toMatchObject({ birthEnergy: 50,deliveredEnergy: 50,homeShortfall: 0,endingEnergy: 0 });
});
test('future, duplicate and wrong-phase receipts are refused before mutating credited history',() => {
  const timeline = createStartupSpawnTimeline(input());
  expect(() => timeline.finish()).toThrow('not open'); timeline.begin(0);
  expect(() => timeline.begin(0)).toThrow('order');
  expect(() => timeline.finish([{ id: 'future',tick: 1,energy: 50 }])).toThrow('timing');
  expect(() => timeline.finish([{ id: 'same',tick: 0,energy: 25 },{ id: 'same',tick: 0,energy: 25 }])).toThrow('identity');
  timeline.finish([{ id: 'same',tick: 0,energy: 50 }]);
  timeline.begin(1); expect(() => timeline.finish([{ id: 'same',tick: 1,energy: 50 }])).toThrow('identity'); timeline.finish();
  timeline.begin(2); timeline.finish(); expect(timeline.result().cash.deliveredEnergy).toBe(50);
});
