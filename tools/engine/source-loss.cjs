const assert = require('node:assert/strict');
async function replaceEnergySource(server, index) {
  if (index !== 1) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container', x: 19 });
  await server.world.addRoomObject('W0N1', 'container', 19, 20, {
    store: { energy: 30 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
  });
}
function verifySourceLoss(memory) {
  assert.deepEqual(memory.energySupply, [[30, 0, 0], [30, 0, 0], [30, 0, 0], [0, 30, 0], [0, 0, 30], [0, 0, 30]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.notEqual(records[0].request.source, records[1].request.source);
  assert.equal(records[0].cancelled, true);
  assert.deepEqual(records[0].receipts, []);
  assert.deepEqual(records[1].receipts.map(item => item.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { replaceEnergySource, verifySourceLoss };
