import { createNativeUpgradeSupplyCycle } from '../../src/app/native-upgrade-supply-cycle';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
import { createGroundJournal } from '../../src/features/logistics/ground-journal';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
const state = createMemoryPort(() => Memory);
const dispatch = createNativeDispatch(state);
const cycle = createNativeUpgradeSupplyCycle(state, dispatch);
export function loop() {
  openState(state, 'operator/config', operatorSchema);
  const creep = Game.creeps.support!;
  creep.memory.population ??= { owner: upgradeSupplyOwner('W0N1', 'E0N1'), home: 'W0N1' };
  if (Game.creeps.master) Game.creeps.master.memory.population = { owner: 'upgrade-master:E0N1', home: 'E0N1' };
  const outcome = cycle.run(creep, { home: 'W0N1', target: 'E0N1', anchor: { room: 'E0N1', x: 2, y: 20 }, reserve: 70, active: Game.time < 12 });
  dispatch.flush();
  const target = Game.rooms.E0N1!;
  const row = { tick: Game.time, outcome, owner: creep.memory.population.owner, cargo: creep.store.energy, room: creep.pos.roomName,
    source: Game.rooms.W0N1!.storage!.store.energy, storage: target.storage!.store.energy, master: Game.creeps.master?.store.energy ?? 0,
    ground: target.find(FIND_DROPPED_RESOURCES).filter(item => item.resourceType === 'energy').reduce((sum, item) => sum + item.amount, 0),
    drop: createGroundJournal(state, creep.id).read(), transfer: createTransferJournal(state, creep.id).read() };
  const memory = Memory as Memory & { supplyCycle?: (typeof row)[] };
  (memory.supplyCycle ??= []).push(row);
}
