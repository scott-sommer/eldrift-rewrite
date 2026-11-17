import { expect, test } from 'vitest';
import { createResidualNetwork } from '../../src/core/residual-network';
test('bounded augmentations converge to max flow and expose the minimum-cut source region', () => {
  const edges = [{ from: 0, to: 1, capacity: 3 }, { from: 0, to: 2, capacity: 2 },
    { from: 1, to: 2, capacity: 1 }, { from: 1, to: 3, capacity: 2 }, { from: 2, to: 3, capacity: 3 }];
  const network = createResidualNetwork(4, edges, 0, 3);
  expect(network.advance(0)).toMatchObject({ done: false, flow: 0 });
  expect(network.advance(1, () => false)).toMatchObject({ done: false, flow: 0 });
  let result = network.advance(1);
  for (let n = 0; !result.done && n < 10; n++) result = network.advance(1);
  expect(result).toMatchObject({ done: true, flow: 5, reachable: [0] });
  expect(createResidualNetwork(4, edges, 0, 3).advance(100).flow).toBe(result.flow);
  expect(network.advance(1)).toMatchObject({ done: true, flow: 5, augmentations: 0 });
});
test('disconnected terminals and parallel edges preserve residual behavior', () => {
  expect(createResidualNetwork(2, [], 0, 1).advance(1)).toMatchObject({ done: true, flow: 0, reachable: [0] });
  const edges = [1, 2].map(capacity => ({ from: 0, to: 1, capacity }));
  expect(createResidualNetwork(2, edges, 0, 1).advance(10).flow).toBe(3);
});
test('invalid networks and budgets fail explicitly', () => {
  expect(() => createResidualNetwork(1, [], 0, 0)).toThrow();
  expect(() => createResidualNetwork(2, [{ from: 0, to: 1, capacity: -1 }], 0, 1)).toThrow();
  expect(() => createResidualNetwork(2, [], 0, 1).advance(-1)).toThrow('budget');
});
