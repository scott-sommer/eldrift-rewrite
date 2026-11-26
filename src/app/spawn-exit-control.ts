import { pendingSpawnExits } from '../adapters/screeps/spawn-exits';
import { createOwnedTileClearance } from './owned-tile-clearance';
import type { createActionArbiter } from '../core/execution/action-arbiter';
import type { createMovementService } from '../adapters/screeps/movement-service';
export function spawnExitTiles() { return pendingSpawnExits().map(exit => ({ owner: 'spawn-exit:'+exit.spawn,position: exit.position,allowed: [exit.name] })); }
export function createSpawnExitControl(arbiter: ReturnType<typeof createActionArbiter>, movement: Pick<ReturnType<typeof createMovementService>,'move'>) {
  return createOwnedTileClearance(arbiter,movement,spawnExitTiles);
}
