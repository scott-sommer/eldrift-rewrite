import { afterEach, expect, test, vi } from 'vitest';
import { createNativeIndustryOperator } from '../../src/app/native-industry-operator';
afterEach(() => vi.unstubAllGlobals());
test('public operator composition reads no game constants or memory until a command is invoked',() => {
  const commands = createNativeIndustryOperator(); expect(Object.keys(commands.boosts).sort()).toEqual(['acknowledge','aliases','cancel','get','list','request']);
});
test('native command binds current owned population identity and validates compound catalog',() => {
  vi.stubGlobal('Memory',{}); vi.stubGlobal('BOOSTS',{ work: { XGH2O: {} } });
  const creep = { id: 'actual-id',name: 'worker',my: true,spawning: false,memory: { population: { owner: 'work:W0N1:upgrader',home: 'W0N1' } },body: [{ type: 'work',hits: 100 }] };
  vi.stubGlobal('Game',{ time: 1,creeps: { worker: creep } }); const api = createNativeIndustryOperator().boosts;
  expect(api.request('worker',[{ part: 'work',resource: 'XGH2O',count: 1 }],{ id: 'manual',expiresAt: 20,required: true }).job).toMatchObject({ readiness: 'waiting',request: { unit: 'actual-id',owner: 'work:W0N1:upgrader' } });
  expect(() => api.request('worker',[{ part: 'work',resource: 'H',count: 1 }],{ id: 'bad',expiresAt: 20,required: true })).toThrow('Unsupported');
  creep.my = false; expect(() => api.aliases('worker',['upgrade'],{ id: 'other',expiresAt: 20,required: true })).toThrow('Owned');
});
