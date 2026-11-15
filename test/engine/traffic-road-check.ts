import { connectTrafficBatch } from '../../src/capabilities/planning/traffic-road-batch';
import { connectTrafficRoads } from '../../src/capabilities/planning/traffic-roads';
import { planningRoadSearch } from '../../src/adapters/screeps/planning-road-search';
export function verifyTrafficRoads(): void {
  const costs = Array<number>(2500).fill(255);
  for (let x = 10; x <= 15; x++) for (const y of [10, 11]) costs[y * 50 + x] = 2;
  const request = { start: { x: 10, y: 10 }, targets: [{ id: 'source', position: { x: 15, y: 10 } }],
    roads: [], traversable: (tile: { x: number; y: number }) => costs[tile.y * 50 + tile.x]! < 255,
    buildable: () => true, search: planningRoadSearch('W0N1', costs) };
  const dual = connectTrafficRoads(request);
  if (!dual.ok || dual.lanes[0]?.secondaryCost === undefined) throw new Error('Missing native alternate lane');
  const first = connectTrafficBatch(request, 'native-v1', undefined, 1);
  const resumed = connectTrafficBatch(request, 'native-v1', JSON.parse(JSON.stringify(first.checkpoint)), 1);
  if (!resumed.ok || !resumed.done || first.searches !== 1 || resumed.searches !== 1
    || JSON.stringify({ ok: true, roads: resumed.checkpoint.network.roads, lanes: resumed.checkpoint.lanes }) !== JSON.stringify(dual)) {
    throw new Error('Resumed native traffic roads diverged');
  }
  for (let x = 10; x <= 15; x++) costs[11 * 50 + x] = 255;
  const single = connectTrafficRoads({ ...request, search: planningRoadSearch('W0N1', costs) });
  if (!single.ok || single.lanes[0]?.secondaryFailure !== 'incomplete-search') throw new Error('Narrow corridor claimed redundancy');
}
