import { afterEach, expect, test, vi } from 'vitest';
import { generateNativeLabTransport } from '../../src/app/native-lab-transport';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { defaults } from '../../src/config/model';
afterEach(() => vi.unstubAllGlobals());
test.each([[99,0],[101,1]])('lab drains preserve configured warehouse headroom (%i free -> %i transferable)',(free,quantity) => {
  vi.stubGlobal('Game',{ time: 1 }); vi.stubGlobal('STRUCTURE_STORAGE','storage');
  const stock = { H: 40,O: 20 };
  Object.defineProperties(stock,{ getFreeCapacity: { value: () => free },getUsedCapacity: { value: (resource: keyof typeof stock) => stock[resource] ?? 0 } });
  const room = { name: 'home',storage: { id: 'bank',my: true,structureType: 'storage',isActive: () => true,store: stock } } as unknown as Room;
  const memory = {}, state = createMemoryPort(() => memory);
  const assignment = { product: 'OH',reagents: ['H','O'] as const,inputs: ['h','o'] as const,outputs: ['out'],roster: ['h','o','out'] };
  const labs = [{ id: 'h',mineral: 'X',amount: 10 },{ id: 'o',mineral: null,amount: 0 },{ id: 'out',mineral: null,amount: 0 }]
    .map(lab => ({ ...lab,x: 10,y: 10,free: 3000-lab.amount,cooldown: 0,reactionAmount: 5 }));
  generateNativeLabTransport(state,room,assignment,labs,15,{ ...defaults,storageFreeReserve: 100,labSupplyReserve: 50 });
  const requests = createLogisticsRequests(state,'home').pending(1);
  expect(requests.map(request => request.quantity)).toEqual(quantity ? [quantity] : []);
});
