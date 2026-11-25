import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { NativeLaborProof } from './native-labor-model';
/** A separate delivery owner books carry capacity before labor admission and settles its own effect. */
export function runIncomingLaborDelivery(state: StatePort, proof: NativeLaborProof, worker: Creep | undefined): void {
  if (!proof.incoming || !worker || worker.spawning) return;
  const donor = Game.creeps['labor-donor']!, ledger = createQuantityReservations(state), scope = 'fixture-incoming';
  if (Game.time === 10) {
    const pool = logisticsPool('capacity',worker.id), claim = { id: scope,owner: 'fixture-hauling',holder: donor.name,scope,expiresAt: 26,allocations: [{ pool,amount: 1 }] };
    if (!ledger.reserve(claim,{ [pool]: worker.store.getFreeCapacity(RESOURCE_ENERGY) },Game.time)) throw new Error('Incoming fixture reservation refused');
    proof.incomingClaim = claim;
    const result = createCreepActions(donor,scope,createActionArbiter(() => Game.time)).transfer(worker,RESOURCE_ENERGY,1);
    if (result.status !== 'issued') throw new Error('Incoming fixture delivery refused');
    proof.calls.push({ tick: Game.time,action: 'incoming',energy: 1,code: result.code });
  }
  if (Game.time === 11) {
    if (donor.store.energy !== 0 || worker.store.energy !== 1 || JSON.stringify(ledger.list(Game.time).find(claim => claim.id === scope)) !== JSON.stringify(proof.incomingClaim)) throw new Error('Incoming owner or settled cargo changed');
    proof.incomingSettledAt = Game.time;
    ledger.releaseScope(scope);
  }
}
