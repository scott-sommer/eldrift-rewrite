const assert = require('node:assert/strict');
async function largeDropWorld(server, bot) {
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'spawn' }, { $set: { store: { energy: 0 } } });
  await server.world.addRoomObject('W0N1', 'energy', 16, 16, { energy: 1000, resourceType: 'energy' });
  await server.world.addRoomObject('W0N1', 'creep', 16, 15, {
    name: 'hauler', user: bot.id, body: [...Array(5).fill('carry'), ...Array(5).fill('move')].map(type => ({ type, hits: 100 })),
    store: { energy: 0 }, storeCapacity: 250, hits: 1000, hitsMax: 1000, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyLargeDrop(memory) {
  assert.deepEqual(memory.energySupply, [[0, 0], [0, 0], [250, 1], [0, 252], [0, 253]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 1);
  assert.equal(records[0].request.quantity, 250);
  assert.deepEqual(records[0].receipts.map(item => item.amount), [250]);
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { largeDropWorld, verifyLargeDrop };
