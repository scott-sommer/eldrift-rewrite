import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { scavengerOwner, haulingOwner } from '../../src/features/logistics/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { recoveryEnabled: true, recoveryInterval: 1 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const units = Object.values(Game.creeps);
  const room = Game.rooms['W0N1']!;
  const raw = state.read('logistics-requests/W0N1') as { data: { records: { request: { owner: string }; receipts: { amount: number }[] }[] } };
  const row = {
    energyCapacity: room.energyCapacityAvailable,
    scavengers: units.filter(unit => unit.memory.population?.owner === scavengerOwner(room.name))
      .map(unit => ({ parts: unit.body.length, spawning: unit.spawning })),
    miners: units.filter(unit => !unit.spawning && unit.memory.population?.owner.startsWith('mining:')).length,
    couriers: units.filter(unit => !unit.spawning && unit.memory.population?.owner === haulingOwner(room.name)).length,
    queued: createSpawnQueue(state, room.name).list().filter(request => request.owner === scavengerOwner(room.name) && !Game.creeps[request.name])
      .map(request => ({ parts: request.body.length, priority: request.priority })),
    tombEnergy: room.find(FIND_TOMBSTONES)[0]!.store.energy,
    consumerDelivered: raw.data.records.filter(record => record.request.owner === haulingOwner(room.name))
      .flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0),
    delivered: raw.data.records.flatMap(record => record.receipts).reduce((sum, receipt) => sum + receipt.amount, 0),
  };
  const memory = Memory as Memory & { recoveryScavengerSpawn?: (typeof row)[] };
  (memory.recoveryScavengerSpawn ??= []).push(row);
}
