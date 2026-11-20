import { expect, test } from 'vitest';
import { createLabAllocationOperator } from '../../src/features/operator/lab-allocation';
import type { LabAllocationRoom } from '../../src/features/operator/lab-allocation';
const request = { resource: 'XGH2O',mineral: 60,energy: 40 };
const room: LabAllocationRoom = { anchor: { x: 9,y: 9 },labs: [{ id: 'near',x: 10,y: 10 },{ id: 'a',x: 11,y: 10 },{ id: 'b',x: 10,y: 11 },{ id: 'c',x: 11,y: 11 }] };
function fixture() { return createLabAllocationOperator({ room: () => room,settings: () => ({ labReactionsEnabled: true,labReservedIds: [] }),supported: resource => resource === 'XGH2O' }); }
test('operator defaults to preserving configured reaction policy but permits an explicit role-only tradeoff',() => {
  const preview = fixture(); expect(preview('W0N1',[request])).toMatchObject({ ok: true,preserveReactions: true,plan: { roles: [{ lab: 'near' }] } });
  expect(preview('W0N1',[request,request])).toEqual({ ok: false,reason: 'insufficient-compatible-labs' });
  expect(preview('W0N1',[request,request],{ preserveReactions: false })).toMatchObject({ ok: true,plan: { roles: [{ lab: 'near' },{ lab: 'a' }] } });
});
test('manual exclusions, absent spawns and unowned rooms remain explicit rather than producing partial allocation',() => {
  const excluded = createLabAllocationOperator({ room: () => room,settings: () => ({ labReactionsEnabled: true,labReservedIds: ['near'] }),supported: () => true });
  expect(excluded('W0N1',[request])).toEqual({ ok: false,reason: 'insufficient-compatible-labs' });
  const noSpawn = createLabAllocationOperator({ room: () => ({ ...room,anchor: null }),settings: () => ({}),supported: () => true });
  expect(noSpawn('W0N1',[request])).toEqual({ ok: false,reason: 'spawn-unavailable' }); expect(noSpawn('W0N1',[])).toMatchObject({ ok: true,plan: { roles: [] } });
  expect(() => createLabAllocationOperator({ room: () => null,settings: () => ({}),supported: () => true })('W0N1',[request])).toThrow('owned');
});
test('invalid effects, buffer bounds and unsupported options refuse',() => {
  const preview = fixture(); expect(() => preview('W0N1',[{ ...request,resource: 'H' }])).toThrow('Unsupported');
  expect(() => preview('W0N1',[{ ...request,energy: 2001 }])).toThrow('Invalid requested');
  expect(() => preview('W0N1',[request],{ preserveReactions: 'yes' } as never)).toThrow('reaction preservation');
  expect(() => preview('W0N1',[request],[] as never)).toThrow('option');
  expect(() => preview('W0N1',[{ ...request,lab: 'ignored' }] as never)).toThrow('Invalid requested');
});
