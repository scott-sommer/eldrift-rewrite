import { afterEach, expect, test, vi } from 'vitest';
import { createNativeIndustryOperator } from '../../src/app/native-industry-operator';
afterEach(() => vi.unstubAllGlobals());
test('native lab commands require visible controller ownership and the actual reaction table',() => {
  vi.stubGlobal('Memory',{}); vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: { controller: { my: false },find: () => [] } } });
  vi.stubGlobal('REACTIONS',{ H: { O: 'OH' } }); vi.stubGlobal('FIND_MY_STRUCTURES',1); vi.stubGlobal('STRUCTURE_LAB','lab');
  const api = createNativeIndustryOperator().labs;
  expect(api.inspect('W0N1').owned).toBe(false); expect(() => api.configure('W0N1',{ labReactionProduct: 'OH' })).toThrow('owned');
  (Game.rooms.W0N1!.controller! as { my: boolean }).my = true;
  expect(() => api.configure('W0N1',{ labReactionProduct: 'H' })).toThrow('Unsupported');
  expect(api.configure('W0N1',{ labReactionProduct: 'OH',labReactionsEnabled: true }).values.labReactionProduct).toBe('OH');
});

test('empty native lab fields normalize to plain zero/null facts rather than throwing during inspection',() => {
  vi.stubGlobal('Memory',{}); vi.stubGlobal('FIND_MY_STRUCTURES',1); vi.stubGlobal('STRUCTURE_LAB','lab'); vi.stubGlobal('RESOURCE_ENERGY','energy');
  const lab = { id: 'empty',structureType: 'lab',isActive: () => true,store: { getUsedCapacity: () => 0 } };
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: { controller: { my: true },find: () => [lab] } } });
  expect(createNativeIndustryOperator().labs.inspect('W0N1').labs).toEqual([{ id: 'empty',active: true,mineral: null,amount: 0,energy: 0,cooldown: 0 }]);
});
