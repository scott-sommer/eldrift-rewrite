const assert = require('node:assert/strict');
async function linkContentionWorld(server, bot) {
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { level: 8 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'source' }, { $set: { x: 10, y: 10 } });
  await server.world.addRoomObject('W0N1', 'storage', 20, 20, { user: bot.id, store: { energy: 0 }, storeCapacity: 1000000, hits: 10000, hitsMax: 10000 });
  for (const [x, y, energy] of [[9, 10, 800], [19, 20, 0]]) {
    await server.world.addRoomObject('W0N1', 'link', x, y, { user: bot.id, store: { energy }, storeCapacityResource: { energy: 800 }, cooldown: 0, hits: 1000, hitsMax: 1000 });
  }
  for (const [x, energy] of [[8, 0], [18, 50]]) {
    await server.world.addRoomObject('W0N1', 'container', x, x === 8 ? 10 : 20, { store: { energy }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
  }
  for (const [name, x, y] of [['collector', 8, 8], ['supplier', 18, 19]]) {
    await server.world.addRoomObject('W0N1', 'creep', x, y, { name, user: bot.id,
      body: ['carry', 'move'].map(type => ({ type, hits: 100 })), store: { energy: 0 }, storeCapacity: 50,
      hits: 200, hitsMax: 200, spawning: false, fatigue: 0, ageTime: 1500 });
  }
}
function verifyLinkContention(memory) {
  assert.deepEqual(memory.linkContention, [[800, 0, 0, 0, 0], [800, 0, 0, 50, 0], [0, 777, 50, 0, 0], [0, 777, 0, 0, 50]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  for (const record of records) assert.deepEqual(record.receipts.map(receipt => receipt.amount), [50]);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { linkContentionWorld, verifyLinkContention };

