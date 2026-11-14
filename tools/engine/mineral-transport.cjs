const assert = require('node:assert/strict');
const { cargoRecoveryWorld } = require('./cargo-recovery.cjs');
async function mineralTransportWorld(server, bot) {
  await cargoRecoveryWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'mineral' });
  await server.world.addRoomObject('W0N1', 'mineral', 18, 20, { mineralType: 'H', mineralAmount: 1000, density: 1 });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 19 }, { $set: { store: { H: 50 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 21 }, { $set: { store: { H: 100 } } });
  await server.world.addRoomObject('W0N1', 'terminal', 21, 19, { user: bot.id, store: { energy: 249980 }, storeCapacity: 300000,
    hits: 3000, hitsMax: 3000, cooldownTime: 0 });
}
function verifyMineralTransport(memory) {
  assert.deepEqual(memory.mineralTransport.at(-1), [0, 0, 20, 30, 100, 50000]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(record => record.receipts.reduce((sum, item) => sum + item.amount, 0)).sort((a, b) => a - b), [20, 30]);
  assert.ok(records.every(record => record.request.resource === 'H' && !record.cancelled));
  assert.equal(new Set(records.map(record => record.request.sink)).size, 2);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
}
module.exports = { mineralTransportWorld, verifyMineralTransport };
