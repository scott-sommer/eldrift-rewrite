const assert = require('node:assert/strict');
const { energyLogisticsWorld } = require('./energy-logistics.cjs');
async function remainsSupplyWorld(server, bot) {
  await energyLogisticsWorld(server, bot);
  await server.world.addRoomObject('W0N1', 'tombstone', 20, 19, {
    user: bot.id, store: { energy: 30 }, deathTime: 0, decayTime: 1000,
    creepId: 'dead-worker', creepName: 'dead-worker', creepBody: ['carry', 'move'], creepTicksToLive: 0,
  });
  await server.world.addRoomObject('W0N1', 'ruin', 20, 21, {
    store: { energy: 20 }, destroyTime: 0, decayTime: 1000,
    structure: { id: 'lost-container', type: 'container', hits: 0, hitsMax: 250000 },
  });
}
function verifyRemainsSupply(memory) {
  assert.deepEqual(memory.remainsSupply, [
    [30, 20, 0, 0, 30], [30, 20, 0, 0, 30], [0, 20, 30, 0, 30],
    [0, 20, 0, 30, 30], [0, 20, 0, 30, 30], [0, 0, 20, 30, 30], [0, 0, 0, 50, 30],
  ]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.deepEqual(records.map(record => record.receipts.map(receipt => receipt.amount)), [[30], [20]]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { remainsSupplyWorld, verifyRemainsSupply };
