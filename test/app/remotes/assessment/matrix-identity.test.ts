import { intelSchema } from '../../../../src/features/intel/schema';
import { afterEach, expect, test, vi } from 'vitest';
import { prepareRemoteMatrices } from '../../../../src/app/remotes/assessment/matrices';
import { createMatrixSnapshots } from '../../../../src/adapters/screeps/matrix-snapshots';
import { createStaticCostMatrix } from '../../../../src/adapters/screeps/static-cost-matrix';
import { intelSummary } from '../../../fixtures/intel-summary';
vi.mock('../../../../src/adapters/screeps/static-cost-matrix',() => ({ createStaticCostMatrix: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
test('equal live and retained static topology keeps one quote identity across lost and restored vision',() => {
  vi.stubGlobal('OBSTACLE_OBJECT_TYPES',[]); vi.stubGlobal('Game',{ rooms: { E0N1: {} } });
  let tick = 1; const matrix = { clone: () => ({ get: () => 0 }) } as unknown as CostMatrix;
  const snapshots = createMatrixSnapshots(room => ({ visible: true,version: room+':same-cells',matrix }),() => tick);
  vi.mocked(createStaticCostMatrix).mockReturnValue({ matrix,version: 'same-cells' });
  const context = { intel: () => ({ ...intelSchema('E0N1').initial(),summary: intelSummary(1,'E0N1') }) };
  const seen = prepareRemoteMatrices(context,['E0N1'],1,snapshots); Game.rooms = {}; tick++;
  const retained = prepareRemoteMatrices(context,['E0N1'],1,snapshots); expect(retained.version).toBe(seen.version);
  Game.rooms.E0N1 = {} as Room; tick++;
  expect(prepareRemoteMatrices(context,['E0N1'],1,snapshots).version).toBe(seen.version);
});
test('a genuine retained obstacle difference changes topology instead of being hidden by visibility normalization',() => {
  vi.stubGlobal('OBSTACLE_OBJECT_TYPES',[]); vi.stubGlobal('Game',{ rooms: {} });
  const matrix = { clone: () => ({ get: () => 0 }) } as unknown as CostMatrix;
  const snapshots = createMatrixSnapshots(() => ({ visible: false,version: 'unseen',matrix: undefined }),() => 1);
  const context = { intel: () => ({ ...intelSchema('E0N1').initial(),summary: intelSummary(1,'E0N1') }) };
  vi.mocked(createStaticCostMatrix).mockReturnValueOnce({ matrix,version: 'before' }).mockReturnValueOnce({ matrix,version: 'after' });
  expect(prepareRemoteMatrices(context,['E0N1'],1,snapshots).version).not.toBe(prepareRemoteMatrices(context,['E0N1'],1,snapshots).version);
});
