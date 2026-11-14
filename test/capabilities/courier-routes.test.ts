import { expect, test } from 'vitest';
import { estimateCourierRoutes } from '../../src/features/logistics/courier-routes';
import { plannedMobility } from '../../src/adapters/screeps/travel-estimate';
import type { MiningStation } from '../../src/capabilities/mining/station';
test('each station keeps its own loaded/empty travel and failed routes do not masquerade as zero travel', () => {
  const endpoints = [2, 10, 30].map(x => ({ station: { id: String(x) } as MiningStation, production: x,
    source: { room: 'W0N1', x, y: 10 }, sink: { room: 'W0N1', x: 1, y: 10 } }));
  const result = estimateCourierRoutes(endpoints, {
    travel: (from, to, loaded) => from.x === 30 ? undefined : { ticks: loaded ? from.x * 3 : to.x, arrival: to },
    replacement: to => to.x + 5,
  }, 2, 4);
  expect(result.routes.map(route => [route.production, route.outboundTicks, route.loadedReturnTicks])).toEqual([[2, 2, 6], [10, 10, 30]]);
  expect(result.travelTicks).toBe(15);
  expect(result.unavailable).toEqual(['30']);
});
test('planned hauling mobility distinguishes empty and full carry weight on swamps', () => {
  expect(plannedMobility(['carry', 'carry', 'move'], 0)).toMatchObject({ roadCost: 1, plainCost: 1, swampCost: 1 });
  expect(plannedMobility(['carry', 'carry', 'move'], 100)).toMatchObject({ roadCost: 1, plainCost: 2, swampCost: 10 });
  expect(plannedMobility(['carry'], 50)).toEqual({ mobile: false });
});
