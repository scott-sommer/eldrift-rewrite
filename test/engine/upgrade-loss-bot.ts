import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeOwner, upgradeMasterOwner } from '../../src/features/work/upgrade-identity';
import { upgradeRotationSchema } from '../../src/features/work/upgrade-rotation-schema';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { upgradeRoomEnabled: true, upgradeMasterEnabled: true, upgradeRoomServiceEnabled: true,
    upgradeRoomEmpireReserve: 0, upgradeRoomOtherReserve: 0 };
  saveState(state, 'operator/config', operatorSchema, settings);
  const room = Game.rooms.W0N1!;
  const units = Object.values(Game.creeps).sort((a, b) => a.name.localeCompare(b.name));
  for (const creep of units) creep.memory.population ??= { home: room.name,
    owner: creep.name === 'master' ? upgradeMasterOwner(room.name) : upgradeOwner(room.name) };
  if (Game.time === 1) {
    const schema = upgradeRotationSchema(room.name);
    const rotation = openState(state, 'upgrade-room/W0N1', schema);
    rotation.slots = units.filter(creep => creep.name !== 'master').map((creep, slot) => ({ unit: creep.id, slot }));
    saveState(state, 'upgrade-room/W0N1', schema, rotation);
  }
  botLoop();
  const hydrogenDelivered = openState(state, 'logistics-requests/W0N1', logisticsQueueSchema).records
    .filter(record => record.request.resource === 'H').flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0);
  const row = { tick: Game.time, hydrogenDelivered, owned: !!room.controller!.my, progress: room.controller!.progress,
    ownedRooms: Object.values(Game.rooms).filter(item => item.controller?.my).length,
    masterJournal: createTransferJournal(state, Game.creeps.master!.id).read(),
    units: units.map(creep => ({ name: creep.name, x: creep.pos.x, y: creep.pos.y,
      ttl: creep.ticksToLive, energy: creep.store.energy, owner: creep.memory.population!.owner })) };
  const memory = Memory as Memory & { upgradeLoss?: (typeof row)[] };
  (memory.upgradeLoss ??= []).push(row);
}
