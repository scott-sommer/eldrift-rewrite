import { expect, test } from 'vitest';
import { haulingDemand } from '../../src/capabilities/logistics/demand';
import type { HaulingRoute } from '../../src/capabilities/logistics/demand';
const capacity = { utilization: 1, workerCapacity: 100, committedCapacity: 0 };
const route: HaulingRoute = { id: 'source', production: 10, outboundTicks: 10, loadedReturnTicks: 10, serviceTicks: 0, delayTicks: 0 };
test('sums each source rate times its own round trip rather than multiplying aggregate rates and distances', () => {
  const result = haulingDemand([route, { ...route, id: 'far', production: 2, outboundTicks: 50, loadedReturnTicks: 50 }], capacity);
  expect(result.requiredCapacity).toBe(400);
  expect(result.contributions.map(item => item.capacity)).toEqual([200, 200]);
  expect(result.missingWorkers).toBe(4);
});
test('loaded terrain time, handling delay and utilization reserve all affect required capacity', () => {
  const result = haulingDemand([{ ...route, loadedReturnTicks: 30, serviceTicks: 2, delayTicks: 8 }],
    { ...capacity, utilization: 0.8, committedCapacity: 200 });
  expect(result.requiredCapacity).toBe(625);
  expect(result.shortfall).toBe(425);
  expect(result.missingWorkers).toBe(5);
});
test('committed capacity includes caller-selected live and pending workers without ordering dependence', () => {
  expect(haulingDemand([route], { ...capacity, committedCapacity: 200 }).missingWorkers).toBe(0);
  expect(haulingDemand([route], { ...capacity, committedCapacity: 300 }).shortfall).toBe(0);
  expect(haulingDemand([], capacity).missingWorkers).toBe(0);
  expect(haulingDemand([{ ...route, production: 0 }], capacity).missingWorkers).toBe(0);
});
test('rejects invalid routes, duplicate identities, utilization and numeric overflow', () => {
  expect(() => haulingDemand([route, route], capacity)).toThrow();
  expect(() => haulingDemand([{ ...route, loadedReturnTicks: -1 }], capacity)).toThrow();
  expect(() => haulingDemand([route], { ...capacity, utilization: 0 })).toThrow();
  expect(() => haulingDemand([route], { ...capacity, workerCapacity: 0 })).toThrow();
  expect(() => haulingDemand([{ ...route, production: Number.MAX_VALUE }], capacity)).toThrow();
});
