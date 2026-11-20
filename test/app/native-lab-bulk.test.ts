import { afterEach, expect, test, vi } from 'vitest';
import { createNativeLabAllocation } from '../../src/app/native-lab-allocation';
import type { createLabOperator } from '../../src/features/operator/labs';
afterEach(() => vi.unstubAllGlobals());
test('all-room helper selects owned RCL6+ rooms deterministically without depending on username',() => {
  vi.stubGlobal('Game',{ rooms: Object.fromEntries([['W2N1',true,7],['W0N1',true,6],['W1N1',true,5],['W3N1',false,8]].map(([name,my,level]) => [name,{ name,controller: { my,level },find: () => [] }])) });
  vi.stubGlobal('FIND_MY_SPAWNS',1); vi.stubGlobal('FIND_MY_STRUCTURES',2);
  const configureMany = vi.fn(() => ({ changed: true,homes: ['W0N1','W2N1'] }));
  const commands = { inspect: () => ({ values: {} }),configureMany } as unknown as ReturnType<typeof createLabOperator>;
  const api = createNativeLabAllocation(commands), preview = api.previewAllBoostRoles([]);
  expect(preview.ok).toBe(true); expect(preview.rooms.map(room => room.home)).toEqual(['W0N1','W2N1']); expect(configureMany).not.toHaveBeenCalled();
  expect(api.assignAllBoostRoles([]).ok).toBe(true);
  expect(configureMany).toHaveBeenCalledExactlyOnceWith([{ home: 'W0N1',input: { labBoostRoles: [] } },{ home: 'W2N1',input: { labBoostRoles: [] } }]);
});
