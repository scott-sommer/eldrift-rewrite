const assert = require('node:assert/strict');
const { energyLogisticsWorld } = require('./energy-logistics.cjs');
async function dropSupplyWorld(server, bot) {
  await energyLogisticsWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'energy', 20, 19, { energy: 1000, resourceType: 'energy' });
}
function verifyDropSupply(memory) {
  assert.deepEqual(memory.energySupply, [[30, 0, 0], [30, 0, 0], [30, 50, 0], [30, 0, 50], [30, 0, 50]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.equal(records[0].request.quantity, 50);
  assert.deepEqual(records[0].receipts.map(item => item.amount), [50]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { dropSupplyWorld, verifyDropSupply };
