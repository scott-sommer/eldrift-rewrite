const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function cargoRecoveryWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
  await server.world.addRoomObject('W0N1', 'storage', 20, 19, {
    user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000,
  });
}
function verifyCargoRecovery(memory, expired = false, missed = false) {
  const expected = [[30, 0, 0, 0], [0, 30, 0, 0], [0, 30, 0, 0], [0, 0, 0, 30]];
  if (missed) expected.splice(2, 0, [0, 30, 0, 0]);
  assert.deepEqual(memory.cargoRecovery, expected);
  if (missed) {
    const incidents = Object.entries(memory.eldrift.records).filter(([key]) => key.startsWith('logistics-uncertainty/'));
    assert.equal(incidents.length, 1);
    assert.equal(incidents[0][1].data.entries.length, 1);
    assert.equal(incidents[0][1].data.entries[0].cargo, 30);
  }
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, expired ? 1 : 2);
  if (!expired) {
    assert.equal(records[0].cancelled, true);
    assert.deepEqual(records[0].receipts, []);
  }
  assert.deepEqual(records.at(-1).receipts.map(receipt => receipt.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { cargoRecoveryWorld, verifyCargoRecovery };



function verifyUnknownDelivery(memory) {
  assert.deepEqual(memory.cargoRecovery, [[30, 0, 0, 0], [0, 30, 0, 0], [0, 0, 30, 0], [0, 0, 30, 0], [0, 0, 30, 0]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.equal(records[0].cancelled, true);
  assert.deepEqual(records[0].receipts, []);
  const incident = Object.entries(memory.eldrift.records).find(([key]) => key.startsWith('logistics-uncertainty/'))[1].data.entries[0];
  assert.equal(incident.attempt.kind, 'transfer');
  assert.equal(incident.cargo, 0);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports.verifyUnknownDelivery = verifyUnknownDelivery;
