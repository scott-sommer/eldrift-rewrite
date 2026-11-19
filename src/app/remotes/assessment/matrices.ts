import { createStaticCostMatrix } from '../../../adapters/screeps/static-cost-matrix';
import type { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import { retainedRemoteCosts } from './retained-costs';
import type { RemoteEstimateContext } from '../../../features/remotes/assessment-model';
export function prepareRemoteMatrices(context: Pick<RemoteEstimateContext, 'intel'>, rooms: readonly string[], roadCost: number,
  snapshots: ReturnType<typeof createMatrixSnapshots>) {
  const visible = rooms.filter(room => Game.rooms[room]), live = snapshots.prepare(visible,{ roadCost,avoidUnits: false });
  const retained = new Map<string,ReturnType<typeof createStaticCostMatrix>>();
  for (const room of rooms.filter(room => !Game.rooms[room])) {
    const summary = context.intel(room).summary;
    if (!summary) throw new Error('Missing admitted remote room facts');
    retained.set(room,createStaticCostMatrix(retainedRemoteCosts(summary),roadCost));
  }
  const versions = [...new Set(rooms)].sort().map(room => [room,live.versionFor(room) ?? room+':'+retained.get(room)!.version]);
  return { version: JSON.stringify(versions),
    matrix: (room: string) => live.matrix(room) ?? retained.get(room)?.matrix.clone() ?? false };
}
