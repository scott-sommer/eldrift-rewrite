import { expect, test, vi } from 'vitest';
import { createBulkLabAllocation } from '../../src/features/operator/lab-bulk-allocation';
import { createLabAllocationOperator } from '../../src/features/operator/lab-allocation';
const buffer = [{ resource: 'XGH2O',mineral: 60,energy: 40 }];
function fixture() {
  let failed = false; const configure = vi.fn((changes: readonly { home: string; input: unknown }[]) => ({ changed: true,homes: changes.map(change => change.home) }));
  const preview = createLabAllocationOperator({ supported: () => true,settings: () => ({}),room: home => home === 'W1N1' && failed ? null : { anchor: { x: 10,y: 10 },labs: [{ id: home+'lab',x: 11,y: 11 }] } });
  return { api: createBulkLabAllocation(preview,configure),configure,fail: () => { failed = true; } };
}
test('bulk preview is read-only and apply sends every complete plan in one configuration call in stable room order',() => {
  const f = fixture(); expect(f.api.previewBoostRolesForRooms(['W1N1','W0N1'],buffer).ok).toBe(true); expect(f.configure).not.toHaveBeenCalled();
  const result = f.api.assignBoostRolesForRooms(['W1N1','W0N1'],buffer); expect(result.ok).toBe(true); expect(f.configure).toHaveBeenCalledTimes(1);
  expect(f.configure.mock.calls[0]![0]).toEqual([{ home: 'W0N1',input: { labBoostRoles: [{ ...buffer[0],lab: 'W0N1lab' }] } },{ home: 'W1N1',input: { labBoostRoles: [{ ...buffer[0],lab: 'W1N1lab' }] } }]);
});
test('one rejected room prevents application everywhere and retains a per-room reason',() => {
  const f = fixture(); f.fail(); const result = f.api.assignBoostRolesForRooms(['W0N1','W1N1'],buffer);
  expect(result.ok).toBe(false); expect(f.configure).not.toHaveBeenCalled(); expect(result.rooms[1]!.result).toMatchObject({ ok: false,reason: 'rejected',message: 'Visible owned room is required' });
});
