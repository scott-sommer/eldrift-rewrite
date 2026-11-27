import type { Position } from '../../../../../capabilities/movement/step';
import type { prepareRemoteMatrices } from '../../../assessment/matrices';
import type { MotionGeometryEnvironment } from './model';
type PreparedMatrices = ReturnType<typeof prepareRemoteMatrices>;
/** One private matrix clone per room per compilation; no mutable matrix escapes. */
export function nativeMotionEnvironment(matrices: PreparedMatrices,rooms: readonly string[]): MotionGeometryEnvironment {
  const admitted = new Set(rooms),saved = new Map<string,ReturnType<PreparedMatrices['matrix']>>();
  return { topology: matrices.version,rate: position => observeRate(position,admitted,saved,matrices) };
}
function observeRate(position: Position,rooms: ReadonlySet<string>,saved: Map<string,ReturnType<PreparedMatrices['matrix']>>,matrices: PreparedMatrices): 1 | 2 | 10 | undefined {
  if (!rooms.has(position.room)) return undefined;
  const matrix = saved.get(position.room) ?? matrices.matrix(position.room); saved.set(position.room,matrix);
  if (!matrix || matrix.get(position.x,position.y) === 255) return undefined;
  const terrain = Game.map.getRoomTerrain(position.room).get(position.x,position.y);
  if (terrain & TERRAIN_MASK_WALL) return undefined;
  return matrix.get(position.x,position.y) === 1 ? 1 : terrain & TERRAIN_MASK_SWAMP ? 10 : 2;
}
