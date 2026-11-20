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
