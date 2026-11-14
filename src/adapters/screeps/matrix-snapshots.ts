import { observeCostMatrix } from './cost-matrix';
import type { MatrixOptions } from './cost-matrix';
type Observation = ReturnType<typeof observeCostMatrix>;
/** Shared tick snapshots; occupancy variants are isolated by mover identity. */
export function createMatrixSnapshots(observe = observeCostMatrix, clock = () => Game.time) {
  let tick: number | undefined;
  const snapshots = new Map<string, Observation>();
  function get(room: string, options: MatrixOptions): Observation {
    const now = clock();
    if (now !== tick) { snapshots.clear(); tick = now; }
    const key = JSON.stringify([room, options.roadCost, options.avoidUnits, options.avoidUnits ? options.ignoreUnitId : undefined]);
    let result = snapshots.get(key);
    if (!result) {
      result = observe(room, options);
      snapshots.set(key, result);
    }
    return result;
  }
  return {
    prepare(rooms: readonly string[], options: MatrixOptions) {
      const entries = [...new Set(rooms)].sort().map(room => [room, get(room, options)] as const);
      const matrices = new Map(entries);
      return {
        version: JSON.stringify(entries.map(([room, value]) => [room, value.version])),
        matrix: (room: string) => matrices.get(room)?.matrix?.clone(),
      };
    },
  };
}
