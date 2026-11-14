const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function towerSupplyWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container', x: 21 });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 3 } });
  await server.world.addRoomObject('W0N1', 'tower', 21, 20, {
    user: bot.id, store: { energy: 390 }, storeCapacityResource: { energy: 1000 }, hits: 3000, hitsMax: 3000,
  });
}
function verifyTowerSupply(memory) {
  assert.deepEqual(memory.energySupply, [[30, 0, 390], [30, 0, 390], [0, 30, 390], [0, 0, 420], [0, 0, 420]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.equal(records[0].request.priority, 2);
  assert.deepEqual(records[0].receipts.map(item => item.amount), [30]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { towerSupplyWorld, verifyTowerSupply };
