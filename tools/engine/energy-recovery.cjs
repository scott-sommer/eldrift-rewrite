const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { workSelectionWorld } = require('./work-selection.cjs');
async function energyRecoveryWorld(server, bot) {
  await workSelectionWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 6 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { store: { energy: 0 } } });
  await server.world.addRoomObject('W0N1', 'storage', 25, 21, {
    user: bot.id, store: { energy: 10000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
  await server.world.addRoom('W0N0');
  await server.world.setTerrain('W0N0', new TerrainMatrix());
  await db['rooms.objects'].removeWhere({ room: 'W0N0', type: 'controller' });
  await server.world.addRoomObject('W0N0', 'controller', 20, 20, { user: bot.id, level: 6, progress: 0, downgradeTime: 20000 });
  await server.world.addRoomObject('W0N0', 'storage', 21, 20, {
    user: bot.id, store: { energy: 80000 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
}
async function changeRecoveryEnergy(server, tick) {
  const energy = [10000, 9999, 20000, 49999, 50000, 10000, 9999, 9999][tick];
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'storage' }, { $set: { store: { energy } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { downgradeTime: tick === 3 ? Number(await server.world.gameTime) + 100 : 20000 } });
}
function verifyEnergyRecovery(memory) {
  const rows = memory.energyRecovery;
  assert.deepEqual(rows.map(row => row.active), [false, true, true, true, false, false, true, false]);
  assert.deepEqual(rows.map(row => row.energy), [10000, 9999, 20000, 49999, 50000, 10000, 9999, 9999]);
  assert.deepEqual(rows.map(row => row.progress), [0, 1, 1, 1, 2, 3, 4, 4]);
  assert.deepEqual(rows.map(row => row.pending), [1, 0, 0, 0, 1, 1, 0, 1]);
  for (const row of rows) assert.deepEqual(row.donors, row.active ? ['W0N0'] : []);
}
module.exports = { energyRecoveryWorld, changeRecoveryEnergy, verifyEnergyRecovery };
