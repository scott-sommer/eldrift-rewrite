import type { RoomSummary } from '../features/intel/model';
import type { CostObservation } from '../capabilities/movement/costs';
/** Unknown public-rampart state is conservative; live rooms use the shared native snapshot instead. */
export function retainedRemoteCosts(summary: RoomSummary): CostObservation {
  const obstacles = summary.structures.filter(structure => structure.type === 'rampart' ? !structure.owned
    : (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(structure.type)).map(item => ({ x: item.x,y: item.y }));
  obstacles.push(...summary.sources.map(item => ({ x: item.x,y: item.y })));
  if (summary.mineral) obstacles.push({ x: summary.mineral.x,y: summary.mineral.y });
  if (summary.controller) obstacles.push({ x: summary.controller.x,y: summary.controller.y });
  return { roads: summary.structures.filter(structure => structure.type === 'road').map(item => ({ x: item.x,y: item.y })),
    obstacles, units: [] };
}
