import { createStaticCostMatrix } from '../../../adapters/screeps/static-cost-matrix';
import type { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import { retainedRemoteCosts } from './retained-costs';
import type { RemoteEstimateContext } from '../../../features/remotes/assessment-model';
export function prepareRemoteMatrices(context: RemoteEstimateContext, rooms: readonly string[], roadCost: number,
  snapshots: ReturnType<typeof createMatrixSnapshots>) {
  const visible = rooms.filter(room => Game.rooms[room]), live = snapshots.prepare(visible,{ roadCost,avoidUnits: false });
  const retained = new Map<string,ReturnType<typeof createStaticCostMatrix>>();
  for (const room of rooms.filter(room => !Game.rooms[room])) {
    const summary = context.intel(room).summary;
    if (!summary) throw new Error('Missing admitted remote room facts');
    retained.set(room,createStaticCostMatrix(retainedRemoteCosts(summary),roadCost));
  }
  return { version: JSON.stringify([live.version,[...retained].map(([room,value]) => [room,value.version])]),
    matrix: (room: string) => live.matrix(room) ?? retained.get(room)?.matrix.clone() ?? false };
}
