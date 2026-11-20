import { expect, test, vi } from 'vitest';
import { runHauling } from '../../src/app/hauling-cycle';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { logisticsPool } from '../../src/capabilities/logistics/request';
test('the authoritative pending request supplies service geometry even when an older task snapshot has none',() => {
  const root = {},state = createMemoryPort(() => root), request = { id: 'flow',owner: 'remote',source: 'container',sink: 'bank',resource: 'energy',quantity: 50,priority: 0,expiresAt: 100 };
  const service = { collection: { room: 'E0N1',x: 4,y: 24 },deposit: { room: 'W0N1',x: 44,y: 25 } };
  createLogisticsRequests(state,'W0N1').submit({ ...request,service },1);
  const execute = vi.fn(() => ({ status: 'running' as const }));
  expect(runHauling(state,{ home: 'W0N1',unit: 'courier-id',holder: 'courier',scope: 'scope',request },
    { tick: 1,cargo: 0,freeCargo: 50,sourceStock: 50,sinkFree: 100,sinkPool: logisticsPool('capacity','bank') },{ observe: () => ({ tick: 1 }),execute })).toEqual({ status: 'running' });
  expect(execute.mock.calls[0]).toBeDefined(); expect(execute).toHaveBeenCalledWith(expect.objectContaining({ service }),'collect',50,expect.any(String),expect.any(String));
});
