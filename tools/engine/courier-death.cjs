const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function courierDeathWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 19 }, { $set: { store: { energy: 50 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'hauler' }, { $set: { name: 'a-hauler', x: 17, y: 20 } });
  await server.world.addRoomObject('W0N1', 'creep', 20, 19, { name: 'z-hauler', user: bot.id,
    body: ['carry', 'move'].map(type => ({ type, hits: 100 })), store: { energy: 0 }, storeCapacity: 50,
    hits: 200, hitsMax: 200, spawning: false, fatigue: 0, ageTime: 1500 });
}
function verifyCourierDeath(memory) {
  assert.deepEqual(memory.courierDeath, [[50, 0, 0, 1], [50, 0, 0, 0], [0, 50, 0, 0], [0, 0, 50, 0]]);
  const records = memory.eldrift.records;
  assert.deepEqual(records['tasks/a-hauler'].data.queue, []);
  assert.deepEqual(records['tasks/z-hauler'].data.queue, []);
  assert.deepEqual(records['quantity-reservations/empire'].data.claims, []);
  assert.equal(records['logistics-requests/W0N1'].data.records.length, 1);
  assert.deepEqual(records['logistics-requests/W0N1'].data.records[0].receipts.map(receipt => receipt.amount), [50]);
}
module.exports = { courierDeathWorld, verifyCourierDeath };
