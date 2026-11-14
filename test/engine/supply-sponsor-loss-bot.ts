import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { E0N1: { override: { upgradeRoomEnabled: true, upgradeSupplyEnabled: true,
    upgradeRoomSponsor: 'W0N1', upgradeSupplyTarget: 1, upgradeSupplyReserve: 70,
    upgradeFleetStartEnergy: 50, upgradeFleetStopEnergy: 10, logisticsEnabled: Game.time >= 10 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  const creep = Game.creeps.support!;
  creep.memory.population ??= { home: 'W0N1', owner: upgradeSupplyOwner('W0N1', 'E0N1') };
  botLoop();
  const row = { tick: Game.time, room: creep.room.name, home: creep.memory.population.home,
    owner: creep.memory.population.owner, recovery: creep.memory.upgradeSupplyRecovery ?? null, cargo: creep.store.energy,
    source: Game.rooms.W0N1!.storage?.store.energy ?? 0, target: Game.rooms.E0N1!.storage!.store.energy,
    ground: Object.values(Game.rooms).flatMap(room => room.find(FIND_DROPPED_RESOURCES)).reduce((sum, pile) => sum + pile.amount, 0),
    transfer: createTransferJournal(state, creep.id).read() };
  const memory = Memory as Memory & { sponsorLoss?: (typeof row)[] };
  (memory.sponsorLoss ??= []).push(row);
}
