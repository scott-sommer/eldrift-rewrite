const assert = require('node:assert/strict');
const { resourceWorld } = require('./resources.cjs');
async function workSupplyWorld(server, bot) {
  await resourceWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' }, { $set: { x: 22, y: 20, level: 2 } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 19 }, { $set: { store: { energy: 50 } } });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'container', x: 21 }, { $set: { store: { energy: 1880 } } });
  await server.world.addRoomObject('W0N1', 'creep', 20, 21, {
    name: 'worker', user: bot.id, body: ['work', 'carry', 'move'].map(type => ({ type, hits: 100 })),
    store: { energy: 0 }, storeCapacity: 50, hits: 300, hitsMax: 300, spawning: false, fatigue: 0, ageTime: 1500,
  });
}
function verifyWorkSupply(memory) {
  const history = memory.workSupply;
  assert.deepEqual(history[0], [50, 0, 1880, 0]);
  assert.deepEqual(history.at(-1), [0, 0, 1900, 30]);
  assert.ok(history.some(row => row[2] === 1900 && row[3] === 0), 'controller reserve filled before worker');
  assert.ok(history.every(row => row[2] >= 1880 && row[2] <= 1900), 'controller reserve must not be drained or overfilled');
  assert.deepEqual(history.slice(-2), [[0, 0, 1900, 30], [0, 0, 1900, 30]]);
  const records = memory.eldrift.records['logistics-requests/W0N1'].data.records;
  assert.equal(records.length, 2);
  assert.deepEqual(records.flatMap(record => record.receipts.map(item => item.amount)), [20, 30]);
  assert.ok(records.every(record => record.request.owner.endsWith(':work')));
  assert.deepEqual(memory.eldrift.records['tasks/hauler'].data.queue, []);
  assert.deepEqual(memory.eldrift.records['quantity-reservations/empire'].data.claims, []);
}
module.exports = { workSupplyWorld, verifyWorkSupply };
