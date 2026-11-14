import { stationInfrastructure } from './mining-station-infrastructure';
import type { MiningStation } from '../../capabilities/mining/station';
import { adjacentWorkTiles } from '../../capabilities/movement/work-tiles';
import type { Position } from '../../capabilities/movement/step';
import { observeCostMatrix } from './cost-matrix';
import { movementPosition } from './movement-traffic';
function accessTiles(position: Position, matrix: CostMatrix): Position[] {
  const terrain = Game.map.getRoomTerrain(position.room);
  return adjacentWorkTiles(position).filter(tile => {
    const cost = matrix.get(tile.x, tile.y);
    return cost !== 255 && (cost > 0 || (terrain.get(tile.x, tile.y) & TERRAIN_MASK_WALL) === 0);
  });
}
/** Undefined means no vision, not an empty resource list. Risk and mineral throughput are assessment inputs. */
export function observeMiningStations(roomName: string, risk: MiningStation['risk'], mineralThroughput = 0): MiningStation[] | undefined {
  const room = Game.rooms[roomName];
  if (!room) return undefined;
  const matrix = observeCostMatrix(roomName, { roadCost: 1, avoidUnits: false }).matrix!;
  const structures = room.find(FIND_STRUCTURES).sort((a, b) => a.id.localeCompare(b.id));
  const targets: (Source | Mineral)[] = [...room.find(FIND_SOURCES), ...room.find(FIND_MINERALS)];
  return targets.map(target => {
    const position = movementPosition(target.pos);
    const access = accessTiles(position, matrix);
    const energy = 'energy' in target;
    return {
      id: target.id, target: target.id, kind: energy ? 'energy' : 'mineral', resource: energy ? RESOURCE_ENERGY : target.mineralType,
      position, ...stationInfrastructure(access, target.pos, structures), risk,
      throughput: energy ? target.energyCapacity / ENERGY_REGEN_TIME : mineralThroughput,
      available: energy ? target.energy : target.mineralAmount, observedAt: Game.time,
      readyAt: Game.time + (target.ticksToRegeneration ?? 0),
    };
  });
}

