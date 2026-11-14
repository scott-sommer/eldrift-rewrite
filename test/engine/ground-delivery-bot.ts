import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createNativeGroundDelivery } from '../../src/app/native-ground-delivery';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createGroundJournal } from '../../src/features/logistics/ground-journal';
export function loop() {
  const state = createMemoryPort(() => Memory);
  openState(state, 'operator/config', operatorSchema);
  const creep = Game.creeps.dropper!;
  const delivery = createNativeGroundDelivery(state, createNativeDispatch(state));
  const result = delivery.settle(creep.id);
  const issued = Game.time === 1 ? delivery.issue(creep, 'ground-test', 'release', 'energy', 50) : null;
  const duplicate = Game.time === 1 ? createNativeGroundDelivery(state, createNativeDispatch(state)).issue(creep, 'ground-test', 'duplicate', 'energy', 50) : null;
  const row = { tick: Game.time, cargo: creep.store.energy, result, issued, duplicate, journal: createGroundJournal(state, creep.id).read(),
    ground: creep.pos.lookFor(LOOK_RESOURCES).reduce((sum, item) => sum + item.amount, 0) };
  const memory = Memory as Memory & { groundDelivery?: (typeof row)[] };
  (memory.groundDelivery ??= []).push(row);
}
