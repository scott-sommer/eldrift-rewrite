import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import type { IntentResult } from '../core/execution/action-arbiter';
import { createGroundJournal } from '../features/logistics/ground-journal';
import { groundStock, observeGroundRelease } from '../adapters/screeps/ground-observation';
import { movementPosition } from '../adapters/screeps/movement-traffic';
const slots = ['drop', 'move', 'primary-work', 'upgradeController', 'transfer', 'withdraw', 'pickup'];
/** Drop is exclusive for this tick; journal ownership survives reconstruction of the action arbiter. */
export function createNativeGroundDelivery(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>) {
  return {
    settle(unit: string) {
      const journal = createGroundJournal(state, unit);
      const current = journal.read();
      return current.attempt ? journal.settle(observeGroundRelease(current.attempt), ENERGY_DECAY) : null;
    },
    issue(creep: Creep, owner: string, id: string, resource: ResourceConstant, amount: number): IntentResult {
      if (!creep.my || creep.spawning || !Number.isSafeInteger(amount) || amount <= 0 || amount > creep.store.getUsedCapacity(resource)) {
        return { status: 'rejected', code: ERR_INVALID_ARGS };
      }
      const journal = createGroundJournal(state, creep.id);
      const previous = journal.read();
      if (previous.attempt && (!previous.acknowledged || previous.attempt.tick >= Game.time)) return { status: 'blocked', reason: 'action-conflict' };
      const attempt = { id, unit: creep.id, resource, amount, tick: Game.time, position: movementPosition(creep.pos),
        cargoBefore: creep.store.getUsedCapacity(resource), hitsBefore: creep.hits, groundBefore: groundStock(creep.pos, resource) };
      return dispatch.arbiter.issue(creep.name, owner, slots, () => {
        if (!journal.begin(attempt)) return ERR_BUSY;
        return creep.drop(resource, amount);
      }, code => code === OK);
    },
  };
}
