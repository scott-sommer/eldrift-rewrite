import type { StatePort } from '../../src/persistence/versioned-state';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
/** Controlled foreign claim; no synthetic delivery credit or actual courier is implied. */
export function upgradeBoostContention(state: StatePort): boolean {
  if (!Game.flags.boostContention) return false;
  const claims = createQuantityReservations(state), lab = Game.rooms.W0N1!.find(FIND_MY_STRUCTURES).find(item => item.structureType === STRUCTURE_LAB)!;
  if (Game.time === 1) {
    const pool = logisticsPool('capacity',lab.id,'mineral');
    if (!claims.reserve({ id: 'specialist-contention',owner: 'fixture-supplier',holder: 'fixture',scope: 'fixture-upgrade-contention',expiresAt: 40,allocations: [{ pool,amount: 1 }] },{ [pool]: 3000 },Game.time)) throw new Error('Foreign claim fixture admission failed');
  }
  if (Game.time === 17) claims.releaseScope('fixture-upgrade-contention');
  return claims.list(Game.time).some(claim => claim.scope === 'fixture-upgrade-contention');
}
