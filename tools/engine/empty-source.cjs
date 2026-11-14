const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function emptySourceWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 19 }, { $set: { store: { energy: 100 } } });
  await server.world.addRoomObject('W0N1', 'container', 20, 19, {
    store: { energy: 20 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
}
async function drainSource(server, index) {
  if (index !== 1) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 19 }, { $set: { store: { energy: 0 } } });
}
function verifyEmptySource(memory) {
  assert.deepEqual(memory.emptySource, [[100, 20, 0, 0], [0, 20, 50, 0], [0, 20, 0, 50], [0, 20, 0, 50], [0, 0, 20, 50], [0, 0, 0, 70]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.deepEqual(records.map(record => record.receipts.reduce((sum, receipt) => sum + receipt.amount, 0)), [50, 20]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { emptySourceWorld, drainSource, verifyEmptySource };
